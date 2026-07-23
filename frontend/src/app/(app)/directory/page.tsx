"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { CityDto, ContactDto } from "@/lib/types";
import { Button, Card, ErrorState, Input, LoadingState, PageHeader } from "@/components/ui";

export default function DirectoryPage() {
  const qc = useQueryClient();
  const { data: cities, isLoading, error } = useQuery({
    queryKey: ["cities", ""],
    queryFn: () => api.get<CityDto[]>("/api/cities"),
  });
  const [newCity, setNewCity] = useState("");
  const [cityErr, setCityErr] = useState<string | null>(null);

  const addCity = useMutation({
    mutationFn: () => api.post("/api/cities", { label: newCity.trim() }),
    onSuccess: () => {
      setNewCity("");
      setCityErr(null);
      qc.invalidateQueries({ queryKey: ["cities"] });
    },
    onError: (e) => setCityErr(e instanceof ApiError ? e.message : "Failed to add city"),
  });

  return (
    <>
      <PageHeader title="People Directory by City" subtitle="Feeds the meeting picker in the Trip Planner — add or edit freely." />

      <Card className="mb-4">
        <div className="flex max-w-lg gap-2">
          <Input list="cityList" placeholder="New city / destination (City, Country)…" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
          <Button
            variant="amber"
            disabled={!newCity.trim() || addCity.isPending}
            onClick={() => addCity.mutate()}
          >
            + Add city
          </Button>
        </div>
        {cityErr && <p className="mt-2 text-xs font-semibold text-rose-600">{cityErr}</p>}
      </Card>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : "Failed to load directory"} />}

      {(cities ?? []).map((c) => (
        <CityBlock key={c.id} city={c} />
      ))}
    </>
  );
}

function CityBlock({ city }: { city: CityDto }) {
  const qc = useQueryClient();
  const [newContact, setNewContact] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { data: contacts } = useQuery({
    queryKey: ["contacts", city.id],
    queryFn: () => api.get<ContactDto[]>(`/api/cities/${city.id}/contacts`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["contacts", city.id] });
    qc.invalidateQueries({ queryKey: ["cities"] });
  };

  const addContact = useMutation({
    mutationFn: () => {
      const [name, ...rest] = newContact.split("—").map((s) => s.trim());
      return api.post(`/api/cities/${city.id}/contacts`, { name: name || newContact, orgRole: rest.join(" — ") });
    },
    onSuccess: () => {
      setNewContact("");
      setErr(null);
      invalidate();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Failed to add contact"),
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => api.delete(`/api/contacts/${id}`),
    onSuccess: invalidate,
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Failed to remove contact"),
  });

  const deleteCity = useMutation({
    mutationFn: () => api.delete(`/api/cities/${city.id}`),
    onSuccess: invalidate,
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Failed to remove city"),
  });

  return (
    <Card className="mb-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">
          {city.label} <span className="text-xs font-normal text-slate-400">({city.contactCount})</span>
        </h3>
        <Button variant="danger" onClick={() => deleteCity.mutate()}>
          ✕ city
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(contacts ?? []).map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300 bg-sky-50 px-2.5 py-1 text-xs text-sky-800">
            {c.name}
            {c.orgRole && <span className="text-slate-400">— {c.orgRole}</span>}
            <button className="font-bold text-rose-500" onClick={() => deleteContact.mutate(c.id)} title="Remove contact">
              ✕
            </button>
          </span>
        ))}
        {contacts && contacts.length === 0 && <span className="text-xs text-slate-400">No contacts yet.</span>}
      </div>
      <div className="mt-2 flex max-w-lg gap-2">
        <Input placeholder="Add person — Org / role" value={newContact} onChange={(e) => setNewContact(e.target.value)} />
        <Button disabled={!newContact.trim() || addContact.isPending} onClick={() => addContact.mutate()}>
          Add
        </Button>
      </div>
      {err && <p className="mt-1.5 text-xs font-semibold text-rose-600">{err}</p>}
    </Card>
  );
}
