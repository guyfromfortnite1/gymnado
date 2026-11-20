"use server";

import Anthropic from "@anthropic-ai/sdk";
import { analyzeFoodPhoto, suggestSwap, tunePlan } from "@/lib/ai";
import { buildSchedule } from "@/lib/dates";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { generatePlan, prescribe, swapCandidates } from "@/lib/generate";
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
  return { supabase, profile };
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

const describe = (pe: PlanExercise) => {
  const e = EXERCISE_BY_ID[pe.exercise_id];
  return { ...pe, name: e.name, category: e.category, muscles: e.muscles };
};

/** Rules build the plan, Claude explains and tunes it, then it's saved and scheduled from `today`. */
export async function generatePlanAction(today: string): Promise<Result<{ aiNote?: string }>> {
  try {
    const { supabase, profile } = await session();
    if (!profile) return { ok: false, error: "Complete your profile first." };

    const { splitName, days } = generatePlan(profile);
    let explanation: string | null = null;
    let aiNote: string | undefined;
    try {
      const tuning = await tunePlan(summarize(profile), { split: splitName, days: days.map((d, i) => ({ day_index: i, name: d.name, exercises: d.exercises.map(describe) })) });
      explanation = tuning.explanation;
      for (const a of tuning.adjustments) {
        const target = days[a.day_index]?.exercises.find((x) => x.exercise_id === a.exercise_id);
        const sane = a.sets >= 1 && a.sets <= 8 && a.rest_sec >= 0 && a.rest_sec <= 600 && a.reps.length > 0 && a.reps.length <= 30;
        if (target && sane) Object.assign(target, { sets: a.sets, reps: a.reps, rest_sec: a.rest_sec });
      }
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
    await session(); // signed-in users only
    const m = DATA_URL.exec(dataUrl);
    if (!m) return { ok: false, error: "Unsupported image. Use a JPEG, PNG, or WebP photo." };
    const { items } = await analyzeFoodPhoto(m[2], m[1] as "image/jpeg");
    if (!items.length) return { ok: false, error: "No food found in that photo. Try a clearer shot, or add items manually." };
    return { ok: true, items };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}
