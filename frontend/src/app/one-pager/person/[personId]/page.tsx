"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { OnePagerResponse } from "@/lib/types";
import { ErrorState, LoadingState } from "@/components/ui";
import { OnePagerTripSectionView } from "@/components/OnePagerTripSection";

export default function PersonOnePagerPage() {
  const { personId } = useParams<{ personId: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["one-pager-person", personId],
    queryFn: () => api.get<OnePagerResponse>(`/api/people/${personId}/one-pager`),
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error instanceof ApiError ? error.message : "Not found"} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div />
        <button onClick={() => window.print()} className="rounded-md bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white">
          🖨 Print / PDF
        </button>
      </div>

      <h1 className="text-2xl font-extrabold text-sky-700">{data.personName}</h1>
      <p className="mt-0.5 text-xs text-slate-500">
        {[data.title, data.function].filter(Boolean).join(" · ") || "Title / function — TBC"} · MGH CEO Office travel one-pager · generated {new Date().toLocaleDateString()}
      </p>

      <section className="mt-4 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-sky-700">🗓 Trip itinerary</h3>
        {data.itinerary.length ? (
          <table className="mt-2 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-200 p-1">Dates</th>
                <th className="border border-slate-200 p-1">Days</th>
                <th className="border border-slate-200 p-1">City / place</th>
                <th className="border border-slate-200 p-1">Type</th>
                <th className="border border-slate-200 p-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.itinerary.map((r, i) => (
                <tr key={i}>
                  <td className="border border-slate-200 p-1">
                    {r.fromDate ?? "TBC"} – {r.toDate ?? r.fromDate ?? "TBC"}
                  </td>
                  <td className="border border-slate-200 p-1">{r.fromDate ? r.days : "—"}</td>
                  <td className="border border-slate-200 p-1">{r.cityLabel || "—"}</td>
                  <td className="border border-slate-200 p-1">{r.type}</td>
                  <td className="border border-slate-200 p-1">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-xs text-slate-400">No itinerary entries yet.</p>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-sky-700">🌍 Days by country / city — total to date</h3>
        {data.daysByCity.length ? (
          <table className="mt-2 w-full max-w-sm border-collapse text-xs">
            <tbody>
              {data.daysByCity.map((d, i) => (
                <tr key={i}>
                  <td className="border border-slate-200 p-1">{d.cityLabel}</td>
                  <td className="border border-slate-200 p-1">{d.days}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border border-slate-200 p-1">Total</td>
                <td className="border border-slate-200 p-1">{data.totalDays}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-xs text-slate-400">No dated entries yet.</p>
        )}
      </section>

      {data.trips.length ? (
        data.trips.map((t) => <OnePagerTripSectionView key={t.tripId} trip={t} />)
      ) : (
        <section className="mt-4 rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-400">
            {data.personName} is not currently attached to any CEO trip. Add them to a trip&apos;s travelling team in the Planner to populate hotel, transport &amp; meetings here.
          </p>
        </section>
      )}
    </div>
  );
}
