"use client";

import { useCallback, useEffect, useState } from "react";
import ExerciseList from "@/components/ExerciseList";
import { addDays, formatShort, startOfWeek } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import { WEEKDAYS, type PlanExercise } from "@/lib/types";

export type Workout = { id: string; date: string; status: "planned" | "done" | "skipped"; plan_days: { name: string; exercises: PlanExercise[] } };

const STATUS_STYLE = {
  planned: "border-frost bg-white",
  done: "border-frost bg-frost/60",
  skipped: "border-frost bg-white opacity-60 line-through",
};

export default function SchedulePage() {
  const today = useToday();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = today ? addDays(startOfWeek(today), weekOffset * 7) : null;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!weekStart) return;
    const { data } = await createClient()
      .from("scheduled_workouts")
      .select("id, date, status, plan_days(name, exercises)")
      .gte("date", weekStart)
      .lte("date", addDays(weekStart, 6))
      .order("date")
      .returns<Workout[]>();
    setWorkouts(data ?? []);
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(id: string, patch: Partial<Pick<Workout, "status" | "date">>) {
    await createClient().from("scheduled_workouts").update(patch).eq("id", id);
    setMoving(null);
    load();
  }

  if (!today || !weekStart) return <p className="text-twilight/60">Loading…</p>;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold">Schedule</h1>
        <button className="btn-secondary px-3" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Previous week">←</button>
        <button className="btn-secondary" onClick={() => setWeekOffset(0)}>This week</button>
        <button className="btn-secondary px-3" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Next week">→</button>
      </div>
      <p className="text-teal">
        {formatShort(days[0])} – {formatShort(days[6])}
      </p>

      <div className="space-y-2">
        {days.map((date, i) => {
          const dayWorkouts = workouts.filter((w) => w.date === date);
          const isToday = date === today;
          return (
            <div key={date} className={`card flex gap-3 ${isToday ? "border-2 border-surf" : ""}`}>
              <div className="w-14 shrink-0 text-center">
                <div className={`text-xs font-semibold uppercase ${isToday ? "text-surf" : "text-twilight/60"}`}>{WEEKDAYS[i]}</div>
                <div className="text-xl font-bold">{date.slice(8)}</div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {dayWorkouts.length === 0 && <p className="py-2 text-sm text-twilight/50">Rest day</p>}
                {dayWorkouts.map((w) => (
                  <div key={w.id} className={`rounded-xl border p-3 ${STATUS_STYLE[w.status]}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="flex-1 text-left font-semibold" onClick={() => setOpen(open === w.id ? null : w.id)}>
                        {w.plan_days.name} <span className="text-sm font-normal text-teal">{open === w.id ? "▲" : "▼"}</span>
                      </button>
                      {w.status === "planned" ? (
                        <>
                          <button className="text-sm font-medium text-teal hover:underline" onClick={() => update(w.id, { status: "done" })}>Done</button>
                          <button className="text-sm text-twilight/60 hover:underline" onClick={() => update(w.id, { status: "skipped" })}>Skip</button>
                          <button className="text-sm text-twilight/60 hover:underline" onClick={() => setMoving(moving === w.id ? null : w.id)}>Move</button>
                        </>
                      ) : (
                        <button className="text-sm text-twilight/60 hover:underline" onClick={() => update(w.id, { status: "planned" })}>
                          {w.status === "done" ? "✓ Done" : "Skipped"} · undo
                        </button>
                      )}
                    </div>
                    {moving === w.id && (
                      <label className="mt-2 flex items-center gap-2 text-sm">
                        Move to
                        <input type="date" className="input w-auto" defaultValue={w.date} onChange={(e) => e.target.value && update(w.id, { date: e.target.value })} />
                      </label>
                    )}
                    {open === w.id && <ExerciseList exercises={w.plan_days.exercises} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
