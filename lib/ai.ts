// Server-only: imported from app/actions.ts. Reads ANTHROPIC_API_KEY from the environment.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";

const MODEL = "claude-sonnet-5-5";
const client = new Anthropic();

/** One structured-output call. Throws a user-readable Error on refusal or unparseable output. */
async function ask<S extends z.ZodType>(schema: S, system: string, content: string | Anthropic.Beta.BetaContentBlockParam[]): Promise<z.infer<S>> {
  const res = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // if a safety classifier declines, the API retries on a fallback model
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new Error("The AI declined this request.");
  if (res.parsed_output == null) throw new Error("The AI returned an unexpected response. Please try again.");
  return res.parsed_output as z.infer<S>;
}

const COACH = "You are an experienced strength and conditioning coach. Be specific, practical, and concise. Write for the athlete, in second person.";

// ---- Plan: explain + tune sets/reps/rest (rules already chose the exercises) ----

const TuneSchema = z.object({
  explanation: z.string(),
  adjustments: z.array(
    z.object({ day_index: z.number().int(), exercise_id: z.string(), sets: z.number().int(), reps: z.string(), rest_sec: z.number().int() }),
  ),
});
export type Tuning = z.infer<typeof TuneSchema>;

export function tunePlan(profileSummary: object, plan: object): Promise<Tuning> {
  return ask(
    TuneSchema,
    `${COACH}
A rules engine has already chosen this athlete's split and exercises. Your job:
1. "explanation": 3-6 sentences on why this split and these exercises fit their physique goal, prioritized muscles, sports, experience, and schedule.
2. "adjustments": fine-tune sets, reps (a short string like "8-10" or "30 s"), and rest_sec for exercises already in the plan, to suit their goal and experience. Keep sessions short: about 25 minutes for beginners, 32 for intermediate and 38 for advanced, including a 5-minute warm-up. Keep sets moderate (usually 2-3, at most 4 for main lifts) and rests short (45-120 s). Only list exercises you want to change. Never add, remove, or rename exercises; use the exact day_index and exercise_id from the plan.`,
    `Athlete profile:\n${JSON.stringify(profileSummary, null, 2)}\n\nPlan:\n${JSON.stringify(plan, null, 2)}`,
  );
}

// ---- Swap one exercise for a library alternative ----

const SwapSchema = z.object({ exercise_id: z.string(), why: z.string() });

export function suggestSwap(current: object, reason: string, candidates: object[], profileSummary: object) {
  return ask(
    SwapSchema,
    `${COACH}
The athlete wants to replace one exercise in today's workout. Pick the single best replacement from the candidate list ONLY (use its exact id). Prefer one that trains the same primary muscle with a similar movement pattern, and respect the athlete's reason. "why" is one sentence.`,
    `Athlete profile: ${JSON.stringify(profileSummary)}\nExercise to replace: ${JSON.stringify(current)}\nReason: ${reason || "(none given)"}\n\nCandidates:\n${JSON.stringify(candidates)}`,
  );
}

// ---- Food photo -> macros ----

const FoodSchema = z.object({
  items: z.array(
    z.object({ name: z.string(), portion: z.string(), calories: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number() }),
  ),
});

export function analyzeFoodPhoto(base64: string, mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif") {
  return ask(
    FoodSchema,
    `You are a registered dietitian estimating nutrition from meal photos.
List each distinct food or drink you can see as a separate item, with an estimated portion (e.g. "1 cup", "150 g", "1 medium") and your best estimate of calories, protein_g, carbs_g, and fat_g for that portion. Use typical preparation methods (e.g. cooking oil) when they are visible or very likely. If there is no food in the image, return an empty items list.`,
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: "Estimate the macros for this meal." },
    ],
  );
}

// ---- AI coach chat (Premium) ----

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** One coach reply. `context` is the athlete's profile, plan and recent training, as JSON. */
export async function coachReply(history: ChatTurn[], context: object): Promise<string> {
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: `${COACH}
You are the athlete's personal coach inside the GymNado app. Use their profile, plan and recent training below to give advice that fits them. Keep answers short (a few sentences or a short list) unless they ask for detail. You can suggest changes to their training, but they make changes in the app themselves (Plan tab "Swap", Profile tab to change answers). For pain that is sharp, worsening, or comes with swelling or numbness, tell them to stop that exercise and see a doctor or physiotherapist. You are not a doctor; don't diagnose.

Athlete data:
${JSON.stringify(context)}`,
    messages: history,
  });
  if (res.stop_reason === "refusal") throw new Error("The coach can't help with that one. Try asking another way.");
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
  if (!text) throw new Error("The coach didn't reply. Please try again.");
  return text;
}

// ---- Meal ideas for the rest of the day (Premium) ----

const MealsSchema = z.object({
  ideas: z.array(
    z.object({ name: z.string(), description: z.string(), calories: z.number(), protein_g: z.number(), carbs_g: z.number(), fat_g: z.number() }),
  ),
});
export type MealIdea = z.infer<typeof MealsSchema>["ideas"][number];

export function suggestMeals(remaining: object, profileSummary: object, eatenToday: string[]) {
  return ask(
    MealsSchema,
    `You are a registered dietitian. Suggest 3 different, realistic meals or snacks the athlete could eat next that help them hit what's left of today's targets without going far over. Use common ingredients and simple preparation. "description" is one or two sentences with the main ingredients and portions. Give your best estimate of calories, protein_g, carbs_g and fat_g for each.`,
    `Remaining for today: ${JSON.stringify(remaining)}\nAthlete: ${JSON.stringify(profileSummary)}\nAlready eaten today: ${eatenToday.length ? eatenToday.join("; ") : "nothing yet"}`,
  );
}
