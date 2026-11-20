"use client";

import { useState } from "react";

// Small single-series SVG charts for the Progress page. One series each, so no legend:
// the card title names it. Hover/focus shows a tooltip; every chart has a table view.
const SERIES = "#0077b6"; // validated against the light surface (dataviz validator: all checks pass)
const GRID = "#e3f6fb";
const W = 600, H = 220, PAD = { l: 44, r: 16, t: 16, b: 28 };

export type Point = { label: string; value: number };

function niceRange(values: number[]): [number, number] {
  const lo = Math.min(...values), hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.15, 1);
  return [Math.floor(lo - pad), Math.ceil(hi + pad)];
}

function TableView({ points, unit, valueLabel }: { points: Point[]; unit: string; valueLabel: string }) {
  return (
    <table className="mt-2 w-full text-sm">
      <thead><tr className="text-left text-twilight/60"><th className="font-medium">Date</th><th className="font-medium">{valueLabel}</th></tr></thead>
      <tbody>{points.map((p, i) => <tr key={i} className="border-t border-cyan"><td className="py-1">{p.label}</td><td>{p.value} {unit}</td></tr>)}</tbody>
    </table>
  );
}

function ChartFrame({ children, points, unit, valueLabel }: { children: React.ReactNode; points: Point[]; unit: string; valueLabel: string }) {
  const [table, setTable] = useState(false);
  return (
    <div>
      {table ? <TableView points={points} unit={unit} valueLabel={valueLabel} /> : children}
      <button className="mt-1 text-xs text-twilight/60 hover:underline" onClick={() => setTable(!table)}>{table ? "Show chart" : "Show as table"}</button>
    </div>
  );
}

/** Line chart with a crosshair that snaps to the nearest point. */
export function LineChart({ points, unit, valueLabel }: { points: Point[]; unit: string; valueLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;
  const [lo, hi] = niceRange(points.map((p) => p.value));
  const x = (i: number) => PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (points.length - 1));
  const y = (v: number) => PAD.t + ((hi - v) * (H - PAD.t - PAD.b)) / (hi - lo);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const last = points.length - 1;
  const h = hover ?? null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setHover(Math.min(last, (h ?? -1) + 1));
    if (e.key === "ArrowLeft") setHover(Math.max(0, (h ?? last + 1) - 1));
  }

  return (
    <ChartFrame points={points} unit={unit} valueLabel={valueLabel}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none outline-none" role="img" aria-label={`${valueLabel} over time`} tabIndex={0}
          onPointerMove={onMove} onPointerLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-twilight/60 text-[11px]">{Math.round(t)}</text>
            </g>
          ))}
          <text x={x(0)} y={H - 8} textAnchor="start" className="fill-twilight/60 text-[11px]">{points[0].label}</text>
          {last > 0 && <text x={x(last)} y={H - 8} textAnchor="end" className="fill-twilight/60 text-[11px]">{points[last].label}</text>}
          {h !== null && <line x1={x(h)} x2={x(h)} y1={PAD.t} y2={H - PAD.b} stroke="#03045e" strokeOpacity={0.25} strokeWidth={1} />}
          <path d={path} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.value)} r={h === i ? 6 : 4} fill={SERIES} stroke="white" strokeWidth={2} />
          ))}
          {/* Direct label on the latest value only. */}
          <text x={x(last)} y={y(points[last].value) - 12} textAnchor={last > 0 ? "end" : "middle"} className="fill-twilight text-[12px] font-semibold" stroke="white" strokeWidth={4} paintOrder="stroke">
            {points[last].value} {unit}
          </text>
        </svg>
        {h !== null && (
          <div className="pointer-events-none absolute top-0 rounded-lg border border-frost bg-white px-2 py-1 text-xs shadow"
            style={{ left: `${(x(h) / W) * 100}%`, transform: `translateX(${h > last / 2 ? "-105%" : "5%"})` }}>
            <div className="font-semibold text-twilight">{points[h].value} {unit}</div>
            <div className="text-twilight/60">{points[h].label}</div>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}

/** Bar chart; each bar is its own hover/focus target. */
export function BarChart({ points, unit, valueLabel }: { points: Point[]; unit: string; valueLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;
  const hi = Math.max(1, ...points.map((p) => p.value));
  const slot = (W - PAD.l - PAD.r) / points.length;
  const bw = Math.max(4, Math.min(28, slot * 0.55)); // thin bars with a clear gap between them
  const y = (v: number) => PAD.t + ((hi - v) * (H - PAD.t - PAD.b)) / hi;
  const base = H - PAD.b;

  return (
    <ChartFrame points={points} unit={unit} valueLabel={valueLabel}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${valueLabel} per week`}>
          {[0, Math.round(hi / 2), hi].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-twilight/60 text-[11px]">{t}</text>
            </g>
          ))}
          {points.map((p, i) => {
            const bx = PAD.l + i * slot + (slot - bw) / 2;
            const top = y(p.value);
            const r = Math.min(4, bw / 2, base - top);
            return (
              <g key={i} tabIndex={0} className="outline-none" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                <rect x={PAD.l + i * slot} y={PAD.t} width={slot} height={base - PAD.t} fill="transparent" />
                {p.value > 0 && (
                  <path d={`M${bx},${base} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + bw - r} Q${bx + bw},${top} ${bx + bw},${top + r} V${base} Z`}
                    fill={SERIES} opacity={hover === null || hover === i ? 1 : 0.55} />
                )}
              </g>
            );
          })}
          <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} stroke="#03045e" strokeOpacity={0.2} />
          <text x={PAD.l} y={H - 8} className="fill-twilight/60 text-[11px]">{points[0].label}</text>
          <text x={W - PAD.r} y={H - 8} textAnchor="end" className="fill-twilight/60 text-[11px]">{points.at(-1)!.label}</text>
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-0 rounded-lg border border-frost bg-white px-2 py-1 text-xs shadow"
            style={{ left: `${((PAD.l + (hover + 0.5) * slot) / W) * 100}%`, transform: `translateX(${hover > points.length / 2 ? "-105%" : "5%"})` }}>
            <div className="font-semibold text-twilight">{points[hover].value} {unit}</div>
            <div className="text-twilight/60">Week of {points[hover].label}</div>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
