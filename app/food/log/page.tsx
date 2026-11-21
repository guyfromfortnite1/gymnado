"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { analyzeFoodAction } from "@/app/actions";
import { PageSkeleton } from "@/components/Skeleton";
import { EMPTY_ITEM, resizeImage, takePendingMeal } from "@/lib/food";
import { usePrefs, useScanStatus, useToday } from "@/lib/hooks";
import { sumMacros } from "@/lib/macros";
import { wait } from "@/lib/motion";
import { FREE_SCANS, PREMIUM_PRICE_LABEL } from "@/lib/premium";
import { createClient } from "@/lib/supabase/client";
import type { FoodItem } from "@/lib/types";

const NUM_FIELDS = [
  ["calories", "kcal"],
  ["protein_g", "P (g)"],
  ["carbs_g", "C (g)"],
  ["fat_g", "F (g)"],
] as const;

/** Log a meal: scan a photo (blue scanner + percentage), review the macros, save, then back to the Food tab. */
export default function LogMealPage() {
  const router = useRouter();
  const today = useToday();
  const { status: scans, reload: reloadScans } = useScanStatus();
  const [ready, setReady] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);
  const { prefs } = usePrefs();
  const [justScanned, setJustScanned] = useState(false);
  const [autoLogged, setAutoLogged] = useState(false);

  const outOfScans = !!scans && !scans.premium && scans.used >= FREE_SCANS;

  // Pick up the photo or items handed over by the Food tab.
  useEffect(() => {
    const pending = takePendingMeal();
     
    if (pending?.photo) setPhoto(pending.photo);
    if (pending?.items) setItems(pending.items);
    setReady(true);
     
  }, []);

  // While the AI works, the percentage eases toward 95%; it jumps to 100% when the answer arrives.
  useEffect(() => {
    if (!scanning) return;
    const id = setInterval(() => setProgress((p) => (p < 95 ? p + (95 - p) * 0.04 : p)), 100);
    return () => clearInterval(id);
  }, [scanning]);

  const analyze = useCallback(async (image: string) => {
    setBusy(true);
    setError(null);
    setItems([]);
    setProgress(0);
    setScanning(true);
    const res = await analyzeFoodAction(image);
    if (res.ok) {
      setProgress(100);
      await wait(600); // let "100%" show for a moment
    }
    setScanning(false);
    setBusy(false);
    reloadScans();
    if (!res.ok) return setError(res.error);
    const found = res.items.map((i) => ({ ...i, calories: Math.round(i.calories), protein_g: Math.round(i.protein_g), carbs_g: Math.round(i.carbs_g), fat_g: Math.round(i.fat_g) }));
    setItems(found);
    setJustScanned(true);
  }, [reloadScans]);

  // A photo from the Food tab starts scanning straight away (unless the free scans are used up).
  useEffect(() => {
    if (!photo || !scans || autoStarted.current || items.length) return;
    autoStarted.current = true;
     
    if (!outOfScans) analyze(photo);
  }, [photo, scans, outOfScans, items.length, analyze]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const img = await resizeImage(file);
      setPhoto(img);
      if (!outOfScans) analyze(img);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const edit = (idx: number, patch: Partial<FoodItem>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  async function saveMeal(list: FoodItem[] = items, automatic = false) {
    const clean = list.filter((i) => i.name.trim());
    if (!clean.length || !today) return setError("Add at least one item with a name.");
    setBusy(true);
    if (automatic) setAutoLogged(true);
    const t = sumMacros(clean);
    const { error: err } = await createClient().from("food_logs").insert({ date: today, items: clean, ...t, calories: Math.round(t.calories) });
    if (err) {
      setBusy(false);
      return setError(err.message);
    }
    if (automatic) await wait(1400); // show "Logged automatically" for a moment
    router.push("/food");
  }
  // Settings → Auto-log scanned meals: save straight away after a scan and head back to the Food tab.
  const autoLog = useEffectEvent((list: FoodItem[]) => {
    if (prefs?.auto_log_meals) saveMeal(list, true);
  });
  useEffect(() => {
    if (!justScanned) return;
    setJustScanned(false);
    autoLog(items);
  }, [justScanned, items]);

  if (!ready || !today || !scans) return <PageSkeleton cards={1} />;
  const total = sumMacros(items);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/food" className="rounded-lg px-2 py-1 text-sm font-medium text-teal transition hover:bg-cyan">← Food</Link>
        <h1 className="flex-1 text-2xl font-bold">Log a meal</h1>
      </div>

      {photo ? (
        <section className="card space-y-3">
          <div className="relative mx-auto w-fit overflow-hidden rounded-xl border border-frost">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
            <img src={photo} alt="Your meal" className={`block max-h-80 transition ${scanning ? "brightness-90" : ""}`} />
            {scanning && (
              <div className="scan-grid absolute inset-0 bg-navy/20" aria-hidden>
                <div className="scan-line" />
              </div>
            )}
          </div>
          {scanning && (
            <div className="mx-auto max-w-sm space-y-1" role="status">
              <div className="flex justify-between text-sm font-medium text-teal">
                <span>Analyzing food…</span>
                <span>{Math.floor(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cyan">
                <div className="h-full rounded-full bg-surf transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {!scanning && (
            <label className="block cursor-pointer text-center text-sm font-medium text-teal hover:underline">
              📷 Use a different photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
            </label>
          )}
        </section>
      ) : (
        items.length === 0 && (
          <section className="card space-y-3 text-center">
            <p className="text-twilight/70">Take or upload a photo of your meal, or add the items yourself.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <label className="btn cursor-pointer">
                📷 Take / upload photo
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
              </label>
              <button className="btn-secondary" onClick={() => setItems([{ ...EMPTY_ITEM }])}>+ Add manually</button>
            </div>
          </section>
        )
      )}

      {outOfScans && photo && !items.length && (
        <div className="fade-in space-y-2 rounded-xl border border-teal p-3">
          <p className="font-semibold">You&apos;ve used all {FREE_SCANS} free scans</p>
          <p className="text-sm text-twilight/70">Get unlimited photo scans with Premium, or add the items yourself.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/premium" className="btn">Upgrade for {PREMIUM_PRICE_LABEL}</Link>
            <button className="btn-secondary" onClick={() => setItems([{ ...EMPTY_ITEM }])}>+ Add manually</button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-cyan p-3 text-sm font-medium">{error}</p>}

      {autoLogged && (
        <div className="card fade-in flex items-center gap-3 border-teal" role="status">
          <span className="text-2xl" aria-hidden>✅</span>
          <span className="flex-1">
            <span className="block font-semibold">Logged automatically</span>
            <span className="block text-sm text-twilight/60">{Math.round(sumMacros(items).calories)} kcal added to today. Taking you back to Food…</span>
          </span>
        </div>
      )}

      {items.length > 0 && (
        <section className="card fade-in space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Your meal</h2>
            <p className="text-sm text-twilight/60">{photo ? "Estimates. Adjust anything that looks off before saving." : "Add what you ate."}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-cyan/60 p-3 text-center">
            {[
              ["kcal", total.calories],
              ["Protein", total.protein_g],
              ["Carbs", total.carbs_g],
              ["Fat", total.fat_g],
            ].map(([label, v]) => (
              <div key={label}>
                <div className="text-xl font-bold">{Math.round(v as number)}{label === "kcal" ? "" : "g"}</div>
                <div className="text-xs text-twilight/60">{label}</div>
              </div>
            ))}
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 rounded-xl border border-frost p-2 sm:grid-cols-6">
              <input aria-label="Food" className="input col-span-3 sm:col-span-4" placeholder="Food" value={it.name} onChange={(e) => edit(idx, { name: e.target.value })} />
              <input aria-label="Portion" className="input col-span-1 sm:col-span-2" placeholder="Portion" value={it.portion} onChange={(e) => edit(idx, { portion: e.target.value })} />
              {NUM_FIELDS.map(([k, label]) => (
                <label key={k} className="text-xs text-twilight/60 sm:col-span-1">
                  {label}
                  <input type="number" min={0} className="input px-2" value={it[k]} onChange={(e) => edit(idx, { [k]: Number(e.target.value) })} />
                </label>
              ))}
              <button className="col-span-4 text-sm text-twilight/60 hover:underline sm:col-span-2 sm:self-end sm:text-right" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                Remove
              </button>
            </div>
          ))}
          <button className="text-sm font-medium text-teal hover:underline" onClick={() => setItems([...items, { ...EMPTY_ITEM }])}>+ Add another item</button>
          <div className="flex gap-2">
            <button className="btn flex-1 py-3 text-lg" onClick={() => saveMeal()} disabled={busy || scanning}>{busy ? "Saving…" : "✓ Save meal"}</button>
            <Link href="/food" className="btn-secondary py-3">Cancel</Link>
          </div>
        </section>
      )}
    </div>
  );
}
