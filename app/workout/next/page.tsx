"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import { todayLocal } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

/** Quick start (header ▶ button): opens today's or the next upcoming planned workout. */
export default function NextWorkoutPage() {
  const router = useRouter();
  const [none, setNone] = useState(false);

  useEffect(() => {
    createClient()
      .from("scheduled_workouts")
      .select("id")
      .eq("status", "planned")
      .gte("date", todayLocal())
      .order("date")
      .limit(1)
      .maybeSingle<{ id: string }>()
      .then(({ data }) => (data ? router.replace(`/workout/${data.id}`) : setNone(true)));
  }, [router]);

  if (!none) return <PageSkeleton cards={1} />;
  return (
    <div className="card mx-auto max-w-md space-y-3 text-center">
      <p className="text-4xl" aria-hidden>🏁</p>
      <p className="font-semibold">No upcoming workouts</p>
      <p className="text-sm text-twilight/70">Build or regenerate your plan to get new workouts on your schedule.</p>
      <div className="flex justify-center gap-2">
        <Link href="/plan" className="btn">Go to plan</Link>
        <Link href="/" className="btn-secondary">Back</Link>
      </div>
    </div>
  );
}
