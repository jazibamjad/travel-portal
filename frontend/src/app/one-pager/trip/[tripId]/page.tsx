"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { OnePagerTripSection } from "@/lib/types";
import { ErrorState, LoadingState } from "@/components/ui";
import { OnePagerTripSectionView } from "@/components/OnePagerTripSection";

export default function TripOnePagerPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["one-pager-trip", tripId],
    queryFn: () => api.get<OnePagerTripSection>(`/api/trips/${tripId}/one-pager`),
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
      <h1 className="text-2xl font-extrabold text-sky-700">{data.destinationLabel}</h1>
      <p className="mt-0.5 text-xs text-slate-500">Trip one-pager · generated {new Date().toLocaleDateString()}</p>
      <OnePagerTripSectionView trip={data} />
    </div>
  );
}
