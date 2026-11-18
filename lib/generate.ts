import { EXERCISES, isAvailable, type Exercise } from "./exercises";
import { chooseSplit, type Slot } from "./splits";
import type { Equipment, Experience, Goal, PlanDay, PlanExercise, Profile } from "./types";

type PlanInput = Pick<Profile, "training_days" | "physique_goal" | "experience" | "target_muscles" | "sport" | "missing_equipment">;

// [sets, reps, rest seconds]
type Scheme = [number, string, number];
const SCHEMES: Record<Goal, { compound: Scheme; isolation: Scheme }> = {
  lean: { compound: [3, "10-12", 75], isolation: [3, "12-15", 45] },
  muscular: { compound: [4, "8-10", 90], isolation: [3, "10-12", 60] },
  strength: { compound: [5, "3-5", 180], isolation: [3, "8-10", 90] },
  athletic: { compound: [4, "5-8", 120], isolation: [3, "8-12", 60] },
};

export function prescribe(e: Exercise, goal: Goal, experience: Experience): PlanExercise {
  const [baseSets, reps, rest]: Scheme =
    e.category === "plyo" ? [goal === "athletic" ? 4 : 3, "5", 90]
    : e.category === "conditioning" ? [1, "", 0]
    : SCHEMES[goal][e.category];
  let sets = baseSets;
  if (e.category !== "conditioning") {
    if (experience === "beginner") sets = Math.max(2, sets - 1);
    if (experience === "advanced" && e.category === "compound") sets = Math.min(6, sets + 1);
  }
  return { exercise_id: e.id, sets, reps: e.fixedReps ?? reps, rest_sec: rest };
}

const matchesKind = (e: Exercise, kind: Slot["kind"]) =>
  kind === "any" ? e.category === "compound" || e.category === "isolation" : e.category === kind;

const ORDER = { plyo: 0, compound: 1, isolation: 1, conditioning: 2 } as const;

export function generatePlan(p: PlanInput): { splitName: string; days: PlanDay[] } {
  const split = chooseSplit(p.training_days.length, p.physique_goal);
  const pool = EXERCISES.filter((e) => isAvailable(e, p.missing_equipment));
  const occurrences = new Map<string, number>();

  const days = split.days.map((day, dayIndex) => {
    // Repeated days (e.g. "Upper" twice) get the next candidate for variety.
    const variant = occurrences.get(day.name) ?? 0;
    occurrences.set(day.name, variant + 1);

    const picked: Exercise[] = [];
    const pick = (candidates: Exercise[], offset: number) => {
      const free = candidates.filter((e) => !picked.includes(e));
      if (free.length) picked.push(free[offset % free.length]);
      return free.length > 0;
    };
    const forMuscle = (slot: Slot) => pool.filter((e) => e.muscles[0] === slot.muscle && matchesKind(e, slot.kind));

    if (p.physique_goal === "athletic") pick(pool.filter((e) => e.category === "plyo"), dayIndex);

    for (const slot of day.slots) {
      if (!pick(forMuscle(slot), variant)) pick(forMuscle({ ...slot, kind: "any" }), variant);
    }

    // One extra exercise for each prioritized muscle this day already trains.
    for (const m of p.target_muscles) {
      if (day.slots.some((sl) => sl.muscle === m)) {
        if (!pick(forMuscle({ muscle: m, kind: "isolation" }), variant)) pick(forMuscle({ muscle: m, kind: "any" }), variant);
      }
    }

    if (p.sport) {
      const sportPool = pool.filter((e) => e.sports.includes(p.sport!));
      const count = p.physique_goal === "athletic" ? 2 : 1;
      for (let k = 0; k < count; k++) pick(sportPool, dayIndex * count + k);
    }

    if (p.physique_goal === "lean") pick(pool.filter((e) => e.category === "conditioning"), dayIndex);

    const ordered = [...picked].sort((a, b) => ORDER[a.category] - ORDER[b.category]);
    return { name: day.name, exercises: ordered.map((e) => prescribe(e, p.physique_goal, p.experience)) };
  });

  return { splitName: split.name, days };
}

/** Exercises the user could swap in: available equipment and not already in that day. */
export function swapCandidates(missing: Equipment[], dayExerciseIds: string[]): Exercise[] {
  return EXERCISES.filter((e) => isAvailable(e, missing) && !dayExerciseIds.includes(e.id));
}
