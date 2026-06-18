"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email: fd.get("email") as string,
        password: fd.get("password") as string,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b10] p-4">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-cyan-500/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/northops-icon.png" alt="NorthOps" width={48} height={48} className="object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">NorthOps</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to your operations hub</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0c0f14]/80 p-8 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@northops.io"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-400">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-cyan-500 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-400 disabled:opacity-50"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">Demo accounts</p>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-slate-300">Admin</span>
              <span className="text-right">curran@northops.io / northops123</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-slate-300">Team</span>
              <span className="text-right">alex@northops.io / northops123</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-slate-300">Client (SKAPS)</span>
              <span className="text-right">kush.vyas@skaps.com / northops123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
