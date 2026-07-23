"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { usePeople } from "@/lib/queries";
import { ContactDto, MeetingDto, TripDto } from "@/lib/types";
import { MEETING_PRIORITIES, MEETING_STATUSES, PROJECTS, ENTITIES } from "@/lib/constants";
import { Badge, Button, Card, ErrorState, Input, Label, LoadingState, PageHeader, Select, Textarea } from "@/components/ui";
import { daysBetweenInclusive } from "@/lib/calendar-utils";

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: people } = usePeople();

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api.get<TripDto>(`/api/trips/${tripId}`),
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts", trip?.destinationCityId],
    queryFn: () => api.get<ContactDto[]>(`/api/cities/${trip!.destinationCityId}/contacts`),
    enabled: !!trip,
  });

  const addMeeting = useMutation({
    mutationFn: (contactId: string) =>
      api.post(`/api/trips/${tripId}/meetings`, {
        contactId,
        orderNum: (trip?.meetings.length ?? 0) + 1,
        priority: "Medium",
        status: "Proposed",
        agenda: "",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", tripId] }),
  });

  const removeMeeting = useMutation({
    mutationFn: (meetingId: string) => api.delete(`/api/trips/${tripId}/meetings/${meetingId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", tripId] }),
  });

  if (isLoading) return <LoadingState />;
  if (error || !trip) return <ErrorState message={error instanceof ApiError ? error.message : "Trip not found"} />;

  const days = daysBetweenInclusive(trip.fromDate, trip.toDate);
  const meetingContactIds = new Set(trip.meetings.map((m) => m.contactId));

  return (
    <>
      <div className="mb-3 text-xs">
        <Link href="/planner" className="font-semibold text-sky-700 hover:underline">
          ← Back to trips
        </Link>
      </div>
      <PageHeader
        title={trip.destinationLabel}
        subtitle={`${trip.project || "No project"} · ${trip.entity || "No entity"} · ${trip.fromDate ?? "TBC"} – ${trip.toDate ?? "TBC"}${trip.fromDate ? ` · ${days} day(s)` : ""}`}
        actions={
          <Link href={`/one-pager/trip/${trip.id}`} target="_blank">
            <Button>📄 One-pager</Button>
          </Link>
        }
      />

      <TripFieldsForm trip={trip} />

      <Card className="mt-4">
        <h3 className="mb-1 font-bold text-sky-700">People to meet in {trip.destinationLabel}</h3>
        <p className="mb-3 text-xs text-slate-500">Tick everyone the CEO will meet here — each becomes a meeting below.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(contacts ?? []).map((c) => (
            <label key={c.id} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={meetingContactIds.has(c.id)}
                onChange={(e) => {
                  if (e.target.checked) addMeeting.mutate(c.id);
                  else {
                    const m = trip.meetings.find((m) => m.contactId === c.id);
                    if (m) removeMeeting.mutate(m.id);
                  }
                }}
              />
              <span>
                <b>{c.name}</b>
                {c.orgRole && <span className="block text-xs text-slate-500">{c.orgRole}</span>}
              </span>
            </label>
          ))}
          {contacts && contacts.length === 0 && (
            <p className="text-xs text-slate-400">No contacts listed for this city yet — add them in the Directory.</p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {[...trip.meetings]
            .sort((a, b) => a.orderNum - b.orderNum)
            .map((m) => (
              <MeetingEditor key={m.id} tripId={trip.id} meeting={m} peopleOptions={people ?? []} />
            ))}
        </div>
      </Card>
    </>
  );
}

function TripFieldsForm({ trip }: { trip: TripDto }) {
  const qc = useQueryClient();
  const { data: people } = usePeople();
  const [form, setForm] = useState({
    project: trip.project,
    entity: trip.entity,
    status: trip.status,
    hotel: trip.hotel,
    transport: trip.transport,
    fromDate: trip.fromDate ?? "",
    toDate: trip.toDate ?? "",
  });

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/api/trips/${trip.id}`, { ...form, fromDate: form.fromDate || null, toDate: form.toDate || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", trip.id] }),
  });

  const setTravellers = useMutation({
    mutationFn: (ids: string[]) => api.put(`/api/trips/${trip.id}/travellers`, { personIds: ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", trip.id] }),
  });

  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Project</Label>
          <Input list="projectList" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} onBlur={() => update.mutate()} />
          <datalist id="projectList">
            {PROJECTS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div>
          <Label>Entity</Label>
          <Input list="entityList" value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value })} onBlur={() => update.mutate()} />
          <datalist id="entityList">
            {ENTITIES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.status}
            onChange={(e) => {
              const status = e.target.value as TripDto["status"];
              setForm({ ...form, status });
              api.patch(`/api/trips/${trip.id}`, { status }).then(() => qc.invalidateQueries({ queryKey: ["trip", trip.id] }));
            }}
          >
            <option>Confirmed</option>
            <option>Option</option>
            <option>Tentative</option>
          </Select>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>From</Label>
          <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} onBlur={() => update.mutate()} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} onBlur={() => update.mutate()} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Hotel</Label>
          <Input value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} onBlur={() => update.mutate()} />
        </div>
        <div>
          <Label>Transportation</Label>
          <Input value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} onBlur={() => update.mutate()} />
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
                  checked={trip.travellerIds.includes(p.id)}
                  onChange={(e) => {
                    const ids = e.target.checked ? [...trip.travellerIds, p.id] : trip.travellerIds.filter((x) => x !== p.id);
                    setTravellers.mutate(ids);
                  }}
                />
                {p.fullName}
              </label>
            ))}
        </div>
      </div>
    </Card>
  );
}

function MeetingEditor({ tripId, meeting, peopleOptions }: { tripId: string; meeting: MeetingDto; peopleOptions: { id: string; fullName: string }[] }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["trip", tripId] });

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/api/meetings/${meeting.id}`, body),
    onSuccess: invalidate,
  });
  const addMaterial = useMutation({
    mutationFn: () => api.post(`/api/meetings/${meeting.id}/materials`, { description: "", ownerPersonId: null }),
    onSuccess: invalidate,
  });
  const updateMaterial = useMutation({
    mutationFn: (v: { id: string; description?: string; ownerPersonId?: string | null }) =>
      api.patch(`/api/materials/${v.id}`, { description: v.description, ownerPersonId: v.ownerPersonId }),
    onSuccess: invalidate,
  });
  const deleteMaterial = useMutation({
    mutationFn: (id: string) => api.delete(`/api/materials/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="rounded-lg border border-slate-200 border-l-4 border-l-cyan-400 bg-white p-3">
      <h4 className="mb-2 text-sm font-bold">
        <span className="mr-1.5 inline-block min-w-5 rounded-full bg-sky-700 px-1.5 text-center text-[11px] font-bold text-white">{meeting.orderNum}</span>
        🤝 {meeting.contactName}
      </h4>
      <div className="grid gap-2 sm:grid-cols-4">
        <div>
          <Label>Order</Label>
          <Input type="number" min={1} defaultValue={meeting.orderNum} onBlur={(e) => patch.mutate({ orderNum: Number(e.target.value) || 1 })} />
        </div>
        <div>
          <Label>Priority</Label>
          <Select defaultValue={meeting.priority} onChange={(e) => patch.mutate({ priority: e.target.value })}>
            {MEETING_PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select defaultValue={meeting.status} onChange={(e) => patch.mutate({ status: e.target.value })}>
            {MEETING_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" defaultValue={meeting.meetingTime ?? ""} onBlur={(e) => patch.mutate({ meetingTime: e.target.value || null })} />
        </div>
      </div>
      <div className="mt-2">
        <Label>Team attending</Label>
        <div className="flex flex-wrap gap-1.5">
          {peopleOptions.map((p) => (
            <label key={p.id} className="flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold">
              <input
                type="checkbox"
                checked={meeting.attendeeIds.includes(p.id)}
                onChange={(e) => {
                  const ids = e.target.checked ? [...meeting.attendeeIds, p.id] : meeting.attendeeIds.filter((x) => x !== p.id);
                  patch.mutate({ attendeeIds: ids });
                }}
              />
              {p.fullName}
            </label>
          ))}
        </div>
      </div>
      <div className="mt-2">
        <Label>Agenda</Label>
        <Textarea defaultValue={meeting.agenda} onBlur={(e) => patch.mutate({ agenda: e.target.value })} />
      </div>
      <div className="mt-2">
        <Label>Materials needed</Label>
        {meeting.materials.map((mat) => (
          <div key={mat.id} className="mt-1 grid grid-cols-[2fr_1fr_auto] gap-1.5">
            <Input defaultValue={mat.description} onBlur={(e) => updateMaterial.mutate({ id: mat.id, description: e.target.value })} placeholder="Material / document" />
            <Select defaultValue={mat.ownerPersonId ?? ""} onChange={(e) => updateMaterial.mutate({ id: mat.id, ownerPersonId: e.target.value || null })}>
              <option value="">— owner —</option>
              {peopleOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </Select>
            <Button variant="danger" onClick={() => deleteMaterial.mutate(mat.id)}>
              ✕
            </Button>
          </div>
        ))}
        <Button className="mt-1.5" onClick={() => addMaterial.mutate()}>
          + material
        </Button>
      </div>
    </div>
  );
}
