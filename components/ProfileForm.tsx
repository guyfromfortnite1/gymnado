"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "@/lib/units";
import {
  ACTIVITY, EQUIPMENT, EXPERIENCE, GOALS, MUSCLES, SPORT_GROUPS, WEEKDAYS,
  type Activity, type Equipment, type Experience, type Goal, type Muscle, type Profile, type Sport,
} from "@/lib/types";

const DEFAULTS: Profile = {
  units: "imperial", sex: "male", age: 25, height_cm: 175, weight_kg: 75, activity_level: "moderate",
  experience: "beginner", physique_goal: "muscular", target_muscles: [], sport: null, missing_equipment: [], training_days: [1, 3, 5],
};

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`chip ${on ? "chip-on" : "hover:bg-cyan"}`} aria-pressed={on}>
      {children}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-twilight/60">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Edits body stats and training preferences. Calls onSaved() after a successful save. */
export default function ProfileForm({ initial, submitLabel, onSaved }: { initial?: Profile; submitLabel: string; onSaved: () => Promise<void> | void }) {
  const [p, setP] = useState<Profile>(initial ?? DEFAULTS);
  // Display values in the chosen units; converted to cm/kg on save.
  const ftIn = cmToFtIn(p.height_cm);
  const [height, setHeight] = useState({ cm: String(Math.round(p.height_cm)), ft: String(ftIn.ft), in: String(ftIn.inches) });
  const [weight, setWeight] = useState(String(Math.round(p.units === "imperial" ? kgToLb(p.weight_kg) : p.weight_kg)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const heightCm = () => (p.units === "metric" ? Number(height.cm) : ftInToCm(Number(height.ft), Number(height.in)));
  const weightKg = () => (p.units === "metric" ? Number(weight) : lbToKg(Number(weight)));

  function switchUnits(units: Profile["units"]) {
    if (units === p.units) return;
    const cm = heightCm(), kg = weightKg();
    const f = cmToFtIn(cm);
    setHeight({ cm: String(Math.round(cm)), ft: String(f.ft), in: String(f.inches) });
    setWeight(String(Math.round(units === "imperial" ? kgToLb(kg) : kg)));
    set("units", units);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const height_cm = Math.round(heightCm() * 10) / 10;
    const weight_kg = Math.round(weightKg() * 10) / 10;
    if (!(height_cm >= 100 && height_cm <= 250)) return setError("Please enter a valid height.");
    if (!(weight_kg >= 30 && weight_kg <= 300)) return setError("Please enter a valid weight.");
    if (!(p.age >= 13 && p.age <= 100)) return setError("Age must be between 13 and 100.");
    if (p.training_days.length < 2 || p.training_days.length > 6) return setError("Pick 2 to 6 training days.");

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("profiles")
      .upsert({ ...p, id: data.user!.id, height_cm, weight_kg, training_days: [...p.training_days].sort(), updated_at: new Date().toISOString() });
    if (err) {
      setBusy(false);
      return setError(err.message);
    }
    await onSaved();
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Section title="About you" hint="Used to calculate your daily calorie and macro targets.">
        <div className="flex gap-2">
          <Chip on={p.units === "imperial"} onClick={() => switchUnits("imperial")}>Imperial (lb, ft)</Chip>
          <Chip on={p.units === "metric"} onClick={() => switchUnits("metric")}>Metric (kg, cm)</Chip>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="sex">Sex</label>
            <select id="sex" className="input" value={p.sex} onChange={(e) => set("sex", e.target.value as Profile["sex"])}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="age">Age</label>
            <input id="age" type="number" className="input" value={p.age || ""} onChange={(e) => set("age", Number(e.target.value))} />
          </div>
          {p.units === "metric" ? (
            <div>
              <label className="label" htmlFor="cm">Height (cm)</label>
              <input id="cm" type="number" className="input" value={height.cm} onChange={(e) => setHeight({ ...height, cm: e.target.value })} />
            </div>
          ) : (
            <div>
              <span className="label">Height (ft / in)</span>
              <div className="flex gap-1">
                <input aria-label="feet" type="number" className="input" value={height.ft} onChange={(e) => setHeight({ ...height, ft: e.target.value })} />
                <input aria-label="inches" type="number" className="input" value={height.in} onChange={(e) => setHeight({ ...height, in: e.target.value })} />
              </div>
            </div>
          )}
          <div>
            <label className="label" htmlFor="weight">Weight ({p.units === "metric" ? "kg" : "lb"})</label>
            <input id="weight" type="number" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="activity">Activity level</label>
            <select id="activity" className="input" value={p.activity_level} onChange={(e) => set("activity_level", e.target.value as Activity)}>
              {Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="experience">Training experience</label>
            <select id="experience" className="input" value={p.experience} onChange={(e) => set("experience", e.target.value as Experience)}>
              {Object.entries(EXPERIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Physique goal">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(GOALS) as Goal[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => set("physique_goal", g)}
              className={`rounded-xl border p-3 text-left transition ${p.physique_goal === g ? "border-teal bg-teal text-white" : "border-frost bg-white hover:bg-cyan"}`}
            >
              <div className="font-semibold">{GOALS[g].label}</div>
              <div className={`text-sm ${p.physique_goal === g ? "text-cyan" : "text-twilight/60"}`}>{GOALS[g].blurb}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Muscles to prioritize" hint="Optional. Each one gets extra work on the days that train it.">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MUSCLES) as Muscle[]).map((m) => (
            <Chip key={m} on={p.target_muscles.includes(m)} onClick={() => set("target_muscles", toggle(p.target_muscles, m))}>{MUSCLES[m]}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Sport" hint="Optional. Adds sport-specific exercises to every workout.">
        <select className="input" value={p.sport ?? ""} onChange={(e) => set("sport", (e.target.value || null) as Sport | null)}>
          <option value="">None</option>
          {Object.entries(SPORT_GROUPS).map(([group, sports]) => (
            <optgroup key={group} label={group}>
              {Object.entries(sports).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </optgroup>
          ))}
        </select>
      </Section>

      <Section title="Training days" hint="Pick 2 to 6. Your split depends on how many days you train.">
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => (
            <Chip key={d} on={p.training_days.includes(i)} onClick={() => set("training_days", toggle(p.training_days, i))}>{d}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Equipment you DON'T have" hint="We assume a full gym. Tap anything that's missing and we'll skip exercises that need it.">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(EQUIPMENT) as Equipment[]).map((k) => (
            <Chip key={k} on={p.missing_equipment.includes(k)} onClick={() => set("missing_equipment", toggle(p.missing_equipment, k))}>
              {p.missing_equipment.includes(k) ? "✕ " : ""}{EQUIPMENT[k]}
            </Chip>
          ))}
        </div>
      </Section>

      {error && <p className="rounded-lg bg-cyan p-3 text-sm font-medium">{error}</p>}
      <button className="btn w-full py-3 text-lg" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}
