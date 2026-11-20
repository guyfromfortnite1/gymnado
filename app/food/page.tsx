"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MacroBars from "@/components/MacroBars";
import { analyzeFoodAction } from "@/app/actions";
import { dailyTargets, sumMacros } from "@/lib/macros";
import { wait } from "@/lib/motion";
import { FREE_SCANS, PREMIUM_PRICE_LABEL } from "@/lib/premium";
import { createClient } from "@/lib/supabase/client";
import { useProfile, useScanStatus, useToday } from "@/lib/hooks";
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
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { status: scans, reload: reloadScans } = useScanStatus();
  const scansLeft = scans ? Math.max(0, FREE_SCANS - scans.used) : 0;
  const outOfScans = !!scans && !scans.premium && scansLeft === 0;

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

  // While the AI works, the percentage eases toward 95%; it jumps to 100% when the answer arrives.
  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => setProgress((p) => (p < 95 ? p + (95 - p) * 0.04 : p)), 100);
    return () => clearInterval(id);
  }, [scanning]);

  async function analyze() {
    if (!photo) return;
    setBusy(true);
    setError(null);
    setItems([]);
    setProgress(0);
    setScanning(true);
    const res = await analyzeFoodAction(photo);
    if (res.ok) {
      setProgress(100);
      await wait(600); // let "100%" show for a moment
    }
    setScanning(false);
    setBusy(false);
    reloadScans();
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

        {scans && (
          <p className="text-sm text-twilight/60">
            {scans.premium ? "Premium: unlimited photo scans." : <>{scansLeft} of {FREE_SCANS} free photo scans left. <Link href="/premium" className="font-medium text-teal underline">Go Premium</Link></>}
          </p>
        )}

        {photo && (
          <div className="space-y-3">
            <div className="relative w-fit overflow-hidden rounded-xl border border-frost">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
              <img src={photo} alt="Meal preview" className={`block max-h-72 transition ${scanning ? "brightness-90" : ""}`} />
              {scanning && (
                <div className="scan-grid absolute inset-0 bg-twilight/20" aria-hidden>
                  <div className="scan-line" />
                </div>
              )}
            </div>
            {scanning ? (
              <div className="max-w-sm space-y-1" role="status">
                <div className="flex justify-between text-sm font-medium text-teal">
                  <span>Analyzing food…</span>
                  <span>{Math.floor(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-cyan">
                  <div className="h-full rounded-full bg-surf transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : outOfScans ? (
              <div className="fade-in max-w-sm space-y-2 rounded-xl border border-teal p-3">
                <p className="font-semibold">You&apos;ve used all {FREE_SCANS} free scans</p>
                <p className="text-sm text-twilight/70">Get unlimited photo scans with Premium, or add items manually.</p>
                <Link href="/premium" className="btn w-full">Upgrade for {PREMIUM_PRICE_LABEL}</Link>
              </div>
            ) : (
              items.length === 0 && <button className="btn" onClick={analyze} disabled={busy || !scans}>Analyze macros</button>
            )}
          </div>
        )}

        {error && <p className="rounded-lg bg-cyan p-2 text-sm font-medium">{error}</p>}

        {items.length > 0 && (
          <div className="fade-in space-y-2">
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
              <button className="btn" onClick={saveMeal} disabled={busy || scanning}>Save meal</button>
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
