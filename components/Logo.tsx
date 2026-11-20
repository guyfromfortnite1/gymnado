import { useId } from "react";

/** The tornado funnel: stacked, slightly offset rings narrowing to a tail. */
export function TornadoMark({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const id = useId();
  return (
    <svg viewBox="0 0 160 150" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#48cae4" />
          <stop offset="1" stopColor="#0077b6" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`} strokeLinecap="round" strokeWidth="4">
        <ellipse cx="80" cy="10" rx="74" ry="7.5" />
        <ellipse cx="86" cy="29" rx="60" ry="6.5" />
        <ellipse cx="77" cy="48" rx="47" ry="5.8" />
        <ellipse cx="84" cy="67" rx="36" ry="5" />
        <ellipse cx="78" cy="86" rx="26" ry="4.3" />
        <ellipse cx="83" cy="104" rx="17" ry="3.6" />
        <ellipse cx="79" cy="120" rx="10" ry="2.9" />
        <path d="M80 129 Q75 137 80 145" />
      </g>
    </svg>
  );
}

/**
 * The GymNado logo: the wordmark with a tornado spinning down through the middle of it.
 * The letters get a soft halo in the background color so they stay readable over the rings.
 * `size` is the font size in px; `dark` is for dark backgrounds like the nav bar.
 */
export default function Logo({ size = 28, dark = false, className = "" }: { size?: number; dark?: boolean; className?: string }) {
  const halo = dark ? "var(--color-navy)" : "var(--color-page)";
  const textShadow = `0 0 3px ${halo}, 0 0 3px ${halo}, 0 0 6px ${halo}`;
  return (
    <span
      className={`relative inline-flex items-center font-extrabold leading-none tracking-tight ${className}`}
      style={{ fontSize: size, paddingBlock: size * 0.6 }}
      aria-label="GymNado"
      role="img"
    >
      {/* Sized from the font size so it reaches ~0.55em above and below the letters, inside the padding. */}
      <TornadoMark className="pointer-events-none absolute left-1/2 top-1/2" style={{ height: size * 2.1, transform: "translate(-50%, -55%)" }} />
      <span className={`relative ${dark ? "text-white" : "text-twilight"}`} style={{ textShadow }}>Gym</span>
      <span className={`relative ${dark ? "text-surf" : "text-teal"}`} style={{ textShadow }}>Nado</span>
    </span>
  );
}
