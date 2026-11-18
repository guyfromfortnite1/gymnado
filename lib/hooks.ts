"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./supabase/client";
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

/** The user's local date (YYYY-MM-DD). Null until mounted, so it's never computed on the server. */
export function useToday() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayLocal()), []);
  return today;
}
