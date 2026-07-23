export const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Rolling 6-month window starting at the first day of `base`'s month — avoids hardcoding a calendar year. */
export function sixMonthWindow(base: Date): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  let y = base.getFullYear();
  let m = base.getMonth();
  for (let i = 0; i < 6; i++) {
    out.push({ year: y, month: m });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isoWeekNumber(d: Date) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const fd = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fd + 3);
  return 1 + Math.round((dt.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

export function mondayOf(d: Date) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysBetweenInclusive(from?: string | null, to?: string | null): number {
  if (!from) return 0;
  const s = new Date(from + "T00:00:00");
  let e = to ? new Date(to + "T00:00:00") : s;
  if (e < s) e = s;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

export const TYPE_BAR_COLOR: Record<string, string> = {
  Trip: "bg-emerald-500",
  Option: "bg-amber-500",
  Vacation: "bg-rose-500",
  Remote: "bg-slate-500",
};
