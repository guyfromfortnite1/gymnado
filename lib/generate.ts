import { EXERCISE_BY_ID, EXERCISES, isAvailable, type Exercise } from "./exercises";
import { chooseSplit, type Slot } from "./splits";
import type { Equipment, Experience, Goal, Muscle, PlanDay, PlanExercise, Profile, Sport } from "./types";

type PlanInput = Pick<Profile, "training_days" | "physique_goal" | "experience" | "target_muscles" | "sports" | "missing_equipment">;

// [sets, reps, rest seconds]
type Scheme = [number, string, number];
const SCHEMES: Record<Goal, { compound: Scheme; isolation: Scheme }> = {
  lean: { compound: [3, "10-12", 60], isolation: [3, "12-15", 45] },
  muscular: { compound: [3, "8-10", 75], isolation: [3, "10-12", 60] },
  strength: { compound: [4, "3-5", 120], isolation: [3, "8-10", 75] },
  athletic: { compound: [3, "5-8", 90], isolation: [3, "8-12", 60] },
};

// ---- Session size: short, and shorter for beginners ----

/** Per-day limits by experience: max exercises, total working sets, and estimated minutes. */
export const SESSION_LIMITS: Record<Experience, { exercises: number; sets: number; minutes: number }> = {
  beginner: { exercises: 3, sets: 8, minutes: 25 },
  intermediate: { exercises: 4, sets: 11, minutes: 32 },
  advanced: { exercises: 4, sets: 13, minutes: 38 },
};
const WARM_UP_MIN = 5;
const WORK_SEC_PER_SET = 40;
const SETUP_MIN_PER_EXERCISE = 1;
const CONDITIONING_MIN = 8;

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
 * Trims a session to the SESSION_LIMITS for this experience level (exercises, sets, minutes).
 * Drops extra isolation, then compound lifts (latest first, keeping at least 3 exercises) and cuts
 * big lifts down to 3 sets. Work for the user's sports, jumps (plyo) and conditioning are dropped only as a last resort.
 */
export function fitToTime(
  exercises: PlanExercise[],
  { keepMuscles = [], keepSports = [], experience = "intermediate" }: { keepMuscles?: Muscle[]; keepSports?: Sport[]; experience?: Experience } = {},
): PlanExercise[] {
  const limit = SESSION_LIMITS[experience];
  const out = exercises.map((x) => ({ ...x }));
  const totalSets = () => out.reduce((n, x) => n + (EXERCISE_BY_ID[x.exercise_id]?.category === "conditioning" ? 0 : x.sets), 0);
  const tooLong = () => estimateMinutes(out) > limit.minutes || totalSets() > limit.sets;
  const over = () => tooLong() || out.length > limit.exercises;
  // Drop order: non-priority isolation, non-priority compound, then priority isolation, priority compound.
  // Work for the user's own sports is never picked here. Returns the latest matching index, or -1.
  const DROP_ORDER = [["isolation", false], ["compound", false], ["isolation", true], ["compound", true]] as const;
  const droppable = (cat: "isolation" | "compound", priority: boolean) => {
    for (let i = out.length - 1; i >= 0; i--) {
      const e = EXERCISE_BY_ID[out[i].exercise_id];
      const forMySport = e?.sports.some((sp) => keepSports.includes(sp));
      if (e?.category === cat && !forMySport && keepMuscles.includes(e.muscles[0]) === priority) return i;
    }
    return -1;
  };
  const dropWhile = (cond: () => boolean) => {
    for (const [cat, priority] of DROP_ORDER) {
      while (cond() && out.length > 3) {
        const i = droppable(cat, priority);
        if (i < 0) break;
        out.splice(i, 1);
      }
    }
  };
  // Too many exercises: drop extras first.
  dropWhile(() => out.length > limit.exercises);
  // Too long: trim sets, then drop more.
  while (tooLong()) {
    const biggest = out.filter((x) => x.sets > 3).sort((a, b) => b.sets - a.sets)[0];
    if (!biggest) break;
    biggest.sets -= 1;
  }
  dropWhile(over);
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
    e.category === "plyo" ? [3, "5", 60]
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

    // Sport work: one exercise per day (two for athletic goals), rotating through the chosen sports
    // so every sport appears during the week without making any single day longer.
    if (p.sports.length) {
      const count = Math.min(p.physique_goal === "athletic" ? 2 : 1, p.sports.length) || 1;
      for (let k = 0; k < count; k++) {
        const sport = p.sports[(dayIndex * count + k) % p.sports.length];
        pick(pool.filter((e) => e.sports.includes(sport)), dayIndex * count + k);
      }
    }

    if (p.physique_goal === "lean") pick(pool.filter((e) => e.category === "conditioning"), dayIndex);

    const ordered = [...picked].sort((a, b) => ORDER[a.category] - ORDER[b.category]);
    return { name: day.name, exercises: fitToTime(ordered.map((e) => prescribe(e, p.physique_goal, p.experience)), { keepMuscles: p.target_muscles, keepSports: p.sports, experience: p.experience }) };
  });

  return { splitName: split.name, days };
}

/** Exercises the user could swap in: available equipment and not already in that day. */
export function swapCandidates(missing: Equipment[], dayExerciseIds: string[]): Exercise[] {
  return EXERCISES.filter((e) => isAvailable(e, missing) && !dayExerciseIds.includes(e.id));
}
