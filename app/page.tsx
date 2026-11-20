"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ExerciseList from "@/components/ExerciseList";
import MacroBars from "@/components/MacroBars";
import type { Workout } from "@/app/schedule/page";
import { addDays, formatShort } from "@/lib/dates";
import { dailyTargets, sumMacros, type Targets } from "@/lib/macros";
import { createClient } from "@/lib/supabase/client";
import { useProfile, useToday } from "@/lib/hooks";
import { PageSkeleton } from "@/components/Skeleton";

export default function Dashboard() {
  const profile = useProfile();
  const today = useToday();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [next, setNext] = useState<Workout | null>(null);
  const [meals, setMeals] = useState<Targets[]>([]);

  const load = useCallback(async () => {
    if (!today) return;
    const supabase = createClient();
    const [todayRes, nextRes, foodRes] = await Promise.all([
      supabase.from("scheduled_workouts").select("id, date, status, plan_days(name, exercises)").eq("date", today).returns<Workout[]>(),
      supabase.from("scheduled_workouts").select("id, date, status, plan_days(name, exercises)").gte("date", addDays(today, 1)).eq("status", "planned").order("date").limit(1).returns<Workout[]>(),
      supabase.from("food_logs").select("calories, protein_g, carbs_g, fat_g").eq("date", today).returns<Targets[]>(),
    ]);
    setWorkouts(todayRes.data ?? []);
    setNext(nextRes.data?.[0] ?? null);
    setMeals(foodRes.data ?? []);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  async function markDone(id: string) {
    await createClient().from("scheduled_workouts").update({ status: "done" }).eq("id", id);
    load();
  }

  if (!profile || !today || workouts === null) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Today</h1>

      {/* One tap into workout mode: today's workout, or start the next one early on a rest day. */}
      {(() => {
        const todays = workouts.find((w) => w.status === "planned");
        const target = todays ?? next;
        if (!target) return null;
        return (
          <Link
            href={`/workout/${target.id}`}
            className="flex items-center gap-4 rounded-2xl bg-accent p-4 text-accent-ink shadow-sm transition duration-200 hover:scale-[1.02] hover:bg-accent-hover"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy text-2xl text-white" aria-hidden>▶</span>
            <span className="flex-1">
              <span className="block text-lg font-bold">{todays ? "Start today's workout" : "Start your next workout early"}</span>
              <span className="block text-sm opacity-80">
                {target.plan_days.name} · {target.plan_days.exercises.length} exercises{todays ? "" : ` · planned for ${formatShort(target.date)}`}
              </span>
            </span>
          </Link>
        );
      })()}

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Workout</h2>
        {workouts.length === 0 && (
          <p className="text-twilight/70">
            Rest day.{" "}
            {next && (
              <>
                Next up: <span className="font-medium text-teal">{next.plan_days.name}</span> on {formatShort(next.date)}.
              </>
            )}
          </p>
        )}
        {workouts.map((w) => (
          <div key={w.id} className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex-1 font-semibold text-teal">{w.plan_days.name}</span>
              {w.status === "planned" ? (
                <>
                  <Link href={`/workout/${w.id}`} className="btn">▶ Start workout</Link>
                  <button className="btn-secondary" onClick={() => markDone(w.id)}>Mark done</button>
                </>
              ) : (
                <span className="rounded-full bg-frost px-3 py-1 text-sm">{w.status === "done" ? "✓ Done" : "Skipped"}</span>
              )}
            </div>
            <ExerciseList exercises={w.plan_days.exercises} />
          </div>
        ))}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center">
          <h2 className="flex-1 text-lg font-semibold">Macros</h2>
          <Link href="/food" className="text-sm font-medium text-teal hover:underline">Log food →</Link>
        </div>
        <MacroBars totals={sumMacros(meals)} targets={dailyTargets(profile)} />
      </section>
    </div>
  );
}
