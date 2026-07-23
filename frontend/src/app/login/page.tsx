"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button, Input, Label } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("coordinator@mgh.example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/auth/login", { email, password });
      router.push(search.get("next") || "/overview");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 shadow-md">
        <div className="mb-1 h-1.5 -mt-7 -mx-7 rounded-t-xl bg-gradient-to-r from-sky-600 to-cyan-400" />
        <h1 className="mt-4 text-lg font-bold text-sky-700">MGH Travel &amp; Team Plan</h1>
        <p className="mt-1 text-xs text-slate-500">
          Sign in to view and edit the shared executive travel &amp; team plan.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          <Button type="submit" variant="primary" className="w-full justify-center" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 rounded-md bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
          <b>Seeded demo accounts</b> (see README):<br />
          coordinator@mgh.example.com / Coordinator!123<br />
          ceo@mgh.example.com / Ceo!12345<br />
          jamie@mgh.example.com / TeamMember!123
        </div>
      </div>
    </div>
  );
}
