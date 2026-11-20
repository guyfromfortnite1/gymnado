"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart, LineChart, type Point } from "@/components/Charts";
import PremiumLock from "@/components/PremiumLock";
import { PageSkeleton } from "@/components/Skeleton";
import { addDays, formatShort, startOfWeek } from "@/lib/dates";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { useProfile, useScanStatus, useToday } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import { kgToLb, lbToKg } from "@/lib/units";

type SetLog = { date: string; exercise_id: string; weight_kg: number | null; reps: number | null };

export default function ProgressPage() {
  const profile = useProfile();
  const today = useToday();
  const { status } = useScanStatus();
  const [weights, setWeights] = useState<{ date: string; weight_kg: number }[]>([]);
  const [sets, setSets] = useState<SetLog[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [exercise, setExercise] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const imperial = profile?.units === "imperial";
  const unit = imperial ? "lb" : "kg";
  const show = useCallback((kg: number) => Math.round((imperial ? kgToLb(kg) : kg) * 10) / 10, [imperial]);

  const load = useCallback(async () => {
    if (!today) return;
    const supabase = createClient();
    const [w, s, d] = await Promise.all([
      supabase.from("body_weights").select("date, weight_kg").gte("date", addDays(today, -180)).order("date"),
      supabase.from("set_logs").select("date, exercise_id, weight_kg, reps").order("date"),
      supabase.from("scheduled_workouts").select("date").eq("status", "done").gte("date", addDays(today, -120)),
    ]);
    setWeights(w.data ?? []);
    setSets(s.data ?? []);
    setDone((d.data ?? []).map((r) => r.date));
    setLoaded(true);
  }, [today]);

  useEffect(() => {
    if (status?.premium) load();
  }, [status?.premium, load]);

  // Best (heaviest) set per exercise per day, and all-time records.
  const { bestByExercise, records } = useMemo(() => {
    const best: Record<string, Record<string, number>> = {};
    for (const s of sets) {
      if (s.weight_kg == null) continue;
      best[s.exercise_id] ??= {};
      best[s.exercise_id][s.date] = Math.max(best[s.exercise_id][s.date] ?? 0, s.weight_kg);
    }
    const recs = Object.entries(best)
      .map(([id, byDate]) => ({ id, kg: Math.max(...Object.values(byDate)) }))
      .sort((a, b) => b.kg - a.kg);
    return { bestByExercise: best, records: recs };
  }, [sets]);
  const chosen = exercise || records[0]?.id || "";

  if (!profile || !today || !status) return <PageSkeleton />;

  if (!status.premium) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Progress</h1>
        <PremiumLock title="See your progress">
          Track your body weight and every lift, see charts of your strength going up, your weekly streak and your personal records 🏆.
        </PremiumLock>
      </div>
    );
  }
  if (!loaded) return <PageSkeleton />;

  async function logWeight(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(weightInput);
    const kg = Math.round((imperial ? lbToKg(n) : n) * 10) / 10;
    if (!(kg >= 30 && kg <= 300)) return setError("Please enter a valid weight.");
    setError(null);
    const { error: err } = await createClient().from("body_weights").upsert({ date: today, weight_kg: kg }, { onConflict: "user_id,date" });
    if (err) return setError(err.message);
    setWeightInput("");
    load();
  }

  // Workouts completed per week, last 8 weeks.
  const thisWeek = startOfWeek(today);
  const weekly: Point[] = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(thisWeek, (i - 7) * 7);
    const end = addDays(start, 6);
    return { label: formatShort(start), value: done.filter((d) => d >= start && d <= end).length };
  });
  let streak = 0;
  for (let i = weekly.length - 1; i >= 0; i--) {
    if (weekly[i].value > 0) streak++;
    else if (i < weekly.length - 1) break; // this week may not have a workout yet
  }
  const doneThisMonth = done.filter((d) => d >= addDays(today, -29)).length;
  const weightPoints: Point[] = weights.map((w) => ({ label: formatShort(w.date), value: show(w.weight_kg) }));
  const liftPoints: Point[] = Object.entries(bestByExercise[chosen] ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, kg]) => ({ label: formatShort(date), value: show(kg) }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Workouts, last 30 days", value: doneThisMonth },
          { label: "Week streak", value: `${streak} 🔥` },
          { label: "Lift records", value: `${records.length} 🏆` },
        ].map((t) => (
          <div key={t.label} className="card text-center">
            <div className="text-2xl font-bold text-twilight">{t.value}</div>
            <div className="text-xs text-twilight/60">{t.label}</div>
          </div>
        ))}
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Body weight ({unit})</h2>
        <form onSubmit={logWeight} className="flex gap-2">
          <input type="number" step="0.1" className="input max-w-40" placeholder={`Today, in ${unit}`} value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
          <button className="btn">Log weight</button>
        </form>
        {error && <p className="rounded-lg bg-cyan p-2 text-sm">{error}</p>}
        {weightPoints.length ? <LineChart points={weightPoints} unit={unit} valueLabel="Body weight" /> : <p className="text-sm text-twilight/60">Log your weight to start your chart.</p>}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Workouts per week</h2>
        <BarChart points={weekly} unit="workouts" valueLabel="Workouts" />
      </section>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 font-semibold">Lift progress ({unit}, best set per session)</h2>
          {records.length > 0 && (
            <select className="input w-auto" value={chosen} onChange={(e) => setExercise(e.target.value)}>
              {records.map((r) => <option key={r.id} value={r.id}>{EXERCISE_BY_ID[r.id]?.name ?? r.id}</option>)}
            </select>
          )}
        </div>
        {liftPoints.length ? (
          <LineChart points={liftPoints} unit={unit} valueLabel={EXERCISE_BY_ID[chosen]?.name ?? "Weight"} />
        ) : (
          <p className="text-sm text-twilight/60">Start a workout and log your weights to see your lifts here.</p>
        )}
      </section>

      {records.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Personal records 🏆</h2>
          <ul className="divide-y divide-cyan text-sm">
            {records.slice(0, 10).map((r) => (
              <li key={r.id} className="flex justify-between py-1.5">
                <span>{EXERCISE_BY_ID[r.id]?.name ?? r.id}</span>
                <span className="font-semibold">{show(r.kg)} {unit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
