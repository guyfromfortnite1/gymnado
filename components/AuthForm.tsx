"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fadeOutMs, wait } from "@/lib/motion";

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
    setLeaving(true);
    await wait(fadeOutMs());
    router.replace(mode === "login" ? "/" : "/onboarding");
    router.refresh();
  }

  const isLogin = mode === "login";
  return (
    <div className={`mx-auto mt-10 max-w-sm ${leaving ? "fade-out" : "fade-in"}`}>
      <h1 className="mb-1 text-center text-3xl font-bold">
        Gym<span className="text-teal">Nado</span>
      </h1>
      <p className="mb-6 text-center text-twilight/70">{isLogin ? "Welcome back." : "Create your account."}</p>
      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
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
    </div>
  );
}
