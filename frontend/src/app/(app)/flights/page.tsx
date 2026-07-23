"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { usePeople } from "@/lib/queries";
import { FlightDto } from "@/lib/types";
import { Button, Card, ErrorState, Input, Label, LoadingState, PageHeader, Select } from "@/components/ui";

function gflight(origin: string, destination: string, dateText: string) {
  let q = "flights";
  if (origin && destination) q = `flights from ${origin} to ${destination}`;
  else if (destination) q = `flights to ${destination}`;
  if (dateText) q += ` on ${dateText}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

export default function FlightsPage() {
  const qc = useQueryClient();
  const { data: people } = usePeople();
  const { data: flights, isLoading, error } = useQuery({
    queryKey: ["flights"],
    queryFn: () => api.get<FlightDto[]>("/api/flights"),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; body: Partial<FlightDto> }) => api.patch(`/api/flights/${v.id}`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flights"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/flights/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flights"] }),
  });
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <PageHeader
        title="Flights on File"
        subtitle="Confirmed / proposed segments — edit inline; click for live Google Flights times."
        actions={<Button variant="amber" onClick={() => setShowAdd((s) => !s)}>{showAdd ? "Close" : "+ Add flight"}</Button>}
      />

      {showAdd && <AddFlightForm onDone={() => setShowAdd(false)} />}

      <Card>
        {isLoading && <LoadingState />}
        {error && <ErrorState message={error instanceof ApiError ? error.message : "Failed to load flights"} />}
        {flights && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="bg-sky-700 text-left text-xs text-white">
                  {["Traveller", "Route", "Date", "Flight", "Depart", "Arrive", "Aircraft", "Times"].map((h) => (
                    <th key={h} className="p-1.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flights.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="p-1">
                      <Select defaultValue={f.travellerPersonId} onChange={(e) => update.mutate({ id: f.id, body: { travellerPersonId: e.target.value } })}>
                        {(people ?? []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="p-1"><Input defaultValue={f.originLabel} placeholder="Origin" onBlur={(e) => update.mutate({ id: f.id, body: { originLabel: e.target.value } })} /></td>
                    <td className="p-1"><Input defaultValue={f.flightDateText} onBlur={(e) => update.mutate({ id: f.id, body: { flightDateText: e.target.value } })} /></td>
                    <td className="p-1"><Input defaultValue={f.flightNo} onBlur={(e) => update.mutate({ id: f.id, body: { flightNo: e.target.value } })} /></td>
                    <td className="p-1"><Input defaultValue={f.departText} onBlur={(e) => update.mutate({ id: f.id, body: { departText: e.target.value } })} /></td>
                    <td className="p-1"><Input defaultValue={f.arriveText} onBlur={(e) => update.mutate({ id: f.id, body: { arriveText: e.target.value } })} /></td>
                    <td className="p-1"><Input defaultValue={f.aircraft} onBlur={(e) => update.mutate({ id: f.id, body: { aircraft: e.target.value } })} /></td>
                    <td className="p-1 text-center">
                      <a
                        href={gflight(f.originLabel, f.destinationLabel, f.flightDateText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-sky-700 hover:underline"
                      >
                        ✈ Google Flights
                      </a>
                      <div>
                        <button className="mt-1 text-xs font-semibold text-rose-600 hover:underline" onClick={() => remove.mutate(f.id)}>
                          remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function AddFlightForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { data: people } = usePeople();
  const [form, setForm] = useState({
    travellerPersonId: "",
    originLabel: "",
    destinationLabel: "",
    flightDateText: "",
    flightNo: "",
    departText: "",
    arriveText: "",
    aircraft: "",
  });
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api.post("/api/flights", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flights"] });
      onDone();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Failed to add flight"),
  });

  return (
    <Card className="mb-4 border-l-4 border-l-amber-400 bg-amber-50/40">
      <h3 className="mb-3 font-bold text-slate-800">Add a flight</h3>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label>Traveller</Label>
          <Select value={form.travellerPersonId} onChange={(e) => setForm({ ...form, travellerPersonId: e.target.value })}>
            <option value="">— select —</option>
            {(people ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>From (city)</Label>
          <Input list="cityList" value={form.originLabel} onChange={(e) => setForm({ ...form, originLabel: e.target.value })} />
        </div>
        <div>
          <Label>To (city)</Label>
          <Input list="cityList" value={form.destinationLabel} onChange={(e) => setForm({ ...form, destinationLabel: e.target.value })} />
        </div>
        <div>
          <Label>Date</Label>
          <Input placeholder="e.g. 23 Jun 2026" value={form.flightDateText} onChange={(e) => setForm({ ...form, flightDateText: e.target.value })} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <div>
          <Label>Flight no / airline</Label>
          <Input value={form.flightNo} onChange={(e) => setForm({ ...form, flightNo: e.target.value })} />
        </div>
        <div>
          <Label>Depart</Label>
          <Input value={form.departText} onChange={(e) => setForm({ ...form, departText: e.target.value })} />
        </div>
        <div>
          <Label>Arrive</Label>
          <Input value={form.arriveText} onChange={(e) => setForm({ ...form, arriveText: e.target.value })} />
        </div>
        <div>
          <Label>Aircraft</Label>
          <Input value={form.aircraft} onChange={(e) => setForm({ ...form, aircraft: e.target.value })} />
        </div>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-rose-600">{err}</p>}
      <div className="mt-3 flex gap-2">
        <Button
          variant="amber"
          disabled={!form.travellerPersonId || create.isPending}
          onClick={() => {
            if (!form.travellerPersonId) {
              setErr("Choose a traveller");
              return;
            }
            create.mutate();
          }}
        >
          Save flight
        </Button>
        <Button onClick={onDone}>Cancel</Button>
      </div>
    </Card>
  );
}
