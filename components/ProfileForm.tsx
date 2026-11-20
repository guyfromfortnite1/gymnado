"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import MuscleMap from "@/components/MuscleMap";
import Link from "next/link";
import PremiumSurface, { PremiumBadge } from "@/components/PremiumSurface";
import { useScanStatus } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from "@/lib/units";
import { fadeOutMs, wait } from "@/lib/motion";
import {
  ACTIVITY, EQUIPMENT, EXPERIENCE, GOALS, MUSCLES, SPORT_GROUPS, WEEKDAYS,
  type Activity, type Equipment, type Experience, type Goal, type Muscle, type Profile, type Sport,
} from "@/lib/types";

// A profile being filled in: these choices start unanswered for new users.
type Draft = Omit<Profile, "activity_level" | "experience" | "physique_goal"> & {
  activity_level: Activity | null; experience: Experience | null; physique_goal: Goal | null;
};

// Age, height and weight start blank (0 / empty strings) so new users type their own.
const DEFAULTS: Draft = {
  units: "imperial", sex: "male", age: 0, height_cm: 0, weight_kg: 0, activity_level: null,
  experience: null, physique_goal: null, target_muscles: [], sports: [], missing_equipment: [], training_days: [],
};

const DRAFT_KEY = "gymnado-plan-draft";

const pickOne = (v: unknown) => (v ? null : "Please pick an option to continue.");

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`chip ${on ? "chip-on" : "hover:bg-cyan"}`} aria-pressed={on}>
      {children}
    </button>
  );
}

/** A large single-choice answer card. */
function Option({ on, onClick, label, blurb }: { on: boolean; onClick: () => void; label: string; blurb?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`w-full rounded-xl border p-3 text-left transition duration-200 hover:scale-[1.03] hover:shadow-md ${on ? "border-teal bg-accent text-accent-ink" : "border-frost bg-surface hover:bg-cyan"}`}
    >
      <div className="font-semibold">{label}</div>
      {blurb && <div className={`text-sm ${on ? "text-accent-ink/75" : "text-twilight/60"}`}>{blurb}</div>}
    </button>
  );
}

/** A multi-select choice shown as a photo card (photos live in public/muscles and public/sports). */
function PhotoCard({ src, muscle, label, on, onClick }: { src?: string; muscle?: Muscle; label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative overflow-hidden rounded-xl border-2 text-left transition duration-200 hover:z-10 hover:scale-105 hover:shadow-lg ${on ? "border-teal" : "border-frost hover:border-surf"}`}
    >
      {muscle ? (
        <MuscleMap muscles={[muscle]} className={`h-24 py-1 ${on ? "bg-cyan" : "bg-surface"}`} />
      ) : (
        <Image src={src!} alt="" width={240} height={180} className="h-24 w-full object-cover" />
      )}
      <span className={`block px-2 py-1 text-sm font-semibold ${on ? "bg-accent text-accent-ink" : "bg-surface text-twilight"}`}>{label}</span>
      {on && <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal text-sm text-white shadow" aria-hidden>✓</span>}
    </button>
  );
}

type Step = { title: string; hint?: string; check?: () => string | null; body: React.ReactNode; premium?: boolean };

/**
 * Asks for body stats and training preferences one question at a time.
 * Calls onSaved() after a successful save; busyLabel is shown while saving and while onSaved() runs.
 * onSaved() returns "leaving" when it navigates away, so the busy card stays up until the page changes.
 */
export default function ProfileForm({ initial, submitLabel, busyLabel, onSaved }: {
  initial?: Profile; submitLabel: string; busyLabel: string; onSaved: () => Promise<"leaving" | void> | "leaving" | void;
}) {
  const [p, setP] = useState<Draft>(initial ?? DEFAULTS);
  // Display values in the chosen units; converted to cm/kg on save.
  const ftIn = cmToFtIn(p.height_cm);
  const [height, setHeight] = useState(
    initial ? { cm: String(Math.round(p.height_cm)), ft: String(ftIn.ft), in: String(ftIn.inches) } : { cm: "", ft: "", in: "" },
  );
  const [weight, setWeight] = useState(initial ? String(Math.round(p.units === "imperial" ? kgToLb(p.weight_kg) : p.weight_kg)) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);
  // Sports are Premium-only. Re-check when the tab regains focus, in case they upgraded in another tab.
  const { status: scanStatus, reload: reloadPremium } = useScanStatus();
  const premium = !!scanStatus?.premium;
  useEffect(() => {
    window.addEventListener("focus", reloadPremium);
    return () => window.removeEventListener("focus", reloadPremium);
  }, [reloadPremium]);

  // Keep unfinished answers in this browser tab, so leaving for the Premium page (or a reload) doesn't lose them.
  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
      if (!d?.p) return;
       
      setP(d.p);
      setHeight(d.height);
      setWeight(d.weight);
      setStep(d.step);
       
    } catch {}
  }, []);
  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ p, height, weight, step }));
  }, [p, height, weight, step]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const heightCm = () => (p.units === "metric" ? Number(height.cm) : ftInToCm(Number(height.ft), Number(height.in)));
  const weightKg = () => (p.units === "metric" ? Number(weight) : lbToKg(Number(weight)));
  const roundedHeight = () => Math.round(heightCm() * 10) / 10;
  const roundedWeight = () => Math.round(weightKg() * 10) / 10;

  function switchUnits(units: Profile["units"]) {
    if (units === p.units) return;
    const cm = heightCm(), kg = weightKg();
    const f = cmToFtIn(cm);
    // Blank fields stay blank instead of turning into 0.
    if (cm) setHeight({ cm: String(Math.round(cm)), ft: String(f.ft), in: String(f.inches) });
    if (kg) setWeight(String(Math.round(units === "imperial" ? kgToLb(kg) : kg)));
    set("units", units);
  }

  const steps: Step[] = [
    {
      title: "Which units do you use?",
      body: (
        <div className="grid gap-2">
          <Option on={p.units === "imperial"} onClick={() => switchUnits("imperial")} label="Imperial" blurb="Pounds, feet and inches" />
          <Option on={p.units === "metric"} onClick={() => switchUnits("metric")} label="Metric" blurb="Kilograms and centimetres" />
        </div>
      ),
    },
    {
      title: "What's your sex?",
      hint: "Used to calculate your daily calorie and macro targets.",
      body: (
        <div className="grid gap-2">
          <Option on={p.sex === "male"} onClick={() => set("sex", "male")} label="Male" />
          <Option on={p.sex === "female"} onClick={() => set("sex", "female")} label="Female" />
        </div>
      ),
    },
    {
      title: "How old are you?",
      check: () => (p.age >= 13 && p.age <= 100 ? null : "Age must be between 13 and 100."),
      body: (
        <div>
          <label className="label" htmlFor="age">Age</label>
          <input id="age" type="number" className="input" value={p.age || ""} onChange={(e) => set("age", Number(e.target.value))} />
        </div>
      ),
    },
    {
      title: "How tall are you?",
      check: () => (roundedHeight() >= 100 && roundedHeight() <= 250 ? null : "Please enter a valid height."),
      body:
        p.units === "metric" ? (
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
        ),
    },
    {
      title: "How much do you weigh?",
      check: () => (roundedWeight() >= 30 && roundedWeight() <= 300 ? null : "Please enter a valid weight."),
      body: (
        <div>
          <label className="label" htmlFor="weight">Weight ({p.units === "metric" ? "kg" : "lb"})</label>
          <input id="weight" type="number" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      ),
    },
    {
      title: "How active are you?",
      check: () => pickOne(p.activity_level),
      body: (
        <div className="grid gap-2">
          {(Object.keys(ACTIVITY) as Activity[]).map((k) => (
            <Option key={k} on={p.activity_level === k} onClick={() => set("activity_level", k)} label={ACTIVITY[k].label} />
          ))}
        </div>
      ),
    },
    {
      title: "How much training experience do you have?",
      check: () => pickOne(p.experience),
      body: (
        <div className="grid gap-2">
          {(Object.keys(EXPERIENCE) as Experience[]).map((k) => (
            <Option key={k} on={p.experience === k} onClick={() => set("experience", k)} label={EXPERIENCE[k]} />
          ))}
        </div>
      ),
    },
    {
      title: "What's your physique goal?",
      check: () => pickOne(p.physique_goal),
      body: (
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(GOALS) as Goal[]).map((g) => (
            <Option key={g} on={p.physique_goal === g} onClick={() => set("physique_goal", g)} label={GOALS[g].label} blurb={GOALS[g].blurb} />
          ))}
        </div>
      ),
    },
    {
      title: "Which muscles do you want to prioritize?",
      hint: "Optional. Each one gets extra work on the days that train it.",
      body: (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(MUSCLES) as Muscle[]).map((m) => (
            <PhotoCard key={m} muscle={m} label={MUSCLES[m]} on={p.target_muscles.includes(m)} onClick={() => set("target_muscles", toggle(p.target_muscles, m))} />
          ))}
        </div>
      ),
    },
    {
      title: "Which days can you train?",
      hint: "Pick 2 to 6. Your split depends on how many days you train.",
      check: () => (p.training_days.length >= 2 && p.training_days.length <= 6 ? null : "Pick 2 to 6 training days."),
      body: (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {WEEKDAYS.map((d, i) => {
            const on = p.training_days.includes(i);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => set("training_days", toggle(p.training_days, i))}
                className={`h-16 rounded-xl border-2 text-lg font-semibold transition duration-200 hover:scale-105 hover:shadow-md ${on ? "border-teal bg-accent text-accent-ink" : "border-frost bg-surface text-twilight hover:border-surf"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Any equipment you DON'T have?",
      hint: "We assume a full gym. Tap anything that's missing and we'll skip exercises that need it.",
      body: (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(EQUIPMENT) as Equipment[]).map((k) => (
            <Chip key={k} on={p.missing_equipment.includes(k)} onClick={() => set("missing_equipment", toggle(p.missing_equipment, k))}>
              {p.missing_equipment.includes(k) ? "✕ " : ""}{EQUIPMENT[k]}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: "Do you play any sports?",
      hint: premium ? "Optional. Pick as many as you like. Sport-specific work is rotated through your week." : "Build a physique for your sport.",
      premium: true,
      body: !premium ? (
        <div className="space-y-3">
          <p className="text-ice/90">
            Premium adds sport-specific exercises to your workouts, for basketball, soccer, boxing, running, tennis and more.
          </p>
          <Link href="/premium" className="inline-flex rounded-xl bg-white px-4 py-2 font-semibold text-navy transition duration-200 hover:scale-105 hover:bg-ice">
            Upgrade to unlock
          </Link>
          <p className="text-xs text-ice/70">Your answers are saved, so you can come back and finish. Or finish below without it.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <PhotoCard src="/sports/none.jpg" label="None" on={p.sports.length === 0} onClick={() => set("sports", [])} />
          </div>
          {Object.entries(SPORT_GROUPS).map(([group, sports]) => (
            <div key={group}>
              <p className="mb-1 text-sm font-medium text-ice/80">{group}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(sports).map(([id, label]) => (
                  <PhotoCard key={id} src={`/sports/${id}.jpg`} label={label} on={p.sports.includes(id as Sport)} onClick={() => set("sports", toggle(p.sports, id as Sport))} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];
  const last = step === steps.length - 1;

  /** Fade the current card out, run `change`, and let the new card fade in. */
  async function transition(change: () => void) {
    setFading(true);
    await wait(fadeOutMs());
    change();
    setFading(false);
  }

  async function save() {
    setError(null);
    await transition(() => setBusy(true));
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("profiles").upsert({
      ...p, sports: premium ? p.sports : [], id: data.user!.id, height_cm: roundedHeight(), weight_kg: roundedWeight(),
      training_days: [...p.training_days].sort(), updated_at: new Date().toISOString(),
    });
    if (!err) sessionStorage.removeItem(DRAFT_KEY);
    if (!err && (await onSaved()) === "leaving") return; // keep the busy card up while the page navigates away
    await transition(() => setBusy(false));
    if (err) setError(err.message);
  }

  async function next(e: React.FormEvent) {
    e.preventDefault();
    if (fading || busy) return;
    const problem = steps[step].check?.() ?? null;
    if (problem) return setError(problem);
    setError(null);
    if (last) return save();
    await transition(() => setStep(step + 1));
  }

  async function back() {
    if (fading || busy || step === 0) return;
    setError(null);
    await transition(() => setStep(step - 1));
  }

  const current = steps[step];
  return (
    <form onSubmit={next} className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm text-twilight/60">
          <span>Question {step + 1} of {steps.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-cyan">
          <div className="h-full rounded-full bg-surf transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      {busy ? (
        <section key="busy" className={`card flex flex-col items-center gap-3 py-10 ${fading ? "fade-out" : "fade-in"}`}>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan border-t-teal" aria-hidden />
          <p className="font-semibold" role="status">{busyLabel}</p>
        </section>
      ) : (
        current.premium ? (
          <section key={step} className={fading ? "fade-out" : "fade-in"}>
            <PremiumSurface className="space-y-3">
              <PremiumBadge />
              <div>
                <h2 className="text-lg font-semibold">{current.title}</h2>
                {current.hint && <p className="text-sm text-ice/80">{current.hint}</p>}
              </div>
              {current.body}
            </PremiumSurface>
          </section>
        ) : (
          <section key={step} className={`card space-y-3 ${fading ? "fade-out" : "fade-in"}`}>
            <div>
              <h2 className="text-lg font-semibold">{current.title}</h2>
              {current.hint && <p className="text-sm text-twilight/60">{current.hint}</p>}
            </div>
            {current.body}
          </section>
        )
      )}

      {error && <p className="rounded-lg bg-cyan p-3 text-sm font-medium">{error}</p>}
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" className="btn-secondary flex-1 py-3" onClick={back} disabled={busy || fading}>Back</button>
        )}
        <button className="btn flex-[2] py-3 text-lg" disabled={busy || fading}>{last ? submitLabel : "Continue"}</button>
      </div>
    </form>
  );
}
