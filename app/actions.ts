"use server";

import Anthropic from "@anthropic-ai/sdk";
import { analyzeFoodPhoto, coachReply, suggestMeals, suggestSwap, tunePlan, type ChatTurn, type MealIdea } from "@/lib/ai";
import { addDays, buildSchedule } from "@/lib/dates";
import { dailyTargets, sumMacros, type Targets } from "@/lib/macros";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { fitToTime, generatePlan, prescribe, swapCandidates } from "@/lib/generate";
import { headers } from "next/headers";
import { FREE_SCANS, isPremiumStatus } from "@/lib/premium";
import { getPremiumPriceId, getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { SPORTS, type FoodItem, type PlanDay, type PlanExercise, type Profile } from "@/lib/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function aiError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "The Anthropic API key is missing or invalid (ANTHROPIC_API_KEY in .env.local).";
  if (e instanceof Anthropic.RateLimitError) return "The AI is rate-limited right now. Try again in a minute.";
  if (e instanceof Anthropic.APIError) return `AI request failed (${e.status ?? "network"}). Try again.`;
  return e instanceof Error ? e.message : "Something went wrong.";
}

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in.");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single<Profile>();
  return { supabase, profile, user: data.user };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function getSubscription(supabase: Supabase) {
  const { data } = await supabase.from("subscriptions").select("status, stripe_customer_id").maybeSingle<{ status: string; stripe_customer_id: string | null }>();
  return data;
}

const summarize = (p: Profile) => ({
  sex: p.sex,
  age: p.age,
  physique_goal: p.physique_goal,
  experience: p.experience,
  days_per_week: p.training_days.length,
  prioritized_muscles: p.target_muscles,
  sports: p.sports.length ? p.sports.map((s) => SPORTS[s]) : "none",
  missing_equipment: p.missing_equipment,
});

// Per-user AI limits over a rolling 24 hours, so one account can't run up the Anthropic bill.
const DAILY_AI_LIMITS = { plan: 10, swap: 30, food: 30, coach: 40, meals: 20 } as const;
type AiKind = keyof typeof DAILY_AI_LIMITS;

/** Records one AI request; returns an error message instead if today's limit is used up. */
async function claimAiQuota(supabase: Supabase, kind: AiKind): Promise<string | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("kind", kind).gte("created_at", since);
  if (error) return error.message;
  if ((count ?? 0) >= DAILY_AI_LIMITS[kind]) return "You've reached today's limit for this feature. Please try again tomorrow.";
  const { error: insertError } = await supabase.from("ai_usage").insert({ kind });
  return insertError?.message ?? null;
}

const describe = (pe: PlanExercise) => {
  const e = EXERCISE_BY_ID[pe.exercise_id];
  return { ...pe, name: e.name, category: e.category, muscles: e.muscles };
};

/** Rules build the plan, Claude explains and tunes it, then it's saved and scheduled from `today`. */
export async function generatePlanAction(today: string): Promise<Result<{ aiNote?: string }>> {
  try {
    const { supabase, profile: saved } = await session();
    if (!saved) return { ok: false, error: "Complete your profile first." };
    // Sport-specific training is Premium-only.
    const premium = isPremiumStatus((await getSubscription(supabase))?.status);
    const profile = premium ? saved : { ...saved, sports: [] };

    const { splitName, days } = generatePlan(profile);
    let explanation: string | null = null;
    let aiNote: string | undefined;
    try {
      const quota = await claimAiQuota(supabase, "plan");
      if (quota) throw new Error(quota);
      const tuning = await tunePlan(summarize(profile), { split: splitName, days: days.map((d, i) => ({ day_index: i, name: d.name, exercises: d.exercises.map(describe) })) });
      explanation = tuning.explanation;
      for (const a of tuning.adjustments) {
        const target = days[a.day_index]?.exercises.find((x) => x.exercise_id === a.exercise_id);
        const sane = a.sets >= 1 && a.sets <= 8 && a.rest_sec >= 0 && a.rest_sec <= 600 && a.reps.length > 0 && a.reps.length <= 30;
        if (target && sane) Object.assign(target, { sets: a.sets, reps: a.reps, rest_sec: a.rest_sec });
      }
      for (const d of days) d.exercises = fitToTime(d.exercises, profile.target_muscles, profile.experience); // AI tweaks must still fit the session limits
    } catch (e) {
      aiNote = `Saved the rule-based plan without AI tuning: ${aiError(e)}`;
    }

    // Replace the old plan: deactivate it and clear its upcoming (not yet done) workouts.
    await supabase.from("scheduled_workouts").delete().gte("date", today).eq("status", "planned");
    await supabase.from("plans").update({ is_active: false }).eq("is_active", true);

    const { data: plan, error: planErr } = await supabase.from("plans").insert({ split_name: splitName, ai_explanation: explanation }).select("id").single();
    if (planErr) return { ok: false, error: planErr.message };

    const { data: dayRows, error: dayErr } = await supabase
      .from("plan_days")
      .insert(days.map((d, i) => ({ plan_id: plan.id, day_index: i, name: d.name, exercises: d.exercises })))
      .select("id, day_index");
    if (dayErr) return { ok: false, error: dayErr.message };

    const idByIndex = Object.fromEntries(dayRows.map((r) => [r.day_index, r.id]));
    const { error: schedErr } = await supabase
      .from("scheduled_workouts")
      .insert(buildSchedule(days.length, profile.training_days, today).map((s) => ({ plan_day_id: idByIndex[s.dayIndex], date: s.date })));
    if (schedErr) return { ok: false, error: schedErr.message };

    return { ok: true, aiNote };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

/** Claude picks a replacement from library exercises the user has equipment for. */
export async function swapExerciseAction(planDayId: string, index: number, reason: string): Promise<Result<{ why: string }>> {
  try {
    const { supabase, profile } = await session();
    if (!profile) return { ok: false, error: "Complete your profile first." };
    const { data: day } = await supabase.from("plan_days").select("exercises").eq("id", planDayId).single<{ exercises: PlanDay["exercises"] }>();
    const current = day?.exercises[index];
    if (!day || !current) return { ok: false, error: "Exercise not found." };

    const quota = await claimAiQuota(supabase, "swap");
    if (quota) return { ok: false, error: quota };
    const candidates = swapCandidates(profile.missing_equipment, day.exercises.map((x) => x.exercise_id));
    const pick = await suggestSwap(
      describe(current),
      reason.slice(0, 200),
      candidates.map((c) => ({ id: c.id, name: c.name, muscles: c.muscles, category: c.category })),
      summarize(profile),
    );
    const replacement = candidates.find((c) => c.id === pick.exercise_id);
    if (!replacement) return { ok: false, error: "The AI suggested an exercise outside your library. Try again." };

    const exercises = [...day.exercises];
    exercises[index] = prescribe(replacement, profile.physique_goal, profile.experience);
    const { error } = await supabase.from("plan_days").update({ exercises }).eq("id", planDayId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, why: pick.why };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

const DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

export async function analyzeFoodAction(dataUrl: string): Promise<Result<{ items: FoodItem[] }>> {
  try {
    const { supabase } = await session(); // signed-in users only
    const m = DATA_URL.exec(dataUrl);
    if (!m) return { ok: false, error: "Unsupported image. Use a JPEG, PNG, or WebP photo." };

    // Free users get FREE_SCANS analyses in total; Premium is unlimited.
    if (!isPremiumStatus((await getSubscription(supabase))?.status)) {
      const { count } = await supabase.from("food_scans").select("id", { count: "exact", head: true });
      if ((count ?? 0) >= FREE_SCANS) return { ok: false, error: `You've used all ${FREE_SCANS} free scans. Upgrade to Premium for unlimited scans.` };
    }

    const quota = await claimAiQuota(supabase, "food");
    if (quota) return { ok: false, error: quota };
    const { items } = await analyzeFoodPhoto(m[2], m[1] as "image/jpeg");
    if (!items.length) return { ok: false, error: "No food found in that photo. Try a clearer shot, or add items manually." };
    const { error } = await supabase.from("food_scans").insert({});
    if (error) return { ok: false, error: error.message };
    return { ok: true, items };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

const siteOrigin = async () => (await headers()).get("origin") ?? "http://localhost:3000";

/** Starts a Stripe Checkout for Premium and returns the payment page URL. */
export async function startCheckoutAction(from: "premium" | "choose-plan" = "premium"): Promise<Result<{ url: string }>> {
  try {
    const { supabase, user } = await session();
    const sub = await getSubscription(supabase);
    if (isPremiumStatus(sub?.status)) return { ok: false, error: "You're already Premium." };

    const origin = await siteOrigin();
    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: await getPremiumPriceId(), quantity: 1 }],
      ...(sub?.stripe_customer_id ? { customer: sub.stripe_customer_id } : { customer_email: user.email }),
      client_reference_id: user.id,
      // The webhook reads user_id from the subscription to know who paid.
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/premium?success=1`,
      cancel_url: from === "choose-plan" ? `${origin}/choose-plan` : `${origin}/premium?canceled=1`,
    });
    return checkout.url ? { ok: true, url: checkout.url } : { ok: false, error: "Couldn't start checkout. Try again." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't start checkout." };
  }
}

/** Opens Stripe's page where Premium users can update their card or cancel. */
export async function manageBillingAction(): Promise<Result<{ url: string }>> {
  try {
    const { supabase } = await session();
    const customer = (await getSubscription(supabase))?.stripe_customer_id;
    if (!customer) return { ok: false, error: "No subscription found." };
    const portal = await getStripe().billingPortal.sessions.create({ customer, return_url: `${await siteOrigin()}/premium` });
    return { ok: true, url: portal.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't open billing." };
  }
}

const PREMIUM_ONLY = "This is a Premium feature. Upgrade in Settings → Premium to unlock it.";

/** AI coach (Premium): replies to the chat using the athlete's profile, plan and recent training. */
export async function coachAction(history: ChatTurn[], today: string): Promise<Result<{ reply: string }>> {
  try {
    const { supabase, profile } = await session();
    if (!profile) return { ok: false, error: "Complete your profile first." };
    if (!isPremiumStatus((await getSubscription(supabase))?.status)) return { ok: false, error: PREMIUM_ONLY };

    // Only trust a short, well-formed history from the browser.
    const turns = history.slice(-20).map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: String(t.content).slice(0, 2000) }) as ChatTurn);
    while (turns.length && turns[0].role !== "user") turns.shift();
    if (!turns.length || turns.at(-1)!.role !== "user" || !turns.at(-1)!.content.trim()) return { ok: false, error: "Type a message first." };

    const quota = await claimAiQuota(supabase, "coach");
    if (quota) return { ok: false, error: quota };

    const since = addDays(today, -14);
    const [planRes, setsRes, weightRes, doneRes] = await Promise.all([
      supabase.from("plans").select("split_name, plan_days(day_index, name, exercises)").eq("is_active", true).maybeSingle<{ split_name: string; plan_days: { day_index: number; name: string; exercises: PlanExercise[] }[] }>(),
      supabase.from("set_logs").select("date, exercise_id, weight_kg, reps").gte("date", since).order("date"),
      supabase.from("body_weights").select("date, weight_kg").order("date", { ascending: false }).limit(5),
      supabase.from("scheduled_workouts").select("date, status").gte("date", since).lte("date", today),
    ]);
    const context = {
      today,
      profile: summarize(profile),
      plan: planRes.data && {
        split: planRes.data.split_name,
        days: [...planRes.data.plan_days].sort((a, b) => a.day_index - b.day_index).map((d) => ({ name: d.name, exercises: d.exercises.map((e) => `${EXERCISE_BY_ID[e.exercise_id]?.name ?? e.exercise_id} ${e.sets}×${e.reps}`) })),
      },
      logged_sets_last_14_days: (setsRes.data ?? []).map((s) => `${s.date} ${EXERCISE_BY_ID[s.exercise_id]?.name ?? s.exercise_id}: ${s.weight_kg ?? "-"} kg × ${s.reps ?? "-"}`),
      recent_body_weight_kg: weightRes.data ?? [],
      workouts_last_14_days: { done: (doneRes.data ?? []).filter((w) => w.status === "done").length, skipped: (doneRes.data ?? []).filter((w) => w.status === "skipped").length },
    };
    return { ok: true, reply: await coachReply(turns, context) };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

/** Meal ideas (Premium) that fit what's left of today's calories and macros. */
export async function mealIdeasAction(today: string): Promise<Result<{ ideas: MealIdea[]; remaining: Targets }>> {
  try {
    const { supabase, profile } = await session();
    if (!profile) return { ok: false, error: "Complete your profile first." };
    if (!isPremiumStatus((await getSubscription(supabase))?.status)) return { ok: false, error: PREMIUM_ONLY };

    const quota = await claimAiQuota(supabase, "meals");
    if (quota) return { ok: false, error: quota };

    const { data: meals } = await supabase.from("food_logs").select("items, calories, protein_g, carbs_g, fat_g").eq("date", today).returns<(Targets & { items: FoodItem[] })[]>();
    const targets = dailyTargets(profile);
    const eaten = sumMacros(meals ?? []);
    const remaining: Targets = {
      calories: Math.max(0, Math.round(targets.calories - eaten.calories)),
      protein_g: Math.max(0, Math.round(targets.protein_g - eaten.protein_g)),
      carbs_g: Math.max(0, Math.round(targets.carbs_g - eaten.carbs_g)),
      fat_g: Math.max(0, Math.round(targets.fat_g - eaten.fat_g)),
    };
    const { ideas } = await suggestMeals(remaining, summarize(profile), (meals ?? []).flatMap((m) => m.items.map((i) => i.name)));
    return { ok: true, ideas: ideas.slice(0, 3), remaining };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}
