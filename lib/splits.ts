import type { Goal, Muscle } from "./types";

export type Slot = { muscle: Muscle; kind: "compound" | "isolation" | "any" };
export type SplitDay = { name: string; slots: Slot[] };
export type Split = { name: string; days: SplitDay[] };

const s = (muscle: Muscle, kind: Slot["kind"] = "any"): Slot => ({ muscle, kind });

const FULL_A: SplitDay = { name: "Full Body A", slots: [s("quads", "compound"), s("chest", "compound"), s("back", "compound"), s("hamstrings"), s("shoulders", "isolation"), s("core")] };
const FULL_B: SplitDay = { name: "Full Body B", slots: [s("hamstrings", "compound"), s("shoulders", "compound"), s("back", "compound"), s("quads"), s("chest"), s("biceps", "isolation"), s("triceps", "isolation")] };
const FULL_C: SplitDay = { name: "Full Body C", slots: [s("quads", "compound"), s("back", "compound"), s("chest", "compound"), s("glutes"), s("shoulders", "isolation"), s("core")] };
const UPPER: SplitDay = { name: "Upper", slots: [s("chest", "compound"), s("back", "compound"), s("shoulders", "compound"), s("back"), s("chest", "isolation"), s("biceps", "isolation"), s("triceps", "isolation")] };
const LOWER: SplitDay = { name: "Lower", slots: [s("quads", "compound"), s("hamstrings", "compound"), s("glutes"), s("quads", "isolation"), s("calves"), s("core")] };
const PUSH: SplitDay = { name: "Push", slots: [s("chest", "compound"), s("shoulders", "compound"), s("chest"), s("shoulders", "isolation"), s("triceps", "isolation"), s("triceps")] };
const PULL: SplitDay = { name: "Pull", slots: [s("back", "compound"), s("back", "compound"), s("back"), s("shoulders", "isolation"), s("biceps", "isolation"), s("biceps"), s("core")] };
const LEGS: SplitDay = { name: "Legs", slots: [s("quads", "compound"), s("hamstrings", "compound"), s("quads"), s("hamstrings", "isolation"), s("glutes"), s("calves")] };

const BRO: SplitDay[] = [
  { name: "Chest", slots: [s("chest", "compound"), s("chest", "compound"), s("chest"), s("chest", "isolation"), s("triceps", "isolation")] },
  { name: "Back", slots: [s("back", "compound"), s("back", "compound"), s("back"), s("back", "isolation"), s("biceps", "isolation")] },
  { name: "Shoulders", slots: [s("shoulders", "compound"), s("shoulders", "compound"), s("shoulders", "isolation"), s("shoulders", "isolation"), s("core")] },
  { name: "Arms", slots: [s("biceps", "isolation"), s("triceps", "compound"), s("biceps"), s("triceps", "isolation"), s("biceps", "isolation"), s("triceps")] },
  { name: "Legs", slots: [s("quads", "compound"), s("hamstrings", "compound"), s("quads"), s("glutes"), s("hamstrings", "isolation"), s("calves")] },
];

/** Rules: how many days the user trains + their goal decide the split. */
export function chooseSplit(daysPerWeek: number, goal: Goal): Split {
  const d = Math.min(6, Math.max(2, daysPerWeek));
  if (d === 2) return { name: "Full Body (2 days)", days: [FULL_A, FULL_B] };
  if (d === 3) {
    return goal === "muscular"
      ? { name: "Push / Pull / Legs", days: [PUSH, PULL, LEGS] }
      : { name: "Full Body (3 days)", days: [FULL_A, FULL_B, FULL_C] };
  }
  if (d === 4) return { name: "Upper / Lower", days: [UPPER, LOWER, UPPER, LOWER] };
  if (d === 5) {
    return goal === "muscular"
      ? { name: "Body-part (Bro) split", days: BRO }
      : { name: "Upper / Lower + Push / Pull / Legs", days: [UPPER, LOWER, PUSH, PULL, LEGS] };
  }
  return { name: "Push / Pull / Legs ×2", days: [PUSH, PULL, LEGS, PUSH, PULL, LEGS] };
}
