// Deep blue panel with a shimmer and twinkling diamonds, used wherever Premium is offered.
const SPARKLES = [
  { top: "8%", left: "6%", size: "text-lg", delay: "0s", char: "💎" },
  { top: "14%", left: "82%", size: "text-sm", delay: "0.6s", char: "✦" },
  { top: "62%", left: "90%", size: "text-xl", delay: "1.2s", char: "💎" },
  { top: "78%", left: "12%", size: "text-sm", delay: "1.8s", char: "✦" },
  { top: "40%", left: "50%", size: "text-xs", delay: "0.9s", char: "✧" },
  { top: "86%", left: "60%", size: "text-base", delay: "0.3s", char: "💎" },
  { top: "30%", left: "24%", size: "text-xs", delay: "1.5s", char: "✦" },
];

export default function PremiumSurface({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`premium-surface rounded-2xl p-4 shadow-lg ${className}`}>
      {SPARKLES.map((s, i) => (
        <span key={i} className={`premium-sparkle ${s.size}`} style={{ top: s.top, left: s.left, animationDelay: s.delay }} aria-hidden>
          {s.char}
        </span>
      ))}
      <div className="relative">{children}</div>
    </div>
  );
}

export function PremiumBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-cyan ring-1 ring-cyan/40">💎 Premium</span>;
}
