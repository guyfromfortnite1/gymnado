import type { Targets } from "@/lib/macros";

const ROWS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
] as const;

export default function MacroBars({ totals, targets }: { totals: Targets; targets: Targets }) {
  return (
    <div className="space-y-3">
      {ROWS.map(({ key, label, unit }) => {
        const pct = Math.min(100, (totals[key] / targets[key]) * 100 || 0);
        const over = totals[key] > targets[key];
        return (
          <div key={key}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className={over ? "font-medium text-teal" : "text-twilight/70"}>
                {Math.round(totals[key])} / {targets[key]} {unit}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-cyan">
              <div className={`h-full rounded-full ${over ? "bg-teal" : "bg-surf"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
