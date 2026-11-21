"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase/client";
import { isPremiumStatus } from "./premium";
import type { Profile } from "./types";
import { todayLocal } from "./dates";

/** Loads the signed-in user's profile; sends them to onboarding if they don't have one yet. */
export function useProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    createClient()
      .from("profiles")
      .select("*")
      .maybeSingle<Profile>()
      .then(({ data }) => (data ? setProfile(data) : router.replace("/onboarding")));
  }, [router]);

  return profile;
}

/** How many food scans the user has used and whether they're Premium. Null until loaded. */
export function useScanStatus() {
  const [status, setStatus] = useState<{ used: number; premium: boolean } | null>(null);
  const reload = useCallback(async () => {
    const supabase = createClient();
    const [{ count }, { data: sub }] = await Promise.all([
      supabase.from("food_scans").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("status").maybeSingle<{ status: string }>(),
    ]);
    setStatus({ used: count ?? 0, premium: isPremiumStatus(sub?.status) });
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { status, reload };
}

/** The user's local date (YYYY-MM-DD). Null until mounted, so it's never computed on the server. */
export function useToday() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayLocal()), []);
  return today;
}

/** Settings saved on the account (Supabase user metadata), so they follow the user to any device. */
export type Prefs = { auto_log_meals: boolean; auto_complete_workouts: boolean };
export const DEFAULT_PREFS: Prefs = { auto_log_meals: false, auto_complete_workouts: true };

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const m = data.user?.user_metadata ?? {};
      setPrefs({
        auto_log_meals: typeof m.auto_log_meals === "boolean" ? m.auto_log_meals : DEFAULT_PREFS.auto_log_meals,
        auto_complete_workouts: typeof m.auto_complete_workouts === "boolean" ? m.auto_complete_workouts : DEFAULT_PREFS.auto_complete_workouts,
      });
    });
  }, []);
  const setPref = useCallback(async <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
    await createClient().auth.updateUser({ data: { [key]: value } });
  }, []);
  return { prefs, setPref };
}
