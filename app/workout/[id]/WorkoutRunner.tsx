"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ExerciseThumb, formatSets } from "@/components/ExerciseList";
import PremiumSurface, { PremiumBadge } from "@/components/PremiumSurface";
import { PageSkeleton } from "@/components/Skeleton";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { useProfile, useScanStatus } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import type { PlanExercise } from "@/lib/types";
import { kgToLb, lbToKg } from "@/lib/units";

type Workout = { id: string; date: string; status: string; plan_days: { name: string; exercises: PlanExercise[] } };

/** Step-by-step workout: one set at a time with a rest timer. Premium users log weight and reps. */
export default function WorkoutRunner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const profile = useProfile();
  const { status } = useScanStatus();
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined);
  const [lastKg, setLastKg] = useState<Record<string, number>>({});
  const [ex, setEx] = useState(0);
  const [set, setSet] = useState(1);
  const [resting, setResting] = useState<{ left: number; total: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [saving, setSaving] = useState(false);

  const premium = !!status?.premium;
  const imperial = profile?.units === "imperial";
  const unit = imperial ? "lb" : "kg";

  useEffect(() => {
    const supabase = createClient();
    supabase.from("scheduled_workouts").select("id, date, status, plan_days(name, exercises)").eq("id", id).maybeSingle<Workout>().then(({ data }) => setWorkout(data));
    // Most recent weight per exercise, to pre-fill the weight box.
    supabase.from("set_logs").select("exercise_id, weight_kg").not("weight_kg", "is", null).order("created_at", { ascending: false }).limit(300)
      .then(({ data }) => {
        const last: Record<string, number> = {};
        for (const r of data ?? []) last[r.exercise_id] ??= r.weight_kg as number;
        setLastKg(last);
      });
  }, [id]);

  const current = workout?.plan_days.exercises[ex];
  const info = current ? EXERCISE_BY_ID[current.exercise_id] : undefined;
  const totalSets = current?.sets ?? 1;

  // Pre-fill weight (last time) and reps (bottom of the target range) for each new set.
  useEffect(() => {
    if (!current) return;
    const kg = lastKg[current.exercise_id];
     
    setWeight(kg ? String(Math.round((imperial ? kgToLb(kg) : kg) * 2) / 2) : "");
    setReps(/^\d+/.exec(current.reps)?.[0] ?? "");
     
  }, [current, lastKg, imperial]);

  const advance = useCallback(() => {
    if (!workout) return;
    if (set < totalSets) return setSet(set + 1);
    if (ex < workout.plan_days.exercises.length - 1) {
      setEx(ex + 1);
      setSet(1);
      return;
    }
    setFinished(true);
    createClient().from("scheduled_workouts").update({ status: "done" }).eq("id", workout.id).then(() => {});
  }, [workout, set, totalSets, ex]);

  // Rest countdown.
  useEffect(() => {
    if (!resting) return;
    if (resting.left <= 0) {
      navigator.vibrate?.(300);
       
      setResting(null);
      advance();
      return;
    }
    const t = setTimeout(() => setResting({ ...resting, left: resting.left - 1 }), 1000);
    return () => clearTimeout(t);
  }, [resting, advance]);

  async function completeSet() {
    if (!current || !workout) return;
    if (premium && (weight || reps)) {
      setSaving(true);
      const w = Number(weight);
      await createClient().from("set_logs").insert({
        scheduled_workout_id: workout.id,
        exercise_id: current.exercise_id,
        date: workout.date,
        set_number: set,
        weight_kg: weight ? Math.round((imperial ? lbToKg(w) : w) * 10) / 10 : null,
        reps: reps ? Number(reps) : null,
      });
      setSaving(false);
    }
    const isLastSet = set >= totalSets && ex >= workout.plan_days.exercises.length - 1;
    if (current.rest_sec > 0 && !isLastSet) setResting({ left: current.rest_sec, total: current.rest_sec });
    else advance();
  }

  if (workout === undefined || !profile || !status) return <PageSkeleton cards={1} />;
  if (!workout) return <p className="card">Workout not found. <Link href="/schedule" className="text-teal underline">Back to schedule</Link></p>;

  const exercises = workout.plan_days.exercises;
  const doneSets = exercises.slice(0, ex).reduce((n, e) => n + e.sets, 0) + (set - 1) + (resting ? 1 : 0);
  const allSets = exercises.reduce((n, e) => n + e.sets, 0);

  if (finished) {
    return (
      <div className="fade-in mx-auto max-w-md space-y-4 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold">Workout complete!</h1>
        <p className="text-twilight/70">{workout.plan_days.name} · {exercises.length} exercises · {allSets} sets</p>
        <div className="flex justify-center gap-2">
          <button className="btn" onClick={() => router.push("/")}>Back to today</button>
          {premium && <button className="btn-secondary" onClick={() => router.push("/progress")}>See progress</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm text-twilight/60">
          <span>{workout.plan_days.name}</span>
          <span>Exercise {ex + 1} of {exercises.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-cyan">
          <div className="h-full rounded-full bg-surf transition-all duration-500" style={{ width: `${(doneSets / allSets) * 100}%` }} />
        </div>
      </div>

      {resting ? (
        <section key="rest" className="card fade-in flex flex-col items-center gap-4 py-8">
          <p className="font-semibold text-twilight/70">Rest</p>
          <RestRing left={resting.left} total={resting.total} />
          <p className="text-sm text-twilight/60">Next: {set < totalSets ? `${info?.name}, set ${set + 1}` : EXERCISE_BY_ID[exercises[ex + 1]?.exercise_id]?.name}</p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setResting({ ...resting, left: resting.left + 15, total: resting.total + 15 })}>+15 s</button>
            <button className="btn" onClick={() => { setResting(null); advance(); }}>Skip rest</button>
          </div>
        </section>
      ) : (
        <section key={`${ex}-${set}`} className="card fade-in space-y-4">
          <div className="flex items-center gap-4">
            <ExerciseThumb id={current!.exercise_id} className="h-24 w-24" />
            <div>
              <h1 className="text-xl font-bold">{info?.name}</h1>
              <p className="text-teal">{formatSets(current!)}</p>
            </div>
          </div>
          <p className="text-center text-3xl font-bold">
            {current!.sets > 1 ? <>Set {set} <span className="text-twilight/40">/ {totalSets}</span></> : current!.reps}
          </p>
          {premium ? (
            info?.category !== "conditioning" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="label">Weight ({unit})
                  <input type="number" inputMode="decimal" step="0.5" className="input mt-1 text-lg" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" />
                </label>
                <label className="label">Reps
                  <input type="number" inputMode="numeric" className="input mt-1 text-lg" value={reps} onChange={(e) => setReps(e.target.value)} />
                </label>
              </div>
            )
          ) : (
            <Link href="/premium" className="block rounded-2xl transition duration-200 hover:scale-[1.02]">
              <PremiumSurface className="flex items-center gap-3 py-3">
                <PremiumBadge />
                <span className="text-sm">Log your weights and see your progress with Premium.</span>
              </PremiumSurface>
            </Link>
          )}
          <button className="btn w-full py-4 text-lg" onClick={completeSet} disabled={saving}>
            {saving ? "Saving…" : "✓ Done"}
          </button>
        </section>
      )}

      <button className="w-full text-sm text-twilight/60 hover:underline" onClick={() => router.push("/")}>End workout</button>
    </div>
  );
}

function RestRing({ left, total }: { left: number; total: number }) {
  const r = 70, c = 2 * Math.PI * r;
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" style={{ stroke: "var(--color-cyan)" }} strokeWidth="10" />
        <circle cx="80" cy="80" r={r} fill="none" style={{ stroke: "var(--color-surf)" }} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold tabular-nums">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </div>
    </div>
  );
}
