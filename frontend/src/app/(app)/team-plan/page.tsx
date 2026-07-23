"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { usePeople } from "@/lib/queries";
import { TeamPlanEntryDto } from "@/lib/types";
import { PLAN_TYPES } from "@/lib/constants";
import { Badge, Button, Card, ErrorState, Input, Label, LoadingState, PageHeader, Select, Textarea } from "@/components/ui";
import { daysBetweenInclusive } from "@/lib/calendar-utils";

export default function TeamPlanPage() {
  const qc = useQueryClient();
  const { data: people } = usePeople();
  const [showBulk, setShowBulk] = useState(false);

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ["team-plan"],
    queryFn: () => api.get<TeamPlanEntryDto[]>("/api/team-plan"),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["team-plan"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
  };

  const update = useMutation({ mutationFn: (v: { id: string; body: Record<string, unknown> }) => api.patch(`/api/team-plan/${v.id}`, v.body), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/api/team-plan/${id}`), onSuccess: invalidate });
  const decide = useMutation({ mutationFn: (v: { id: string; decision: string }) => api.post(`/api/team-plan/${v.id}/decision`, { decision: v.decision }), onSuccess: invalidate });
  const addRow = useMutation({
    mutationFn: (personId: string) => api.post("/api/team-plan", { personId, type: "Option", notes: "" }),
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        title="Team Plan"
        subtitle="Each person's trips, options, vacation & remote entries — plus the vacation approval workflow."
        actions={<Button variant="amber" onClick={() => setShowBulk((s) => !s)}>{showBulk ? "Close" : "+ Bulk add to multiple people"}</Button>}
      />

      {showBulk && <BulkAddForm onDone={() => setShowBulk(false)} />}

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : "Failed to load team plan"} />}

      {(people ?? []).map((p) => {
        const rows = (entries ?? []).filter((e) => e.personId === p.id);
        const totalDays = rows.reduce((a, r) => a + daysBetweenInclusive(r.fromDate, r.toDate), 0);
        return (
          <Card key={p.id} className="mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                {p.fullName} <span className="ml-1 text-xs font-normal text-slate-400">{[p.title, p.function].filter(Boolean).join(" · ")}</span>
              </h3>
              <Button onClick={() => addRow.mutate(p.id)}>+ row</Button>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-xs text-slate-500">
                    <th className="p-1.5">From</th>
                    <th className="p-1.5">To</th>
                    <th className="p-1.5">City / place</th>
                    <th className="p-1.5">Type</th>
                    <th className="p-1.5">Notes</th>
                    <th className="p-1.5">Approval</th>
                    <th className="p-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="p-1"><Input type="date" defaultValue={r.fromDate ?? ""} onBlur={(e) => update.mutate({ id: r.id, body: { fromDate: e.target.value || null } })} /></td>
                      <td className="p-1"><Input type="date" defaultValue={r.toDate ?? ""} onBlur={(e) => update.mutate({ id: r.id, body: { toDate: e.target.value || null } })} /></td>
                      <td className="p-1"><Input list="cityList" defaultValue={r.cityLabel ?? ""} onBlur={(e) => update.mutate({ id: r.id, body: { cityLabel: e.target.value } })} /></td>
                      <td className="p-1">
                        <Select defaultValue={r.type} onChange={(e) => update.mutate({ id: r.id, body: { type: e.target.value } })}>
                          {PLAN_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="p-1"><Textarea defaultValue={r.notes} onBlur={(e) => update.mutate({ id: r.id, body: { notes: e.target.value } })} /></td>
                      <td className="p-1">
                        {r.type === "Vacation" ? (
                          <div className="flex flex-col gap-1">
                            <Badge tone={r.approvalStatus ?? "Pending"}>{r.approvalStatus ?? "Pending"}</Badge>
                            {r.approvalStatus !== "Approved" && (
                              <button className="text-[11px] font-semibold text-emerald-600 hover:underline" onClick={() => decide.mutate({ id: r.id, decision: "Approved" })}>
                                approve
                              </button>
                            )}
                            {r.approvalStatus !== "Rejected" && (
                              <button className="text-[11px] font-semibold text-rose-600 hover:underline" onClick={() => decide.mutate({ id: r.id, decision: "Rejected" })}>
                                reject
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-1">
                        <Button variant="danger" onClick={() => remove.mutate(r.id)}>
                          ✕
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-2 text-xs text-slate-400">
                        No entries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-sky-700">Total days planned: {totalDays}</p>
          </Card>
        );
      })}
    </>
  );
}

function BulkAddForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { data: people } = usePeople();
  const [form, setForm] = useState({ fromDate: "", toDate: "", cityLabel: "", type: "Option" as (typeof PLAN_TYPES)[number], notes: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const commit = useMutation({
    mutationFn: () =>
      api.post("/api/team-plan/bulk", { ...form, fromDate: form.fromDate || null, toDate: form.toDate || null, personIds: selected }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-plan"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      setSelected([]);
      onDone();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Failed to add entries"),
  });

  return (
    <Card className="mb-4 border-l-4 border-l-amber-400 bg-amber-50/40">
      <h3 className="mb-3 font-bold text-slate-800">Add a plan entry to multiple people at once</h3>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label>From</Label>
          <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
        </div>
        <div>
          <Label>City / place</Label>
          <Input list="cityList" value={form.cityLabel} onChange={(e) => setForm({ ...form, cityLabel: e.target.value })} />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
            {PLAN_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3">
        <Label>Notes</Label>
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="mt-3">
        <Label>Apply to</Label>
        <div className="flex flex-wrap gap-2">
          {(people ?? []).map((p) => (
            <label key={p.id} className="flex items-center gap-1.5 rounded-full border border-cyan-300 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((x) => x !== p.id))}
              />
              {p.fullName}
            </label>
          ))}
        </div>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-rose-600">{err}</p>}
      <div className="mt-3">
        <Button
          variant="amber"
          disabled={commit.isPending}
          onClick={() => {
            if (!selected.length) {
              setErr("Tick at least one person.");
              return;
            }
            commit.mutate();
          }}
        >
          Add to selected people
        </Button>
      </div>
    </Card>
  );
}
