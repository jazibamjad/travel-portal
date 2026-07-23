"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCities, useMe } from "@/lib/queries";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/calendar", label: "Calendar" },
  { href: "/planner", label: "Planner" },
  { href: "/flights", label: "Flights" },
  { href: "/team-plan", label: "Team Plan" },
  { href: "/directory", label: "Directory" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: me, isError } = useMe();
  const { data: cities } = useCities();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  async function signOut() {
    await api.post("/api/auth/logout");
    qc.clear();
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="bg-sky-700 text-white">
        <div className="h-1 bg-cyan-400" />
        <div className="mx-auto max-w-6xl px-6 py-3">
          <h1 className="text-base font-bold">MGH — CEO Travel &amp; Team Plan</h1>
          <p className="text-[11px] text-sky-100">
            Plan CEO trips, track the team calendar, manage the city directory, and print one-pagers.
          </p>
        </div>
      </header>

      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-6 py-2">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold ${
                  active ? "bg-sky-100 text-sky-700" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            {me && (
              <span>
                {me.personName ?? me.email} <span className="text-slate-400">· {me.role}</span>
              </span>
            )}
            <button onClick={signOut} className="font-semibold text-sky-700 hover:underline">
              Sign out
            </button>
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>

      {/* Shared destination autocomplete — referenced via list="cityList" from any input across the app. */}
      <datalist id="cityList">
        {(cities ?? []).map((c) => (
          <option key={c.id} value={c.label} />
        ))}
      </datalist>
    </div>
  );
}
