"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ProfileForm from "@/components/ProfileForm";
import { generatePlanAction } from "@/app/actions";
import { todayLocal } from "@/lib/dates";
import { useProfile } from "@/lib/hooks";

export default function ProfilePage() {
  const router = useRouter();
  const profile = useProfile();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    const res = await generatePlanAction(todayLocal());
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/plan");
  }

  if (!profile) return <p className="text-twilight/60">Loading…</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      {saved && (
        <div className="card flex flex-wrap items-center gap-3 border-surf">
          <p className="flex-1">Saved. Rebuild your plan with the new settings? Upcoming workouts will be replaced; completed ones are kept.</p>
          <button className="btn" onClick={regenerate} disabled={busy}>{busy ? "Building…" : "Regenerate plan"}</button>
        </div>
      )}
      {error && <p className="rounded-lg bg-cyan p-3 text-sm font-medium">{error}</p>}
      <ProfileForm initial={profile} submitLabel="Save changes" busyLabel="Saving…" onSaved={() => { setSaved(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
    </div>
  );
}
