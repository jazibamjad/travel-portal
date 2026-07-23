"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { usePeople } from "@/lib/queries";
import { TripDto } from "@/lib/types";
import { PROJECTS, ENTITIES, TRIP_STATUSES } from "@/lib/constants";
import { Badge, Button, Card, EmptyState, ErrorState, Input, Label, LoadingState, PageHeader, Select } from "@/components/ui";
import { daysBetweenInclusive } from "@/lib/calendar-utils";

const STATUS_TONE: Record<string, string> = { Confirmed: "Trip", Option: "Option", Tentative: "Remote" };

export default function PlannerPage() {
  const qc = useQueryClient();
  const { data: people } = usePeople();
  const [q, setQ] = useState("");
  const [personId, setPersonId] = useState("");
  const [project, setProject] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (personId) params.set("personId", personId);
  if (project) params.set("project", project);

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ["trips", q, personId, project],
    queryFn: () => api.get<TripDto[]>(`/api/trips?${params.toString()}`),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = (t: TripDto) => {
    const end = t.toDate ?? t.fromDate;
    return end ? new Date(end + "T00:00:00") < today : false;
  };
  const upcoming = (trips ?? []).filter((t) => !isPast(t));
  const past = (trips ?? []).filter((t) => isPast(t));

  const deleteTrip = useMutation({
    mutationFn: (id: string) => api.delete(`/api/trips/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  return (
    <>
      <PageHeader
        title="Trip Planner"
        subtitle="Create CEO trips, then open a trip to pick meetings, priorities, agendas and materials."
        actions={
          <>
            <Button variant="amber" onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? "Close form" : "+ Add trip"}
            </Button>
            <Button onClick={() => setShowBulk((s) => !s)}>{showBulk ? "Close bulk add" : "+ Bulk add trips"}</Button>
          </>
        }
      />

      {showCreate && <CreateTripForm onDone={() => setShowCreate(false)} />}
      {showBulk && <BulkTripForm onDone={() => setShowBulk(false)} />}

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-sky-700">🔎 Find trips:</span>
          <Input placeholder="search city / project / person / notes" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Select value={personId} onChange={(e) => setPersonId(e.target.value)} className="max-w-[180px]">
            <option value="">All people</option>
            {(people ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </Select>
          <Select value={project} onChange={(e) => setProject(e.target.value)} className="max-w-[200px]">
            <option value="">All projects</option>
            {PROJECTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
          {(q || personId || project) && (
            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setPersonId("");
                setProject("");
              }}
            >
              clear
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4">
        {isLoading && <LoadingState />}
        {error && <ErrorState message={error instanceof ApiError ? error.message : "Failed to load trips"} />}
        {trips && trips.length === 0 && <EmptyState>No trips yet — add one above.</EmptyState>}

        {upcoming.length > 0 && <h3 className="mb-2 mt-1 text-sm font-extrabold text-sky-700">▶ Upcoming ({upcoming.length})</h3>}
        {upcoming.map((t) => (
          <TripCard key={t.id} trip={t} onDelete={() => deleteTrip.mutate(t.id)} />
        ))}

        {past.length > 0 && <h3 className="mb-2 mt-6 text-sm font-extrabold text-slate-400">◀ Past ({past.length})</h3>}
        {past.map((t) => (
          <TripCard key={t.id} trip={t} onDelete={() => deleteTrip.mutate(t.id)} past />
        ))}
      </div>
    </>
  );
}

function TripCard({ trip, onDelete, past }: { trip: TripDto; onDelete: () => void; past?: boolean }) {
  const days = daysBetweenInclusive(trip.fromDate, trip.toDate);
  return (
    <Card className={`mb-3 border-l-4 border-l-sky-600 ${past ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {trip.project && <Badge>{trip.project}</Badge>}
            {trip.entity && <Badge tone="Remote">{trip.entity}</Badge>}
            <Link href={`/planner/${trip.id}`} className="text-base font-bold text-slate-800 hover:text-sky-700">
              {trip.destinationLabel}
            </Link>
            <Badge tone={STATUS_TONE[trip.status]}>{trip.status}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            📅 {trip.fromDate ?? "TBC"} – {trip.toDate ?? "TBC"} {trip.fromDate && <b className="text-slate-700">· {days} day(s)</b>}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            🏨 {trip.hotel || "hotel TBC"} · 🚗 {trip.transport || "transport TBC"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            🧳 Travelling with Alex: {trip.travellerNames.length ? trip.travellerNames.join(", ") : "—"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">🤝 {trip.meetings.length} meeting(s) planned</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/planner/${trip.id}`}>
            <Button>Open →</Button>
          </Link>
          <Button variant="danger" onClick={onDelete}>
            Remove
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CreateTripForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { data: people } = usePeople();
  const [form, setForm] = useState({
    project: "",
    entity: "",
    destinationLabel: "",
    fromDate: "",
    toDate: "",
    status: "Option" as (typeof TRIP_STATUSES)[number],
    hotel: "",
    transport: "",
  });
  const [travellers, setTravellers] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.post<TripDto>("/api/trips", {
        ...form,
        fromDate: form.fromDate || null,
        toDate: form.toDate || null,
        travellerIds: travellers,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
      onDone();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Failed to create trip"),
  });

  return (
    <Card className="mb-4 border-l-4 border-l-amber-400 bg-amber-50/40">
      <h3 className="mb-3 font-bold text-slate-800">Add a CEO trip</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Project</Label>
          <Input list="projectList" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
          <datalist id="projectList">
            {PROJECTS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div>
          <Label>Entity</Label>
          <Input list="entityList" value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value })} />
          <datalist id="entityList">
            {ENTITIES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
            {TRIP_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <Label>
            Destination <span className="text-rose-500">*</span>
          </Label>
          <Input list="cityList" placeholder="e.g. Prague, Czechia" value={form.destinationLabel} onChange={(e) => setForm({ ...form, destinationLabel: e.target.value })} />
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" min={form.fromDate} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Hotel</Label>
          <Input value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} />
        </div>
        <div>
          <Label>Transportation</Label>
          <Input value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} />
        </div>
      </div>
      <div className="mt-3">
        <Label>Team accompanying Alex</Label>
        <div className="flex flex-wrap gap-2">
          {(people ?? [])
            .filter((p) => !p.isCeo)
            .map((p) => (
              <label key={p.id} className="flex items-center gap-1.5 rounded-full border border-cyan-300 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700">
                <input
                  type="checkbox"
                  checked={travellers.includes(p.id)}
                  onChange={(e) => setTravellers(e.target.checked ? [...travellers, p.id] : travellers.filter((x) => x !== p.id))}
                />
                {p.fullName}
              </label>
            ))}
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-semibold text-rose-600">{err}</p>}
      <div className="mt-4">
        <Button
          variant="amber"
          disabled={create.isPending}
          onClick={() => {
            if (!form.destinationLabel.trim()) {
              setErr("Choose a destination");
              return;
            }
            if (form.fromDate && form.toDate && form.toDate < form.fromDate) {
              setErr("Return/To date can't be before the departure/From date.");
              return;
            }
            setErr(null);
            create.mutate();
          }}
        >
          + Add trip to plan
        </Button>
      </div>
    </Card>
  );
}

interface BulkRow {
  project: string;
  entity: string;
  destinationLabel: string;
  fromDate: string;
  toDate: string;
  status: (typeof TRIP_STATUSES)[number];
}
const emptyRow = (): BulkRow => ({ project: "", entity: "", destinationLabel: "", fromDate: "", toDate: "", status: "Option" });

function BulkTripForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<BulkRow[]>([emptyRow()]);
  const [err, setErr] = useState<string | null>(null);

  const commit = useMutation({
    mutationFn: () =>
      api.post("/api/trips/bulk", {
        rows: rows.map((r) => ({ ...r, fromDate: r.fromDate || null, toDate: r.toDate || null })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["kpis"] });
      setRows([emptyRow()]);
      onDone();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Failed to add trips"),
  });

  function update(i: number, patch: Partial<BulkRow>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <Card className="mb-4">
      <h3 className="mb-1 font-bold text-slate-800">+ Add multiple trips at once</h3>
      <p className="mb-3 text-xs text-slate-500">Quick legs without meetings — edit details afterwards on each trip.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-sky-700 text-left text-xs text-white">
              <th className="p-1.5">Project</th>
              <th className="p-1.5">Entity</th>
              <th className="p-1.5">City</th>
              <th className="p-1.5">From</th>
              <th className="p-1.5">To</th>
              <th className="p-1.5">Status</th>
              <th className="p-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-1"><Input list="projectList" value={r.project} onChange={(e) => update(i, { project: e.target.value })} /></td>
                <td className="p-1"><Input list="entityList" value={r.entity} onChange={(e) => update(i, { entity: e.target.value })} /></td>
                <td className="p-1"><Input list="cityList" value={r.destinationLabel} onChange={(e) => update(i, { destinationLabel: e.target.value })} /></td>
                <td className="p-1"><Input type="date" value={r.fromDate} onChange={(e) => update(i, { fromDate: e.target.value })} /></td>
                <td className="p-1"><Input type="date" value={r.toDate} onChange={(e) => update(i, { toDate: e.target.value })} /></td>
                <td className="p-1">
                  <Select value={r.status} onChange={(e) => update(i, { status: e.target.value as BulkRow["status"] })}>
                    {TRIP_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </td>
                <td className="p-1">
                  <Button variant="danger" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>
                    ✕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-rose-600">{err}</p>}
      <div className="mt-3 flex gap-2">
        <Button onClick={() => setRows([...rows, emptyRow()])}>+ add row</Button>
        <Button variant="amber" disabled={commit.isPending} onClick={() => commit.mutate()}>
          Add all rows to plan
        </Button>
      </div>
    </Card>
  );
}
