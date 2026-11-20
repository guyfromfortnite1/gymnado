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
