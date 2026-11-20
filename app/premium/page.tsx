"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { manageBillingAction, startCheckoutAction } from "@/app/actions";
import { useScanStatus } from "@/lib/hooks";
import { FREE_SCANS, PREMIUM_PRICE_LABEL } from "@/lib/premium";

export default function PremiumPage() {
  const { status, reload } = useScanStatus();
  const [notice, setNotice] = useState<"success" | "canceled" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe sends people back with ?success=1 or ?canceled=1.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setNotice(q.has("success") ? "success" : q.has("canceled") ? "canceled" : null);
  }, []);

  // After paying, Stripe's webhook activates Premium a moment later: check every 2 s for up to 30 s.
  useEffect(() => {
    if (notice !== "success" || status?.premium) return;
    const started = Date.now();
    const id = setInterval(() => (Date.now() - started > 30_000 ? clearInterval(id) : reload()), 2000);
    return () => clearInterval(id);
  }, [notice, status?.premium, reload]);

  async function go(action: () => ReturnType<typeof startCheckoutAction>) {
    setBusy(true);
    setError(null);
    const res = await action();
    if (res.ok) return window.location.assign(res.url);
    setBusy(false);
    setError(res.error);
  }

  if (!status) return <p className="text-twilight/60">Loading…</p>;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">
        Gym<span className="text-teal">Nado</span> Premium
      </h1>

      {notice === "success" && !status.premium && (
        <p className="card flex items-center gap-3 border-surf" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan border-t-teal" aria-hidden />
          Payment received. Activating your Premium…
        </p>
      )}
      {notice === "canceled" && <p className="rounded-lg bg-cyan p-3 text-sm">Checkout canceled. You haven&apos;t been charged.</p>}

      {status.premium ? (
        <section className="card space-y-3 border-teal">
          <p className="text-lg font-semibold">✓ You&apos;re Premium</p>
          <p className="text-twilight/70">Unlimited food photo scans and sport-specific training. Thanks for supporting GymNado!</p>
          {notice === "success" && <Link href="/" className="btn w-full">Continue to GymNado →</Link>}
          <button className="btn-secondary w-full" onClick={() => go(manageBillingAction)} disabled={busy}>
            {busy ? "Opening…" : "Manage or cancel subscription"}
          </button>
        </section>
      ) : (
        <section className="card space-y-4">
          <div>
            <p className="text-3xl font-bold">{PREMIUM_PRICE_LABEL.replace("/month", "")}<span className="text-base font-normal text-twilight/60"> / month</span></p>
            <p className="text-twilight/70">Cancel anytime.</p>
          </div>
          <ul className="space-y-1">
            <li>✓ Unlimited food photo scans</li>
            <li>✓ Sport-specific training for your sports</li>
            <li>✓ Instant calories and macros from any meal</li>
          </ul>
          <p className="rounded-lg bg-cyan p-3 text-sm">
            You&apos;ve used {Math.min(status.used, FREE_SCANS)} of your {FREE_SCANS} free scans.
          </p>
          <button className="btn w-full py-3 text-lg" onClick={() => go(() => startCheckoutAction())} disabled={busy}>
            {busy ? "Opening checkout…" : `Upgrade for ${PREMIUM_PRICE_LABEL}`}
          </button>
          <p className="text-center text-xs text-twilight/50">Secure payment by Stripe.</p>
        </section>
      )}
      {error && <p className="rounded-lg bg-cyan p-3 text-sm font-medium">{error}</p>}
    </div>
  );
}
