"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (err) return setError(err.message);
    setSent(true);
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-1 text-center text-3xl font-bold">
        Gym<span className="text-teal">Nado</span>
      </h1>
      <p className="mb-6 text-center text-twilight/70">Reset your password.</p>
      {sent ? (
        <div className="card fade-in space-y-2 text-center">
          <p className="font-semibold">Check your email</p>
          <p className="text-sm text-twilight/70">
            If an account exists for {email}, we&apos;ve sent a link to reset your password. Open it in this browser.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-cyan p-2 text-sm">{error}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? "…" : "Send reset link"}</button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link className="font-medium text-teal underline" href="/login">Back to log in</Link>
      </p>
    </div>
  );
}
