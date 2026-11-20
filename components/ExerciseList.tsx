import Image from "next/image";
import type { ReactNode } from "react";
import MuscleMap from "@/components/MuscleMap";
import { EXERCISE_IMAGE_IDS } from "@/lib/exerciseImages";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import type { PlanExercise } from "@/lib/types";

const CATEGORY_STYLE = {
  compound: "bg-cyan text-twilight",
  isolation: "bg-cyan text-twilight",
  plyo: "bg-surf text-white",
  conditioning: "bg-teal text-white",
};

export const formatSets = (e: PlanExercise) => (e.sets === 1 ? e.reps : `${e.sets} × ${e.reps}`);

/** Demo photo for an exercise (public/exercises), or a muscle map when there's no photo. */
export function ExerciseThumb({ id, className = "h-14 w-14" }: { id: string; className?: string }) {
  const e = EXERCISE_BY_ID[id];
  return (
    <div className={`shrink-0 overflow-hidden rounded-lg border border-frost bg-white ${className}`}>
      {EXERCISE_IMAGE_IDS.has(id) ? (
        <Image src={`/exercises/${id}.jpg`} alt="" width={160} height={160} className="h-full w-full object-cover" />
      ) : (
        e && <MuscleMap muscles={e.muscles.slice(0, 1)} className="h-full p-1" />
      )}
    </div>
  );
}

export default function ExerciseList({ exercises, action }: { exercises: PlanExercise[]; action?: (index: number) => ReactNode }) {
  return (
    <ul className="divide-y divide-cyan">
      {exercises.map((pe, i) => {
        const e = EXERCISE_BY_ID[pe.exercise_id];
        return (
          <li key={`${pe.exercise_id}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <ExerciseThumb id={pe.exercise_id} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{e?.name ?? pe.exercise_id}</div>
              <div className="text-sm text-teal">
                {formatSets(pe)}
                {pe.rest_sec > 0 && <span className="text-twilight/60"> · rest {pe.rest_sec}s</span>}
              </div>
            </div>
            {e && (e.category === "plyo" || e.category === "conditioning" || e.sports.length > 0) && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_STYLE[e.category]}`}>{e.category === "plyo" ? "power" : e.category}</span>
            )}
            {action?.(i)}
          </li>
        );
      })}
    </ul>
  );
}
