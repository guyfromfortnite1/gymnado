"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import { generatePlanAction } from "@/app/actions";
import { todayLocal } from "@/lib/dates";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSaved() {
    setError(null);
    const res = await generatePlanAction(todayLocal());
    if (!res.ok) return setError(`Profile saved, but the plan couldn't be built: ${res.error}`);
    router.push("/plan");
    return "leaving" as const;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Let&apos;s build your plan</h1>
        <p className="text-twilight/70">Answer a few quick questions. You can change any of this later.</p>
      </div>
      {error && <p className="rounded-lg bg-cyan p-3 text-sm font-medium">{error}</p>}
      <ProfileForm submitLabel="Build my plan" busyLabel="Building your plan…" onSaved={onSaved} />
    </div>
  );
}
