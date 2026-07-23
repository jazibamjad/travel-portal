"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { usePeople } from "@/lib/queries";
import { CalendarEntryDto } from "@/lib/types";
import { MN, sixMonthWindow, isoDate, isoWeekNumber, mondayOf, TYPE_BAR_COLOR } from "@/lib/calendar-utils";
import { Card, LoadingState, PageHeader } from "@/components/ui";

type Level = "half" | "quarter" | "month" | "week";
interface ViewState {
  level: Level;
  monthIndex: number;
  quarterIndex: number;
  weekStart?: string;
}

interface Segment {
  label: string;
  days: number;
  onClick?: () => void;
}

function getRange(view: ViewState, months: { year: number; month: number }[]) {
  if (view.level === "half") {
    const first = months[0],
      last = months[5];
    return { start: new Date(first.year, first.month, 1), end: new Date(last.year, last.month + 1, 0) };
  }
  if (view.level === "quarter") {
    const q = view.quarterIndex === 0 ? months.slice(0, 3) : months.slice(3, 6);
    return { start: new Date(q[0].year, q[0].month, 1), end: new Date(q[2].year, q[2].month + 1, 0) };
  }
  if (view.level === "month") {
    const { year, month } = months[view.monthIndex];
    return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) };
  }
  const start = new Date((view.weekStart ?? isoDate(new Date())) + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function weeksOfMonth(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const weeks: { mondayIso: string; label: string; days: number }[] = [];
  let cur = mondayOf(start);
  while (cur <= end) {
    const weekEnd = new Date(cur);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const clipStart = cur < start ? start : cur;
    const clipEnd = weekEnd > end ? end : weekEnd;
    const days = Math.round((clipEnd.getTime() - clipStart.getTime()) / 86400000) + 1;
    weeks.push({ mondayIso: isoDate(cur), label: `W${isoWeekNumber(cur)} · from ${clipStart.getDate()} ${MN[clipStart.getMonth()]}`, days });
    cur = new Date(weekEnd);
    cur.setDate(cur.getDate() + 1);
  }
  return weeks;
}

export default function CalendarPage() {
  const router = useRouter();
  const { data: people } = usePeople();
  const [selected, setSelected] = useState<string[] | null>(null);
  const [view, setView] = useState<ViewState>({ level: "half", monthIndex: 0, quarterIndex: 0 });

  const monthWindow = useMemo(() => sixMonthWindow(new Date()), []);
  const allIds = (people ?? []).map((p) => p.id);
  const activeIds = selected ?? allIds;

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", [...activeIds].sort().join(",")],
    queryFn: () =>
      api.get<{ entries: CalendarEntryDto[] }>(
        `/api/calendar${activeIds.length ? "?" + activeIds.map((id) => `personIds=${id}`).join("&") : ""}`
      ),
    enabled: !!people,
  });

  const { start, end } = getRange(view, monthWindow);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  let segments: Segment[] = [];
  if (view.level === "half") {
    segments = monthWindow.map((m, i) => ({
      label: MN[m.month],
      days: new Date(m.year, m.month + 1, 0).getDate(),
      onClick: () => setView({ level: "month", monthIndex: i, quarterIndex: i < 3 ? 0 : 1 }),
    }));
  } else if (view.level === "quarter") {
    const idxs = view.quarterIndex === 0 ? [0, 1, 2] : [3, 4, 5];
    segments = idxs.map((i) => ({
      label: MN[monthWindow[i].month],
      days: new Date(monthWindow[i].year, monthWindow[i].month + 1, 0).getDate(),
      onClick: () => setView({ ...view, level: "month", monthIndex: i }),
    }));
  } else if (view.level === "month") {
    const { year, month } = monthWindow[view.monthIndex];
    segments = weeksOfMonth(year, month).map((w) => ({
      label: w.label,
      days: w.days,
      onClick: () => setView({ ...view, level: "week", weekStart: w.mondayIso }),
    }));
  } else {
    const s = new Date(view.weekStart + "T00:00:00");
    segments = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(s);
      d.setDate(d.getDate() + i);
      return { label: `${d.getDate()} ${MN[d.getMonth()]}`, days: 1 };
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayInRange = today >= start && today <= end;
  const todayPct = todayInRange ? ((today.getTime() - start.getTime()) / 86400000 / totalDays) * 100 : null;

  const grouped = new Map<string, CalendarEntryDto[]>();
  (data?.entries ?? []).forEach((e) => {
    if (!grouped.has(e.personId)) grouped.set(e.personId, []);
    grouped.get(e.personId)!.push(e);
  });

  const shownPeople = (people ?? []).filter((p) => activeIds.includes(p.id));

  function toggleName(id: string) {
    if (!selected) setSelected([id]);
    else if (selected.includes(id)) setSelected(selected.filter((x) => x !== id));
    else setSelected([...selected, id]);
    if (selected && selected.length + 1 >= allIds.length) setSelected(null);
  }

  const crumbs: { label: string; onClick: () => void }[] = [{ label: "6-month view", onClick: () => setView({ level: "half", monthIndex: 0, quarterIndex: 0 }) }];
  if (view.level !== "half") {
    crumbs.push({ label: `Q${view.quarterIndex + 1}`, onClick: () => setView({ ...view, level: "quarter" }) });
  }
  if (view.level === "month" || view.level === "week") {
    crumbs.push({ label: MN[monthWindow[view.monthIndex].month], onClick: () => setView({ ...view, level: "month" }) });
  }
  if (view.level === "week") {
    crumbs.push({ label: `Week of ${view.weekStart}`, onClick: () => {} });
  }

  return (
    <>
      <PageHeader title="Team Calendar" subtitle="Colour-coded timeline for every person. Click a bar to open that trip's one-pager." />

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-sky-700">Show:</span>
          <button
            onClick={() => setSelected(null)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${!selected ? "border-cyan-400 bg-sky-50 text-sky-700" : "border-slate-300 text-slate-500"}`}
          >
            All
          </button>
          {(people ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => toggleName(p.id)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                activeIds.includes(p.id) && selected ? "border-cyan-400 bg-sky-50 text-sky-700" : "border-slate-300 text-slate-500"
              }`}
            >
              {p.fullName}
            </button>
          ))}
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1 text-slate-300">›</span>}
              <button onClick={c.onClick} className="font-semibold text-sky-700 hover:underline">
                {c.label}
              </button>
            </span>
          ))}
        </div>

        {isLoading || !people ? (
          <LoadingState />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="flex border-b-2 border-slate-200 pl-40">
                {segments.map((s, i) => (
                  <div
                    key={i}
                    style={{ flex: s.days }}
                    onClick={s.onClick}
                    className={`truncate border-l border-slate-200 py-1 text-center text-[11px] font-bold text-slate-500 first:border-l-0 ${
                      s.onClick ? "cursor-pointer hover:bg-sky-50 hover:text-sky-700" : ""
                    }`}
                  >
                    {s.label}
                  </div>
                ))}
              </div>

              {shownPeople.length === 0 && <div className="p-4 text-sm text-slate-400">No people selected.</div>}

              {shownPeople.map((p) => {
                const entries = grouped.get(p.id) ?? [];
                return (
                  <div key={p.id} className="flex items-center border-b border-slate-100 py-1.5">
                    <button
                      onClick={() => router.push(`/one-pager/person/${p.id}`)}
                      className="w-40 shrink-0 truncate pr-2 text-left text-xs font-bold text-slate-700 hover:text-sky-700"
                      title={`Open ${p.fullName}'s one-pager`}
                    >
                      {p.fullName}
                    </button>
                    <div
                      className="relative h-6 flex-1 rounded"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(90deg, transparent, transparent calc(100%/" +
                          segments.length +
                          " - 1px), #e2e8f0 calc(100%/" +
                          segments.length +
                          " - 1px), #e2e8f0 calc(100%/" +
                          segments.length +
                          "))",
                      }}
                    >
                      {todayPct !== null && <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-sky-600" style={{ left: `${todayPct}%` }} />}
                      {entries
                        .filter((e) => e.fromDate)
                        .map((e, i) => {
                          const s = new Date(e.fromDate! + "T00:00:00");
                          let en = e.toDate ? new Date(e.toDate + "T00:00:00") : new Date(s);
                          if (en < s) en = s;
                          if (en < start || s > end) return null;
                          const cs = s < start ? start : s;
                          const ce = en > end ? end : en;
                          const left = ((cs.getTime() - start.getTime()) / 86400000 / totalDays) * 100;
                          const width = Math.max((((ce.getTime() - cs.getTime()) / 86400000 + 1) / totalDays) * 100, 2);
                          let label = e.cityLabel?.split(",")[0] ?? e.type;
                          if (e.type === "Vacation") {
                            const sym = e.approvalStatus === "Approved" ? "✓" : e.approvalStatus === "Rejected" ? "✗" : "⏳";
                            label = `${label} ${sym}`;
                          }
                          return (
                            <div
                              key={i}
                              onClick={() => router.push(e.tripId ? `/one-pager/trip/${e.tripId}` : `/one-pager/person/${p.id}`)}
                              className={`absolute top-0.5 h-5 cursor-pointer overflow-hidden rounded px-1.5 text-[10.5px] font-bold leading-5 text-white shadow ${
                                TYPE_BAR_COLOR[e.type] ?? "bg-sky-500"
                              }`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                              title={`${e.cityLabel ?? ""} (${e.type}) ${e.fromDate} — ${e.toDate ?? e.fromDate}`}
                            >
                              {label}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <Legend color="bg-emerald-500" label="Business trip" />
          <Legend color="bg-rose-500" label="Vacation" />
          <Legend color="bg-amber-500" label="Option / tentative" />
          <Legend color="bg-slate-500" label="Remote" />
          <Legend color="bg-sky-600" label="Today" />
        </div>
      </Card>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className={`inline-block h-3 w-3 rounded-sm ${color}`} /> {label}
    </span>
  );
}
