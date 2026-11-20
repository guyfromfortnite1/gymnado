// Shared domain vocabulary. Ids are stored in the DB; labels are shown in the UI.

export const MUSCLES = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
} as const;
export type Muscle = keyof typeof MUSCLES;

export const GOALS = {
  lean: { label: "Lean / shredded", blurb: "Lose fat, keep muscle" },
  muscular: { label: "Muscular / bodybuilder", blurb: "Build size" },
  strength: { label: "Strength / powerlifter", blurb: "Lift heavier" },
  athletic: { label: "Athletic / functional", blurb: "Power and conditioning" },
} as const;
export type Goal = keyof typeof GOALS;

export const SPORT_GROUPS = {
  "Ball sports": { basketball: "Basketball", soccer: "Soccer", american_football: "American football", volleyball: "Volleyball" },
  "Combat sports": { boxing: "Boxing", mma: "MMA", wrestling: "Wrestling", bjj: "BJJ" },
  Endurance: { running: "Running", cycling: "Cycling", swimming: "Swimming" },
  "Racket sports": { tennis: "Tennis", pickleball: "Pickleball", badminton: "Badminton" },
} as const;
type Groups = typeof SPORT_GROUPS;
export type Sport = { [G in keyof Groups]: keyof Groups[G] }[keyof Groups];
export const SPORTS: Record<Sport, string> = Object.assign({}, ...Object.values(SPORT_GROUPS));

// A full gym is assumed; the user lists what they DON'T have.
export const EQUIPMENT = {
  barbell: "Barbell + rack",
  dumbbell: "Dumbbells",
  kettlebell: "Kettlebells",
  bench: "Bench",
  cable: "Cable machine",
  lat_pulldown: "Lat pulldown machine",
  leg_press: "Leg press",
  hack_squat: "Hack squat machine",
  leg_extension: "Leg extension machine",
  leg_curl: "Leg curl machine",
  chest_press_machine: "Chest press machine",
  pec_deck: "Pec deck",
  calf_raise_machine: "Calf raise machine",
  pullup_bar: "Pull-up bar",
  dip_station: "Dip station",
  plyo_box: "Plyo box",
  medicine_ball: "Medicine ball",
  sled: "Sled",
  rower: "Rowing machine",
  assault_bike: "Air / assault bike",
  battle_ropes: "Battle ropes",
  landmine: "Landmine",
  trap_bar: "Trap bar",
  resistance_band: "Resistance bands",
} as const;
export type Equipment = keyof typeof EQUIPMENT;

export const ACTIVITY = {
  sedentary: { label: "Sedentary (desk job, little exercise)", factor: 1.2 },
  light: { label: "Light (1–3 sessions/week)", factor: 1.375 },
  moderate: { label: "Moderate (3–5 sessions/week)", factor: 1.55 },
  active: { label: "Active (6–7 sessions/week)", factor: 1.725 },
  very_active: { label: "Very active (physical job + training)", factor: 1.9 },
} as const;
export type Activity = keyof typeof ACTIVITY;

export const EXPERIENCE = { beginner: "Beginner (< 1 year)", intermediate: "Intermediate (1–3 years)", advanced: "Advanced (3+ years)" } as const;
export type Experience = keyof typeof EXPERIENCE;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type Profile = {
  units: "imperial" | "metric";
  sex: "male" | "female";
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: Activity;
  experience: Experience;
  physique_goal: Goal;
  target_muscles: Muscle[];
  sports: Sport[];
  missing_equipment: Equipment[];
  training_days: number[]; // 0 = Sunday … 6 = Saturday
};

export type PlanExercise = { exercise_id: string; sets: number; reps: string; rest_sec: number };
export type PlanDay = { name: string; exercises: PlanExercise[] };

export type FoodItem = { name: string; portion: string; calories: number; protein_g: number; carbs_g: number; fat_g: number };
