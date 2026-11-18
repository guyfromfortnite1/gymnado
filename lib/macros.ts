import { ACTIVITY, type Goal, type Profile } from "./types";

export type Targets = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

const GOAL_ADJUST: Record<Goal, number> = { lean: -0.2, muscular: 0.1, strength: 0.05, athletic: 0 };

/** Mifflin-St Jeor BMR × activity factor, adjusted for goal; protein by bodyweight, fat 25% of kcal, carbs the rest. */
export function dailyTargets(p: Pick<Profile, "sex" | "age" | "height_cm" | "weight_kg" | "activity_level" | "physique_goal">): Targets {
  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const calories = Math.round(bmr * ACTIVITY[p.activity_level].factor * (1 + GOAL_ADJUST[p.physique_goal]));
  const protein_g = Math.round(p.weight_kg * (p.physique_goal === "lean" ? 2.2 : 2.0));
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  return { calories, protein_g, carbs_g, fat_g };
}

export const sumMacros = (rows: Targets[]): Targets =>
  rows.reduce(
    (t, r) => ({ calories: t.calories + r.calories, protein_g: t.protein_g + r.protein_g, carbs_g: t.carbs_g + r.carbs_g, fat_g: t.fat_g + r.fat_g }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
