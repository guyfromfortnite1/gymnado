import { describe, expect, it } from "vitest";
import { chooseSplit } from "./splits";
import { estimateMinutes, fitToTime, generatePlan, MAX_SESSION_MIN } from "./generate";
import { EXERCISE_BY_ID, EXERCISES } from "./exercises";
import { dailyTargets } from "./macros";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "./units";
import { addDays, buildSchedule, startOfWeek, weekday } from "./dates";
import { SPORTS, type Equipment, type Sport } from "./types";

const base = {
  training_days: [1, 3, 5],
  physique_goal: "muscular" as const,
  experience: "intermediate" as const,
  target_muscles: [],
  sports: [] as Sport[],
  missing_equipment: [] as Equipment[],
};

describe("chooseSplit", () => {
  it.each([
    [2, "muscular", "Full Body (2 days)", 2],
    [3, "strength", "Full Body (3 days)", 3],
    [3, "muscular", "Push / Pull / Legs", 3],
    [4, "lean", "Upper / Lower", 4],
    [5, "muscular", "Body-part (Bro) split", 5],
    [5, "athletic", "Upper / Lower + Push / Pull / Legs", 5],
    [6, "lean", "Push / Pull / Legs ×2", 6],
  ] as const)("%i days + %s → %s", (days, goal, name, count) => {
    const s = chooseSplit(days, goal);
    expect(s.name).toBe(name);
    expect(s.days).toHaveLength(count);
  });
});

describe("generatePlan", () => {
  it("produces one plan day per split day, with no duplicate exercises within a day", () => {
    const plan = generatePlan(base);
    expect(plan.days.map((d) => d.name)).toEqual(["Push", "Pull", "Legs"]);
    for (const d of plan.days) {
      const ids = d.exercises.map((e) => e.exercise_id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("never uses equipment the user doesn't have", () => {
    const missing: Equipment[] = ["barbell", "cable", "leg_press", "hack_squat", "pec_deck"];
    const plan = generatePlan({ ...base, missing_equipment: missing });
    for (const d of plan.days)
      for (const e of d.exercises) expect(EXERCISE_BY_ID[e.exercise_id].equipment.some((q) => missing.includes(q))).toBe(false);
  });

  it("gives repeated days different main lifts", () => {
    const plan = generatePlan({ ...base, training_days: [1, 2, 4, 5] }); // Upper/Lower ×2
    expect(plan.days[0].exercises[0].exercise_id).not.toBe(plan.days[2].exercises[0].exercise_id);
  });

  it("adds an extra exercise for prioritized muscles", () => {
    const without = generatePlan(base).days[0].exercises.length;
    const withChest = generatePlan({ ...base, target_muscles: ["chest"] }).days[0].exercises.length;
    expect(withChest).toBe(without + 1);
  });

  it.each(Object.keys(SPORTS) as Sport[])("adds sport-specific work for %s", (sport) => {
    const plan = generatePlan({ ...base, sports: [sport], physique_goal: "athletic" });
    for (const d of plan.days) expect(d.exercises.some((e) => EXERCISE_BY_ID[e.exercise_id].sports.includes(sport))).toBe(true);
  });

  it("adds work for every chosen sport when several are picked", () => {
    const sports: Sport[] = ["basketball", "boxing", "running"];
    const plan = generatePlan({ ...base, sports });
    for (const d of plan.days) {
      for (const s of sports) expect(d.exercises.some((e) => EXERCISE_BY_ID[e.exercise_id].sports.includes(s))).toBe(true);
    }
  });

  it("applies goal rep schemes: strength compounds are heavy, lean gets a finisher", () => {
    const strength = generatePlan({ ...base, physique_goal: "strength" });
    const firstCompound = strength.days[0].exercises.find((e) => EXERCISE_BY_ID[e.exercise_id].category === "compound")!;
    expect(firstCompound.reps).toBe("3-5");
    expect(firstCompound.rest_sec).toBe(150);

    const lean = generatePlan({ ...base, physique_goal: "lean" });
    for (const d of lean.days) expect(EXERCISE_BY_ID[d.exercises.at(-1)!.exercise_id].category).toBe("conditioning");
  });

  it("keeps every session to about an hour", () => {
    const goals = ["lean", "muscular", "strength", "athletic"] as const;
    const levels = ["beginner", "intermediate", "advanced"] as const;
    const dayCounts = [[1, 4], [1, 3, 5], [1, 2, 4, 5], [1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]];
    for (const physique_goal of goals) {
      for (const experience of levels) {
        for (const training_days of dayCounts) {
          for (const sports of [[], ["boxing", "running", "tennis"]] as Sport[][]) {
            const plan = generatePlan({ ...base, physique_goal, experience, training_days, sports, target_muscles: ["chest", "biceps", "glutes"] });
            for (const d of plan.days) {
              expect(estimateMinutes(d.exercises)).toBeLessThanOrEqual(MAX_SESSION_MIN);
              expect(d.exercises.length).toBeGreaterThanOrEqual(3);
            }
          }
        }
      }
    }
  });

  it("fitToTime trims sets before dropping exercises", () => {
    const long = Array.from({ length: 8 }, (_, i) => ({ exercise_id: EXERCISES.filter((e) => e.category === "isolation" && !e.sports.length)[i].id, sets: 5, reps: "10", rest_sec: 90 }));
    const fitted = fitToTime(long);
    expect(estimateMinutes(fitted)).toBeLessThanOrEqual(MAX_SESSION_MIN);
    expect(fitted.every((x) => x.sets <= 3)).toBe(true);
  });

  it("puts athletic power work first and scales sets by experience", () => {
    const plan = generatePlan({ ...base, physique_goal: "athletic" });
    for (const d of plan.days) expect(EXERCISE_BY_ID[d.exercises[0].exercise_id].category).toBe("plyo");
    const beg = generatePlan({ ...base, experience: "beginner" }).days[0].exercises[0].sets;
    const adv = generatePlan({ ...base, experience: "advanced" }).days[0].exercises[0].sets;
    expect(beg).toBeLessThan(adv);
  });

  it("every exercise id in the library is unique", () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });
});

describe("dailyTargets (hand-calculated)", () => {
  it("male 30y 180cm 80kg moderate muscular", () => {
    // BMR 1780 × 1.55 × 1.10 = 3034.9
    expect(dailyTargets({ sex: "male", age: 30, height_cm: 180, weight_kg: 80, activity_level: "moderate", physique_goal: "muscular" }))
      .toEqual({ calories: 3035, protein_g: 160, fat_g: 84, carbs_g: 410 });
  });
  it("female 25y 165cm 60kg light lean", () => {
    // BMR 1345.25 × 1.375 × 0.80 = 1479.8
    expect(dailyTargets({ sex: "female", age: 25, height_cm: 165, weight_kg: 60, activity_level: "light", physique_goal: "lean" }))
      .toEqual({ calories: 1480, protein_g: 132, fat_g: 41, carbs_g: 146 });
  });
});

describe("units", () => {
  it("round-trips weight and height", () => {
    expect(lbToKg(180)).toBeCloseTo(81.65, 2);
    expect(kgToLb(lbToKg(180))).toBeCloseTo(180, 6);
    expect(ftInToCm(5, 11)).toBeCloseTo(180.34, 2);
    expect(cmToFtIn(180.34)).toEqual({ ft: 5, inches: 11 });
  });
});

describe("dates & schedule", () => {
  it("does calendar math on date strings", () => {
    expect(weekday("2026-11-01")).toBe(0); // Sunday
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(startOfWeek("2026-11-05")).toBe("2026-11-01");
  });
  it("cycles plan days over the chosen weekdays", () => {
    const s = buildSchedule(3, [1, 3, 5], "2026-11-01", 2);
    expect(s).toHaveLength(6);
    expect(s.slice(0, 4)).toEqual([
      { dayIndex: 0, date: "2026-11-02" },
      { dayIndex: 1, date: "2026-11-04" },
      { dayIndex: 2, date: "2026-11-06" },
      { dayIndex: 0, date: "2026-11-09" },
    ]);
  });
});
