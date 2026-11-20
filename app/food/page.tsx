"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MacroBars from "@/components/MacroBars";
import { mealIdeasAction } from "@/app/actions";
import PremiumLock from "@/components/PremiumLock";
import type { MealIdea } from "@/lib/ai";
import { EMPTY_ITEM, resizeImage, setPendingMeal } from "@/lib/food";
import { dailyTargets, sumMacros } from "@/lib/macros";
import { FREE_SCANS, PREMIUM_PRICE_LABEL } from "@/lib/premium";
import { createClient } from "@/lib/supabase/client";
import { useProfile, useScanStatus, useToday } from "@/lib/hooks";
import type { FoodItem } from "@/lib/types";
import { PageSkeleton } from "@/components/Skeleton";

type Meal = { id: string; items: FoodItem[]; calories: number; protein_g: number; carbs_g: number; fat_g: number; created_at: string };

/** Food tab: today's macros, meal ideas and meals. Scanning and editing a meal happen on /food/log. */
export default function FoodPage() {
  const router = useRouter();
  const profile = useProfile();
  const today = useToday();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const { status: scans } = useScanStatus();
  const [ideas, setIdeas] = useState<MealIdea[] | null>(null);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);

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

  async function getIdeas() {
    if (!today) return;
    setIdeasBusy(true);
    setIdeasError(null);
    const res = await mealIdeasAction(today);
    setIdeasBusy(false);
    if (res.ok) setIdeas(res.ideas);
    else setIdeasError(res.error);
  }

  /** Opens the log page with a photo (scans straight away) or starting items. */
  function openLog(pending: { photo?: string; items?: FoodItem[] }) {
    setPendingMeal(pending);
    router.push("/food/log");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setOpening(true);
    try {
      openLog({ photo: await resizeImage(file) });
    } catch (err) {
      setOpening(false);
      setError((err as Error).message);
    }
  }

  async function deleteMeal(id: string) {
    await createClient().from("food_logs").delete().eq("id", id);
    load();
  }

  if (!profile || !today) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Food</h1>

      <section className="card">
        <h2 className="mb-3 font-semibold">Today</h2>
        <MacroBars totals={sumMacros(meals)} targets={dailyTargets(profile)} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Log a meal</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {outOfScans ? (
            <Link href="/premium" className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-teal p-5 text-center transition duration-200 hover:scale-[1.02]">
              <span className="text-3xl" aria-hidden>📷</span>
              <span className="font-semibold">Free scans used up</span>
              <span className="text-sm text-twilight/60">Upgrade for {PREMIUM_PRICE_LABEL} for unlimited scans</span>
            </Link>
          ) : (
            <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl bg-accent p-5 text-center text-accent-ink transition duration-200 hover:scale-[1.02] hover:bg-accent-hover ${opening ? "opacity-60" : ""}`}>
              <span className="text-3xl" aria-hidden>📷</span>
              <span className="font-semibold">{opening ? "Opening…" : "Scan a meal"}</span>
              <span className="text-sm opacity-75">Take or upload a photo</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} disabled={opening} />
            </label>
          )}
          <button onClick={() => openLog({ items: [{ ...EMPTY_ITEM }] })} className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-frost bg-surface p-5 text-center transition duration-200 hover:scale-[1.02] hover:border-surf">
            <span className="text-3xl" aria-hidden>✍️</span>
            <span className="font-semibold">Add manually</span>
            <span className="text-sm text-twilight/60">Type what you ate</span>
          </button>
        </div>
        {scans && (
          <p className="text-sm text-twilight/60">
            {scans.premium ? "Premium: unlimited photo scans." : <>{scansLeft} of {FREE_SCANS} free photo scans left. <Link href="/premium" className="font-medium text-teal underline">Go Premium</Link></>}
          </p>
        )}
        {error && <p className="rounded-lg bg-cyan p-2 text-sm font-medium">{error}</p>}
      </section>

      {scans?.premium ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 font-semibold">Meal ideas for the rest of today</h2>
            <button className="btn-secondary" onClick={getIdeas} disabled={ideasBusy}>{ideasBusy ? "Thinking…" : ideas ? "New ideas" : "✨ Suggest meals"}</button>
          </div>
          {ideasError && <p className="rounded-lg bg-cyan p-2 text-sm">{ideasError}</p>}
          {ideas && (
            <div className="grid gap-2 sm:grid-cols-3">
              {ideas.map((m, i) => (
                <div key={`${m.name}-${i}`} className="fade-in flex flex-col gap-1 rounded-xl border border-frost p-3 transition duration-200 hover:scale-[1.03] hover:shadow-md" style={{ animationDelay: `${i * 80}ms` }}>
                  <p className="font-semibold">{m.name}</p>
                  <p className="flex-1 text-sm text-twilight/70">{m.description}</p>
                  <p className="text-sm text-teal">{Math.round(m.calories)} kcal · P {Math.round(m.protein_g)} · C {Math.round(m.carbs_g)} · F {Math.round(m.fat_g)}</p>
                  <button
                    className="mt-1 text-left text-sm font-medium text-teal hover:underline"
                    onClick={() => openLog({ items: [{ name: m.name, portion: "1 serving", calories: Math.round(m.calories), protein_g: Math.round(m.protein_g), carbs_g: Math.round(m.carbs_g), fat_g: Math.round(m.fat_g) }] })}
                  >
                    + Add to log
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        scans && (
          <PremiumLock title="Meal ideas that fit your macros">
            Not sure what to eat? Get 3 meal ideas that fit exactly what&apos;s left of today&apos;s calories, protein, carbs and fat.
          </PremiumLock>
        )
      )}

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
