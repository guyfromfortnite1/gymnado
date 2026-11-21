"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import InstallCard from "@/components/InstallCard";
import ProfileForm from "@/components/ProfileForm";
import { generatePlanAction } from "@/app/actions";
import { todayLocal } from "@/lib/dates";
import { useProfile } from "@/lib/hooks";
import { PageSkeleton } from "@/components/Skeleton";
import { signOutToLogin } from "@/lib/auth";

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

  if (!profile) return <PageSkeleton />;
  return (
    <div className="space-y-4">
      {/* The tab bar is hidden while editing the plan answers, so give a way back. */}
      <div className="flex items-center gap-3">
        <Link href="/" className="rounded-lg px-2 py-1 text-sm font-medium text-teal transition hover:bg-cyan">← Back</Link>
        <h1 className="flex-1 text-2xl font-bold">Profile</h1>
      </div>
      <InstallCard />
      {saved && (
        <div className="card flex flex-wrap items-center gap-3 border-surf">
          <p className="flex-1">Saved. Rebuild your plan with the new settings? Upcoming workouts will be replaced; completed ones are kept.</p>
          <button className="btn" onClick={regenerate} disabled={busy}>{busy ? "Building…" : "Regenerate plan"}</button>
        </div>
      )}
      {error && <p className="rounded-lg bg-cyan p-3 text-sm font-medium">{error}</p>}
      <ProfileForm
        layout="list"
        initial={profile}
        submitLabel="Save changes"
        busyLabel="Saving…"
        onSaved={() => { setSaved(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      />
      <button className="btn-secondary w-full py-3" onClick={signOutToLogin}>Sign out</button>
    </div>
  );
}
