"use client";

import { useCallback, useEffect, useState } from "react";
import MacroBars from "@/components/MacroBars";
import { analyzeFoodAction } from "@/app/actions";
import { dailyTargets, sumMacros } from "@/lib/macros";
import { createClient } from "@/lib/supabase/client";
import { useProfile, useToday } from "@/lib/hooks";
import type { FoodItem } from "@/lib/types";

type Meal = { id: string; items: FoodItem[]; calories: number; protein_g: number; carbs_g: number; fat_g: number; created_at: string };

const NUM_FIELDS = [
  ["calories", "kcal"],
  ["protein_g", "P (g)"],
  ["carbs_g", "C (g)"],
  ["fat_g", "F (g)"],
] as const;
const EMPTY: FoodItem = { name: "", portion: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Shrink the photo in the browser (max 1024 px, JPEG) so uploads are small and fast. */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Couldn't read that image."));
    img.src = URL.createObjectURL(file);
  });
}

export default function FoodPage() {
  const profile = useProfile();
  const today = useToday();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!today) return;
    const { data } = await createClient().from("food_logs").select("*").eq("date", today).order("created_at").returns<Meal[]>();
    setMeals(data ?? []);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setItems([]);
    try {
      setPhoto(await resizeImage(file));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function analyze() {
    if (!photo) return;
    setBusy(true);
    setError(null);
    const res = await analyzeFoodAction(photo);
    setBusy(false);
    if (res.ok) setItems(res.items.map((i) => ({ ...i, calories: Math.round(i.calories), protein_g: Math.round(i.protein_g), carbs_g: Math.round(i.carbs_g), fat_g: Math.round(i.fat_g) })));
    else setError(res.error);
  }

  const edit = (idx: number, patch: Partial<FoodItem>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  async function saveMeal() {
    const clean = items.filter((i) => i.name.trim());
    if (!clean.length || !today) return setError("Add at least one item with a name.");
    setBusy(true);
    const t = sumMacros(clean);
    const { error: err } = await createClient().from("food_logs").insert({ date: today, items: clean, ...t, calories: Math.round(t.calories) });
    setBusy(false);
    if (err) return setError(err.message);
    setItems([]);
    setPhoto(null);
    load();
  }

  async function deleteMeal(id: string) {
    await createClient().from("food_logs").delete().eq("id", id);
    load();
  }

  if (!profile || !today) return <p className="text-twilight/60">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Food</h1>

      <section className="card">
        <h2 className="mb-3 font-semibold">Today</h2>
        <MacroBars totals={sumMacros(meals)} targets={dailyTargets(profile)} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Log a meal</h2>
        <div className="flex flex-wrap gap-2">
          <label className="btn cursor-pointer">
            📷 Take / upload photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          </label>
          <button className="btn-secondary" onClick={() => setItems([...items, { ...EMPTY }])}>+ Add item manually</button>
        </div>

        {photo && (
          <div className="flex flex-wrap items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
            <img src={photo} alt="Meal preview" className="max-h-48 rounded-xl border border-frost" />
            <button className="btn" onClick={analyze} disabled={busy}>{busy ? "Analyzing…" : "Analyze macros"}</button>
          </div>
        )}

        {error && <p className="rounded-lg bg-cyan p-2 text-sm font-medium">{error}</p>}

        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-twilight/60">Estimates. Adjust anything that looks off before saving.</p>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 rounded-xl border border-frost p-2 sm:grid-cols-7">
                <input aria-label="Food" className="input col-span-3 sm:col-span-2" placeholder="Food" value={it.name} onChange={(e) => edit(idx, { name: e.target.value })} />
                <input aria-label="Portion" className="input col-span-1" placeholder="Portion" value={it.portion} onChange={(e) => edit(idx, { portion: e.target.value })} />
                {NUM_FIELDS.map(([k, label]) => (
                  <label key={k} className="text-xs text-twilight/60">
                    {label}
                    <input type="number" min={0} className="input px-2" value={it[k]} onChange={(e) => edit(idx, { [k]: Number(e.target.value) })} />
                  </label>
                ))}
                <button className="col-span-4 text-sm text-twilight/60 hover:underline sm:col-span-7 sm:text-right" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button className="btn" onClick={saveMeal} disabled={busy}>Save meal</button>
              <span className="text-sm text-teal">{Math.round(sumMacros(items).calories)} kcal total</span>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Today&apos;s meals</h2>
        {meals.length === 0 && <p className="text-sm text-twilight/50">Nothing logged yet.</p>}
        <ul className="divide-y divide-cyan">
          {meals.map((m) => (
            <li key={m.id} className="flex items-start gap-3 py-2">
              <div className="flex-1">
                <div className="font-medium">{m.items.map((i) => i.name).join(", ")}</div>
                <div className="text-sm text-teal">
                  {m.calories} kcal · P {Math.round(m.protein_g)}g · C {Math.round(m.carbs_g)}g · F {Math.round(m.fat_g)}g
                </div>
              </div>
              <button className="text-sm text-twilight/60 hover:underline" onClick={() => deleteMeal(m.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
