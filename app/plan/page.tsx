"use client";

import { useCallback, useEffect, useState } from "react";
import ExerciseList from "@/components/ExerciseList";
import { generatePlanAction, swapExerciseAction } from "@/app/actions";
import { todayLocal } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks";
import type { PlanExercise } from "@/lib/types";
import { PageSkeleton } from "@/components/Skeleton";

type Plan = { id: string; split_name: string; ai_explanation: string | null; plan_days: { id: string; day_index: number; name: string; exercises: PlanExercise[] }[] };

export default function PlanPage() {
  const profile = useProfile();
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<{ dayId: string; index: number } | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("plans")
      .select("id, split_name, ai_explanation, plan_days(id, day_index, name, exercises)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Plan>();
    data?.plan_days.sort((a, b) => a.day_index - b.day_index);
    setPlan(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function regenerate() {
    if (plan && !confirm("Build a new plan? Upcoming workouts will be replaced.")) return;
    setBusy(true);
    setNote(null);
    const res = await generatePlanAction(todayLocal());
    setBusy(false);
    setNote(res.ok ? (res.aiNote ?? null) : res.error);
    load();
  }

  async function swap() {
    if (!swapping) return;
    setBusy(true);
    const res = await swapExerciseAction(swapping.dayId, swapping.index, reason);
    setBusy(false);
    setNote(res.ok ? `Swapped: ${res.why}` : res.error);
    setSwapping(null);
    setReason("");
    load();
  }

  if (!profile || plan === undefined) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Your plan</h1>
          {plan && <p className="text-teal">{plan.split_name} · {profile.training_days.length} days/week</p>}
        </div>
        <button className="btn-secondary" onClick={regenerate} disabled={busy}>
          {busy && !swapping ? "Building…" : plan ? "Regenerate" : "Generate plan"}
        </button>
      </div>

      {note && <p className="rounded-lg bg-cyan p-3 text-sm">{note}</p>}

      {!plan && <p className="card">No plan yet. Generate one from your profile.</p>}

      {plan?.ai_explanation && (
        <section className="card border-surf bg-cyan/40">
          <h2 className="mb-1 font-semibold">Why this plan</h2>
          <p className="text-sm leading-relaxed">{plan.ai_explanation}</p>
        </section>
      )}

      {plan?.plan_days.map((day) => (
        <section key={day.id} className="card">
          <h2 className="mb-1 text-lg font-semibold">
            Day {day.day_index + 1}: {day.name}
          </h2>
          <ExerciseList
            exercises={day.exercises}
            action={(i) =>
              swapping?.dayId === day.id && swapping.index === i ? (
                <div className="flex w-full gap-2">
                  <input
                    autoFocus
                    className="input"
                    placeholder="Why? e.g. bad knee, machine always taken"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && swap()}
                  />
                  <button className="btn" onClick={swap} disabled={busy}>{busy ? "…" : "Swap"}</button>
                  <button className="btn-secondary" onClick={() => setSwapping(null)} disabled={busy}>Cancel</button>
                </div>
              ) : (
                <button className="text-sm font-medium text-teal hover:underline" onClick={() => setSwapping({ dayId: day.id, index: i })} disabled={busy}>
                  Swap
                </button>
              )
            }
          />
        </section>
      ))}
    </div>
  );
}
