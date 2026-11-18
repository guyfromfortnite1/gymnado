import type { Equipment, Muscle, Sport } from "./types";

export type Category = "compound" | "isolation" | "plyo" | "conditioning";

export type Exercise = {
  id: string;
  name: string;
  muscles: Muscle[]; // first entry is the primary muscle
  equipment: Equipment[]; // ALL of these are required
  category: Category;
  sports: Sport[];
  fixedReps?: string; // for timed / distance work
};

const ex = (
  id: string,
  name: string,
  muscles: Muscle[],
  equipment: Equipment[],
  category: Category,
  sports: Sport[] = [],
  fixedReps?: string,
): Exercise => ({ id, name, muscles, equipment, category, sports, fixedReps });

// Order matters: within a muscle + category, earlier entries are picked first.
export const EXERCISES: Exercise[] = [
  // Chest
  ex("barbell_bench_press", "Barbell Bench Press", ["chest", "triceps", "shoulders"], ["barbell", "bench"], "compound"),
  ex("incline_db_press", "Incline Dumbbell Press", ["chest", "shoulders", "triceps"], ["dumbbell", "bench"], "compound"),
  ex("db_bench_press", "Dumbbell Bench Press", ["chest", "triceps"], ["dumbbell", "bench"], "compound"),
  ex("incline_barbell_press", "Incline Barbell Press", ["chest", "shoulders"], ["barbell", "bench"], "compound"),
  ex("machine_chest_press", "Machine Chest Press", ["chest", "triceps"], ["chest_press_machine"], "compound"),
  ex("dip", "Chest Dip", ["chest", "triceps"], ["dip_station"], "compound"),
  ex("push_up", "Push-up", ["chest", "triceps", "core"], [], "compound"),
  ex("cable_fly", "Cable Fly", ["chest"], ["cable"], "isolation"),
  ex("pec_deck_fly", "Pec Deck Fly", ["chest"], ["pec_deck"], "isolation"),
  ex("db_fly", "Dumbbell Fly", ["chest"], ["dumbbell", "bench"], "isolation"),

  // Back
  ex("pull_up", "Pull-up", ["back", "biceps"], ["pullup_bar"], "compound", ["swimming", "bjj", "wrestling"]),
  ex("barbell_row", "Barbell Row", ["back", "biceps"], ["barbell"], "compound"),
  ex("lat_pulldown", "Lat Pulldown", ["back", "biceps"], ["lat_pulldown"], "compound", ["swimming"]),
  ex("seated_cable_row", "Seated Cable Row", ["back", "biceps"], ["cable"], "compound", ["swimming", "cycling"]),
  ex("db_row", "One-arm Dumbbell Row", ["back", "biceps"], ["dumbbell", "bench"], "compound"),
  ex("chest_supported_row", "Chest-supported Dumbbell Row", ["back"], ["dumbbell", "bench"], "compound"),
  ex("inverted_row", "Inverted Row", ["back", "biceps"], ["barbell"], "compound"),
  ex("straight_arm_pulldown", "Straight-arm Pulldown", ["back"], ["cable"], "isolation", ["swimming"]),
  ex("db_pullover", "Dumbbell Pullover", ["back", "chest"], ["dumbbell", "bench"], "isolation", ["swimming"]),

  // Shoulders
  ex("overhead_press", "Standing Overhead Press", ["shoulders", "triceps", "core"], ["barbell"], "compound", ["volleyball"]),
  ex("db_shoulder_press", "Seated Dumbbell Shoulder Press", ["shoulders", "triceps"], ["dumbbell", "bench"], "compound"),
  ex("arnold_press", "Arnold Press", ["shoulders"], ["dumbbell"], "compound"),
  ex("landmine_press", "Landmine Press", ["shoulders", "chest", "core"], ["landmine", "barbell"], "compound", ["boxing", "mma", "american_football"]),
  ex("pike_push_up", "Pike Push-up", ["shoulders", "triceps"], [], "compound"),
  ex("lateral_raise", "Dumbbell Lateral Raise", ["shoulders"], ["dumbbell"], "isolation"),
  ex("cable_lateral_raise", "Cable Lateral Raise", ["shoulders"], ["cable"], "isolation"),
  ex("rear_delt_fly", "Rear Delt Fly", ["shoulders", "back"], ["dumbbell"], "isolation"),
  ex("face_pull", "Face Pull", ["shoulders", "back"], ["cable"], "isolation", ["swimming", "tennis", "boxing", "volleyball"]),
  ex("cable_external_rotation", "Cable External Rotation", ["shoulders"], ["cable"], "isolation", ["swimming", "tennis", "pickleball", "badminton", "volleyball"]),
  ex("band_pull_apart", "Band Pull-apart", ["shoulders", "back"], ["resistance_band"], "isolation", ["swimming", "tennis", "pickleball", "badminton", "volleyball"]),

  // Biceps
  ex("barbell_curl", "Barbell Curl", ["biceps"], ["barbell"], "isolation"),
  ex("db_curl", "Dumbbell Curl", ["biceps"], ["dumbbell"], "isolation"),
  ex("hammer_curl", "Hammer Curl", ["biceps"], ["dumbbell"], "isolation", ["bjj", "wrestling"]),
  ex("incline_db_curl", "Incline Dumbbell Curl", ["biceps"], ["dumbbell", "bench"], "isolation"),
  ex("cable_curl", "Cable Curl", ["biceps"], ["cable"], "isolation"),
  ex("chin_up", "Chin-up", ["biceps", "back"], ["pullup_bar"], "compound"),

  // Triceps
  ex("close_grip_bench", "Close-grip Bench Press", ["triceps", "chest"], ["barbell", "bench"], "compound"),
  ex("bench_dip", "Bench Dip", ["triceps"], ["bench"], "compound"),
  ex("tricep_pushdown", "Cable Tricep Pushdown", ["triceps"], ["cable"], "isolation"),
  ex("overhead_tricep_ext", "Overhead Dumbbell Extension", ["triceps"], ["dumbbell"], "isolation"),
  ex("skull_crusher", "Skull Crusher", ["triceps"], ["barbell", "bench"], "isolation"),
  ex("diamond_push_up", "Diamond Push-up", ["triceps", "chest"], [], "isolation"),

  // Quads
  ex("back_squat", "Barbell Back Squat", ["quads", "glutes", "hamstrings"], ["barbell"], "compound", ["american_football", "volleyball", "basketball"]),
  ex("front_squat", "Front Squat", ["quads", "core"], ["barbell"], "compound"),
  ex("leg_press", "Leg Press", ["quads", "glutes"], ["leg_press"], "compound"),
  ex("hack_squat", "Hack Squat", ["quads"], ["hack_squat"], "compound"),
  ex("bulgarian_split_squat", "Bulgarian Split Squat", ["quads", "glutes"], ["dumbbell", "bench"], "compound", ["running", "cycling", "soccer", "basketball"]),
  ex("goblet_squat", "Goblet Squat", ["quads", "glutes"], ["dumbbell"], "compound"),
  ex("walking_lunge", "Walking Lunge", ["quads", "glutes"], ["dumbbell"], "compound", ["soccer", "running"]),
  ex("bodyweight_squat", "Bodyweight Squat", ["quads", "glutes"], [], "compound"),
  ex("lateral_lunge", "Lateral Lunge", ["quads", "glutes"], ["dumbbell"], "compound", ["tennis", "pickleball", "badminton", "soccer"]),
  ex("leg_extension", "Leg Extension", ["quads"], ["leg_extension"], "isolation", ["cycling"]),
  ex("step_up", "Dumbbell Step-up", ["quads", "glutes"], ["dumbbell", "plyo_box"], "compound", ["running", "cycling"]),

  // Hamstrings
  ex("deadlift", "Conventional Deadlift", ["hamstrings", "glutes", "back"], ["barbell"], "compound", ["wrestling", "american_football"]),
  ex("romanian_deadlift", "Romanian Deadlift", ["hamstrings", "glutes", "back"], ["barbell"], "compound"),
  ex("db_rdl", "Dumbbell Romanian Deadlift", ["hamstrings", "glutes"], ["dumbbell"], "compound"),
  ex("good_morning", "Good Morning", ["hamstrings", "back"], ["barbell"], "compound"),
  ex("single_leg_rdl", "Single-leg Dumbbell RDL", ["hamstrings", "glutes", "core"], ["dumbbell"], "compound", ["running", "soccer", "tennis"]),
  ex("lying_leg_curl", "Lying Leg Curl", ["hamstrings"], ["leg_curl"], "isolation"),
  ex("nordic_curl", "Nordic Hamstring Curl", ["hamstrings"], [], "isolation", ["soccer", "running", "american_football", "basketball"]),

  // Glutes
  ex("hip_thrust", "Barbell Hip Thrust", ["glutes", "hamstrings"], ["barbell", "bench"], "compound", ["running", "soccer", "american_football"]),
  ex("glute_bridge", "Glute Bridge", ["glutes"], [], "isolation"),
  ex("cable_kickback", "Cable Glute Kickback", ["glutes"], ["cable"], "isolation"),

  // Calves
  ex("standing_calf_raise", "Standing Calf Raise", ["calves"], ["calf_raise_machine"], "isolation"),
  ex("db_calf_raise", "Dumbbell Calf Raise", ["calves"], ["dumbbell"], "isolation"),
  ex("single_leg_calf_raise", "Single-leg Calf Raise", ["calves"], [], "isolation", ["running", "basketball", "volleyball"]),

  // Core
  ex("hanging_leg_raise", "Hanging Leg Raise", ["core"], ["pullup_bar"], "isolation", ["mma", "bjj", "swimming"]),
  ex("cable_crunch", "Cable Crunch", ["core"], ["cable"], "isolation"),
  ex("pallof_press", "Pallof Press", ["core"], ["cable"], "isolation", ["tennis", "pickleball", "boxing", "bjj", "wrestling"]),
  ex("plank", "Plank", ["core"], [], "isolation", [], "30–45 s"),
  ex("dead_bug", "Dead Bug", ["core"], [], "isolation", ["running", "cycling", "swimming"]),
  ex("copenhagen_plank", "Copenhagen Plank", ["core", "glutes"], ["bench"], "isolation", ["soccer", "running", "tennis"], "20–30 s / side"),
  ex("russian_twist", "Med Ball Russian Twist", ["core"], ["medicine_ball"], "isolation", ["boxing", "mma", "tennis"]),
  ex("turkish_getup", "Kettlebell Turkish Get-up", ["core", "shoulders"], ["kettlebell"], "compound", ["bjj", "mma", "wrestling"], "3 / side"),
  ex("farmer_carry", "Farmer's Carry", ["core", "back"], ["dumbbell"], "compound", ["wrestling", "bjj", "mma", "american_football"], "40 m"),

  // Plyometrics / power
  ex("box_jump", "Box Jump", ["quads", "glutes"], ["plyo_box"], "plyo", ["basketball", "volleyball", "american_football", "soccer"]),
  ex("broad_jump", "Broad Jump", ["glutes", "quads"], [], "plyo", ["american_football", "soccer", "basketball"]),
  ex("depth_jump", "Depth Jump", ["quads", "calves"], ["plyo_box"], "plyo", ["basketball", "volleyball"]),
  ex("lateral_bound", "Lateral Bound", ["glutes", "quads"], [], "plyo", ["basketball", "soccer", "tennis", "pickleball", "badminton"]),
  ex("skater_jump", "Skater Jump", ["glutes", "quads"], [], "plyo", ["tennis", "badminton", "pickleball", "soccer"]),
  ex("split_squat_jump", "Split Squat Jump", ["quads", "glutes"], [], "plyo", ["badminton", "volleyball", "soccer"]),
  ex("pogo_jump", "Pogo Jumps", ["calves"], [], "plyo", ["running", "basketball", "volleyball", "badminton"], "20 s"),
  ex("trap_bar_jump", "Trap Bar Jump", ["quads", "glutes"], ["trap_bar"], "plyo", ["american_football", "basketball", "volleyball"]),
  ex("power_clean", "Power Clean", ["hamstrings", "glutes", "back"], ["barbell"], "plyo", ["american_football", "wrestling", "volleyball"]),
  ex("med_ball_slam", "Medicine Ball Slam", ["core", "shoulders"], ["medicine_ball"], "plyo", ["boxing", "mma", "wrestling", "bjj", "american_football"]),
  ex("med_ball_rotational_throw", "Rotational Med Ball Throw", ["core"], ["medicine_ball"], "plyo", ["tennis", "pickleball", "boxing", "mma", "badminton"]),
  ex("med_ball_chest_pass", "Med Ball Chest Pass", ["chest", "triceps"], ["medicine_ball"], "plyo", ["basketball", "boxing", "american_football"]),
  ex("med_ball_overhead_throw", "Overhead Med Ball Throw", ["shoulders", "core"], ["medicine_ball"], "plyo", ["volleyball", "tennis", "soccer"]),
  ex("landmine_rotation", "Landmine Rotation", ["core", "shoulders"], ["landmine", "barbell"], "plyo", ["boxing", "mma", "tennis", "pickleball"]),

  // Conditioning
  ex("rower_intervals", "Rower Intervals", ["back", "quads"], ["rower"], "conditioning", ["swimming", "cycling", "running", "mma"], "8 × 20 s hard / 40 s easy"),
  ex("bike_sprints", "Air Bike Sprints", ["quads"], ["assault_bike"], "conditioning", ["cycling", "mma", "boxing"], "8 × 15 s hard / 45 s easy"),
  ex("battle_ropes", "Battle Ropes", ["shoulders", "core"], ["battle_ropes"], "conditioning", ["boxing", "mma", "bjj", "wrestling"], "6 × 30 s on / 30 s off"),
  ex("kettlebell_swing", "Kettlebell Swing", ["glutes", "hamstrings"], ["kettlebell"], "conditioning", ["bjj", "wrestling", "mma", "running", "cycling"], "5 × 15"),
  ex("sled_push", "Sled Push", ["quads", "glutes"], ["sled"], "conditioning", ["american_football", "wrestling", "mma"], "6 × 20 m"),
  ex("burpee", "Burpees", ["chest", "quads", "core"], [], "conditioning", ["mma", "wrestling", "boxing"], "5 × 10"),
  ex("sprawl", "Sprawls", ["core", "quads"], [], "conditioning", ["wrestling", "mma", "bjj"], "5 × 30 s"),
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function isAvailable(e: Exercise, missing: readonly Equipment[]): boolean {
  return e.equipment.every((eq) => !missing.includes(eq));
}
