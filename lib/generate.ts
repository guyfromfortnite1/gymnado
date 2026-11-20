import { EXERCISE_BY_ID, EXERCISES, isAvailable, type Exercise } from "./exercises";
import { chooseSplit, type Slot } from "./splits";
import type { Equipment, Experience, Goal, Muscle, PlanDay, PlanExercise, Profile } from "./types";

type PlanInput = Pick<Profile, "training_days" | "physique_goal" | "experience" | "target_muscles" | "sports" | "missing_equipment">;

// [sets, reps, rest seconds]
type Scheme = [number, string, number];
const SCHEMES: Record<Goal, { compound: Scheme; isolation: Scheme }> = {
  lean: { compound: [3, "10-12", 75], isolation: [3, "12-15", 45] },
  muscular: { compound: [4, "8-10", 90], isolation: [3, "10-12", 60] },
  strength: { compound: [4, "3-5", 150], isolation: [3, "8-10", 90] },
  athletic: { compound: [4, "5-8", 120], isolation: [3, "8-12", 60] },
};

// ---- Session size: every day stays short and manageable ----

export const MAX_SESSION_MIN = 50;
export const MAX_EXERCISES = 6;
export const MAX_SETS = 18;
const WARM_UP_MIN = 5;
const WORK_SEC_PER_SET = 40;
const SETUP_MIN_PER_EXERCISE = 1;
const CONDITIONING_MIN = 10;

/** Rough minutes for a session: warm-up + each exercise's work, rest and setup. */
export function estimateMinutes(exercises: PlanExercise[]): number {
  let min = WARM_UP_MIN;
  for (const pe of exercises) {
    const e = EXERCISE_BY_ID[pe.exercise_id];
    min += e?.category === "conditioning" ? CONDITIONING_MIN : (pe.sets * (WORK_SEC_PER_SET + pe.rest_sec)) / 60 + SETUP_MIN_PER_EXERCISE;
  }
  return Math.round(min);
}

/**
 * Trims a session to at most MAX_EXERCISES exercises, MAX_SETS sets and MAX_SESSION_MIN minutes.
 * Drops extra isolation, then compound lifts (latest first, keeping at least 3 exercises) and cuts
 * big lifts down to 3 sets. Sport, jump (plyo) and conditioning work is dropped only as a last resort.
 */
export function fitToTime(exercises: PlanExercise[], keepMuscles: Muscle[] = []): PlanExercise[] {
  const out = exercises.map((x) => ({ ...x }));
  const totalSets = () => out.reduce((n, x) => n + (EXERCISE_BY_ID[x.exercise_id]?.category === "conditioning" ? 0 : x.sets), 0);
  const tooLong = () => estimateMinutes(out) > MAX_SESSION_MIN || totalSets() > MAX_SETS;
  const over = () => tooLong() || out.length > MAX_EXERCISES;
  // Latest non-sport exercise of this category; exercises for prioritized muscles go last.
  const droppable = (cat: "isolation" | "compound") => {
    for (const protectPriority of [true, false]) {
      for (let i = out.length - 1; i >= 0; i--) {
        const e = EXERCISE_BY_ID[out[i].exercise_id];
        if (e?.category !== cat || e.sports.length > 0) continue;
        if (protectPriority && keepMuscles.includes(e.muscles[0])) continue;
        return i;
      }
    }
    return -1;
  };
  // Too many exercises: drop extras first.
  for (const cat of ["isolation", "compound"] as const) {
    while (out.length > MAX_EXERCISES) {
      const i = droppable(cat);
      if (i < 0) break;
      out.splice(i, 1);
    }
  }
  // Too long: trim sets, then drop more.
  while (tooLong()) {
    const biggest = out.filter((x) => x.sets > 3).sort((a, b) => b.sets - a.sets)[0];
    if (!biggest) break;
    biggest.sets -= 1;
  }
  for (const cat of ["isolation", "compound"] as const) {
    while (over() && out.length > 3) {
      const i = droppable(cat);
      if (i < 0) break;
      out.splice(i, 1);
    }
  }
  // Last resorts for very full days (several sports + power + finisher): 2 sets each, then drop the latest extra.
  while (over()) {
    const biggest = out.filter((x) => x.sets > 2 && EXERCISE_BY_ID[x.exercise_id]?.category !== "conditioning").sort((a, b) => b.sets - a.sets)[0];
    if (!biggest) break;
    biggest.sets -= 1;
  }
  while (over() && out.length > 3) out.splice(out.length - 2, 1); // keep the final finisher, drop the one before it
  return out;
}

export function prescribe(e: Exercise, goal: Goal, experience: Experience): PlanExercise {
  const [baseSets, reps, rest]: Scheme =
    e.category === "plyo" ? [goal === "athletic" ? 4 : 3, "5", 90]
    : e.category === "conditioning" ? [1, "", 0]
    : SCHEMES[goal][e.category];
  let sets = baseSets;
  if (e.category !== "conditioning") {
    if (experience === "beginner") sets = Math.max(2, sets - 1);
    if (experience === "advanced" && e.category === "compound") sets = Math.min(5, sets + 1);
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

    // At least one exercise per sport; athletic goals get two when only one sport is chosen.
    if (p.sports.length) {
      const count = Math.max(p.physique_goal === "athletic" ? 2 : 1, p.sports.length);
      for (let k = 0; k < count; k++) {
        const sport = p.sports[k % p.sports.length];
        pick(pool.filter((e) => e.sports.includes(sport)), dayIndex * count + k);
      }
    }

    if (p.physique_goal === "lean") pick(pool.filter((e) => e.category === "conditioning"), dayIndex);

    const ordered = [...picked].sort((a, b) => ORDER[a.category] - ORDER[b.category]);
    return { name: day.name, exercises: fitToTime(ordered.map((e) => prescribe(e, p.physique_goal, p.experience)), p.target_muscles) };
  });

  return { splitName: split.name, days };
}

/** Exercises the user could swap in: available equipment and not already in that day. */
export function swapCandidates(missing: Equipment[], dayExerciseIds: string[]): Exercise[] {
  return EXERCISES.filter((e) => isAvailable(e, missing) && !dayExerciseIds.includes(e.id));
}
