"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePeople } from "@/lib/queries";
import { KpiResponse } from "@/lib/types";
import { Card, LoadingState, PageHeader } from "@/components/ui";

export default function OverviewPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ["kpis"],
    queryFn: () => api.get<KpiResponse>("/api/overview/kpis"),
  });
  const { data: people } = usePeople();

  return (
    <>
      <PageHeader title="Overview" subtitle="At-a-glance view of upcoming travel and team planning." />

      {isLoading || !kpis ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard n={kpis.upcomingTrips} label="Upcoming CEO trips" />
          <KpiCard
            n={kpis.nextDepartureCity ?? "—"}
            label={kpis.nextDepartureDate ? `Next departure · ${kpis.nextDepartureDate}` : "Next departure"}
          />
          <KpiCard n={kpis.totalTravelDays} label="Total CEO travel days" />
          <KpiCard n={kpis.meetingsPlanned} label="Meetings planned" />
        </div>
      )}

      <Card className="mt-6">
        <h2 className="mb-1 text-base font-bold text-sky-700">One-pagers</h2>
        <p className="mb-3 text-xs text-slate-500">
          Click a name for a printable brief: itinerary, days-per-country, meetings &amp; materials.
        </p>
        <div className="flex flex-wrap gap-2">
          {(people ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/one-pager/person/${p.id}`}
              target="_blank"
              className="rounded-md border border-sky-300 bg-white px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50"
            >
              📄 {p.fullName}
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/calendar" className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300">
          <h3 className="font-bold text-sky-700">Team Calendar →</h3>
          <p className="mt-1 text-sm text-slate-500">Half-year timeline, drill into a quarter, month or week.</p>
        </Link>
        <Link href="/planner" className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300">
          <h3 className="font-bold text-sky-700">Trip Planner →</h3>
          <p className="mt-1 text-sm text-slate-500">Create trips, pick meetings, assign materials.</p>
        </Link>
      </div>
    </>
  );
}

function KpiCard({ n, label }: { n: string | number; label: string }) {
  return (
    <Card className="border-l-4 border-l-cyan-400">
      <div className="text-2xl font-extrabold text-sky-700">{n}</div>
      <div className="mt-1 text-[11px] font-semibold text-slate-500">{label}</div>
    </Card>
  );
}
