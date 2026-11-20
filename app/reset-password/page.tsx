"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fadeOutMs, wait } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

// The emailed reset link lands here with a one-time code; the Supabase browser client
// exchanges it for a session on load, then the user picks a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [linkValid, setLinkValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setLinkValid(!!data.session));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.updateUser({ password });
    if (err) {
      setBusy(false);
      return setError(err.message);
    }
    setLeaving(true);
    await wait(fadeOutMs());
    router.replace("/");
    router.refresh();
  }

  return (
    <div className={`mx-auto mt-10 max-w-sm ${leaving ? "fade-out" : ""}`}>
      <h1 className="mb-1 flex justify-center text-3xl"><Logo size={44} /></h1>
      <p className="mb-6 text-center text-twilight/70">Choose a new password.</p>
      {linkValid === null ? (
        <p className="text-center text-twilight/60">Checking your link…</p>
      ) : linkValid ? (
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input id="password" type="password" required minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm new password</label>
            <input id="confirm" type="password" required minLength={6} className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-cyan p-2 text-sm">{error}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? "…" : "Save new password"}</button>
        </form>
      ) : (
        <div className="card space-y-2 text-center">
          <p className="font-semibold">This reset link is invalid or has expired</p>
          <p className="text-sm text-twilight/70">Links only work once, and only in the browser where you asked for them.</p>
          <Link className="font-medium text-teal underline" href="/forgot-password">Send a new link</Link>
        </div>
      )}
    </div>
  );
}
