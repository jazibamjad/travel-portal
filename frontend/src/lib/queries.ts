"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { CityDto, MeResponse, PersonDto } from "./types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/api/auth/me"),
    retry: false,
    refetchInterval: false,
  });
}

export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: () => api.get<PersonDto[]>("/api/people"),
    refetchInterval: 15000,
  });
}

export function useCities(q?: string) {
  return useQuery({
    queryKey: ["cities", q ?? ""],
    queryFn: () => api.get<CityDto[]>(`/api/cities${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    refetchInterval: 15000,
  });
}
