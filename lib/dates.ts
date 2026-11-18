// Dates are plain "YYYY-MM-DD" strings in the user's local calendar.
// Arithmetic is done in UTC so it never shifts across time zones.

const toUTC = (d: string) => new Date(`${d}T00:00:00Z`);

export const todayLocal = () => new Date().toLocaleDateString("en-CA"); // browser-only: en-CA formats as YYYY-MM-DD
export const addDays = (d: string, n: number) => {
  const t = toUTC(d);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
export const weekday = (d: string) => toUTC(d).getUTCDay();
export const startOfWeek = (d: string) => addDays(d, -weekday(d)); // weeks start Sunday
export const formatShort = (d: string) =>
  toUTC(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Assign plan days, in order, to the user's training weekdays for the next `weeks` weeks. */
export function buildSchedule(dayCount: number, trainingDays: number[], start: string, weeks = 4) {
  const out: { dayIndex: number; date: string }[] = [];
  let next = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(start, i);
    if (trainingDays.includes(weekday(date))) {
      out.push({ dayIndex: next % dayCount, date });
      next++;
    }
  }
  return out;
}
