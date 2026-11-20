"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fadeOutMs, wait } from "@/lib/motion";
import { isPremiumStatus } from "@/lib/premium";
import InstallCard from "@/components/InstallCard";
import Logo from "@/components/Logo";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const auth = createClient().auth;
    const { data, error } =
      mode === "login"
        ? await auth.signInWithPassword({ email, password })
        : await auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMessage(error.message);
    if (!data.session) return setMessage("Sign-up needs email confirmation turned off in Supabase (Authentication → Sign In / Providers → Email → Confirm email).");
    // Bring back the theme they chose in Settings (saved on the account).
    const theme = data.user?.user_metadata?.theme;
    if (theme === "dark" || theme === "light") {
      localStorage.setItem("theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    // Ask Free or Premium once: right after sign-up, or on login if they haven't chosen and aren't Premium.
    let next = "/choose-plan";
    if (mode === "login" && data.user?.user_metadata?.plan_chosen) next = "/";
    else if (mode === "login") {
      const { data: sub } = await createClient().from("subscriptions").select("status").maybeSingle<{ status: string }>();
      if (isPremiumStatus(sub?.status)) next = "/";
    }
    setLeaving(true);
    await wait(fadeOutMs());
    router.replace(next);
    router.refresh();
  }

  const isLogin = mode === "login";
  return (
    <div className={`mx-auto mt-10 max-w-sm ${leaving ? "fade-out" : ""}`}>
      <h1 className="mb-1 flex justify-center text-3xl"><Logo size={38} /></h1>
      <p className="mb-6 text-center text-twilight/70">Progress starts here.</p>
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          {isLogin && (
            <Link href="/forgot-password" className="mt-1 inline-block text-sm text-teal hover:underline">Forgot password?</Link>
          )}
        </div>
        {message && <p className="rounded-lg bg-cyan p-2 text-sm">{message}</p>}
        <button className="btn w-full" disabled={busy || leaving}>{busy ? "…" : isLogin ? "Log in" : "Sign up"}</button>
      </form>
      <p className="mt-4 text-center text-sm">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link className="font-medium text-teal underline" href={isLogin ? "/signup" : "/login"}>
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
      {isLogin && <InstallCard className="card mt-6" />}
      <p className="mt-6 text-center text-xs text-twilight/50">
        {!isLogin && "By creating an account you agree to our "}
        <Link className="underline" href="/terms">Terms</Link>{isLogin ? " · " : " and "}
        <Link className="underline" href="/privacy">Privacy Policy</Link>
        {!isLogin && ". GymNado is not medical advice."}
      </p>
    </div>
  );
}
