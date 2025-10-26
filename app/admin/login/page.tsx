// src/app/admin/login/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Home, Lock, Sparkles, Mail } from "lucide-react";
import React from "react";

import { getAdminByEmail } from "@/lib/admins";
import { verifyPassword, signAdminJWT, cookieOptions } from "@/lib/auth";

export const dynamic = "force-static";

/** Server Action: verify credentials, set HttpOnly JWT cookie, then redirect */
async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  const next = "/admin"; // redirect path

  if (!email || !password) redirect("/admin/login?err=1");

  const admin = await getAdminByEmail(email);
  if (!admin) redirect("/admin/login?err=1");

  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) redirect("/admin/login?err=1");

  const jwt = await signAdminJWT({
    sub: admin._id!.toString(),
    email: admin.email,
    username: admin.username,
  });

  const c = await cookies();
  c.set({
    name: cookieOptions.name,
    value: jwt,
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
  });

  redirect(next);
}

export default function Page({
  searchParams,
}: {
  searchParams: { err?: string };
}) {
  const err = searchParams?.err === "1";

  return (
    <div className="relative min-h-screen text-neutral-900">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tr from-indigo-400 via-fuchsia-400 to-pink-400 opacity-30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tr from-cyan-400 via-teal-300 to-emerald-300 opacity-30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(60rem_60rem_at_120%_10%,rgba(99,102,241,0.15),transparent_60%),radial-gradient(50rem_50rem_at_0%_110%,rgba(16,185,129,0.12),transparent_60%)]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/30 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-3 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/70 px-3 py-1.5 text-sm shadow-sm transition hover:bg-white"
          >
            <Home className="size-4" />
            Home
          </a>

          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="size-5" />
            </span>
            <div className="text-right">
              <div className="text-sm font-semibold tracking-wide">DIU Routine Assist</div>
              <div className="text-xs text-neutral-600">Admin Console</div>
            </div>
          </div>
        </div>
      </header>

      {/* Centered Card */}
      <main className="mx-auto grid min-h-[70vh] w-full max-w-7xl place-items-center px-6">
        <form
          action={loginAction}
          className="w-full max-w-md rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl"
          id="admin-login-form"
        >
          {/* Brand / Title */}
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow">
              <Lock className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Administrator Login</h1>
              <p className="text-xs text-neutral-500">
                Restricted area — authorized users only.
              </p>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div
              className="mb-4 rounded-xl border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-sm text-rose-700"
              aria-live="assertive"
              role="alert"
            >
              Invalid email or password. Please try again.
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">Email</label>
            <div className="flex items-center rounded-xl border border-white/50 bg-white/70 px-3 py-2 shadow-inner focus-within:bg-white">
              <Mail className="mr-2 size-4 text-neutral-500" />
              <input
                name="email"
                type="email"
                required
                className="w-full bg-transparent outline-none text-sm"
                placeholder="admin@example.com"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mt-3 space-y-1">
            <label className="text-sm font-medium text-neutral-700">Password</label>
            <div className="flex items-center rounded-xl border border-white/50 bg-white/70 px-3 py-2 shadow-inner focus-within:bg-white">
              <input
                name="password"
                type="password"
                required
                className="w-full bg-transparent outline-none text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-white"
            >
              <Home className="size-4" />
              Home
            </a>
            <button
              id="login-submit"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
            >
              <span className="inline-block" id="login-text">
                Sign in
              </span>
              <svg
                id="login-spinner"
                className="hidden ml-2 size-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity="0.25"
                />
                <path
                  d="M21 12a9 9 0 0 1-9 9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Footer note */}
          <p className="mt-4 text-center text-xs text-neutral-500">
            Session ends when you close the browser or log out.
          </p>

          {/* Inline script for clean loading animation */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
              (function(){
                var form = document.getElementById('admin-login-form');
                var btn = document.getElementById('login-submit');
                var txt = document.getElementById('login-text');
                var spinner = document.getElementById('login-spinner');
                if (!form || !btn) return;

                form.addEventListener('submit', function(){
                  if (txt) txt.textContent = 'Signing in…';
                  if (spinner) spinner.classList.remove('hidden');
                  btn.setAttribute('disabled', 'true');
                  btn.classList.add('opacity-90', 'cursor-not-allowed');
                }, { once: true });
              })();
              `,
            }}
          />
        </form>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-7xl px-6 pb-8">
        <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-center text-xs text-neutral-600 backdrop-blur-xl">
          © {new Date().getFullYear()} DIU Routine Assist — Admin Panel
        </div>
      </footer>
    </div>
  );
}
