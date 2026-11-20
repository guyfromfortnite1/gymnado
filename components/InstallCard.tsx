"use client";

import { useEffect, useState } from "react";

// Chrome/Edge/Android fire this when the site can be installed; not part of the standard DOM types.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** "Install GymNado" card: a button where the browser supports it, Share-menu steps on iPhone/iPad. Hidden once installed. */
export default function InstallCard({ className = "card" }: { className?: string }) {
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
     
    setInstalled(matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true));
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
     
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    addEventListener("beforeinstallprompt", onPrompt);
    addEventListener("appinstalled", onInstalled);
    return () => {
      removeEventListener("beforeinstallprompt", onPrompt);
      removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!ios && !prompt)) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }

  return (
    <section className={`flex flex-wrap items-center gap-3 ${className}`}>
      <span className="text-3xl" aria-hidden>📲</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Install GymNado</p>
        <p className="text-sm text-twilight/70">
          {ios ? <>Tap the Share button <span aria-hidden>⬆️</span> in Safari, then <strong>Add to Home Screen</strong>.</> : "Open it from your home screen or desktop like a real app, full screen."}
        </p>
      </div>
      {!ios && <button className="btn" onClick={install}>Install</button>}
    </section>
  );
}
