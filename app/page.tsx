// app/page.tsx
"use client";

import Link from "next/link";
import { GraduationCap, Users, DoorOpen, LogIn, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <div className="relative min-h-screen text-neutral-900">
      {/* Background: layered gradients + glow blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tr from-indigo-400 via-fuchsia-400 to-pink-400 opacity-30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tr from-cyan-400 via-teal-300 to-emerald-300 opacity-30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(60rem_60rem_at_120%_10%,rgba(99,102,241,0.15),transparent_60%),radial-gradient(50rem_50rem_at_0%_110%,rgba(16,185,129,0.12),transparent_60%)]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/30 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="size-5" />
            </span>
            <div>
              <div className="text-sm font-semibold tracking-wide">DIU Routine Assist</div>
              <div className="text-xs text-neutral-600">Find the latest published routine</div>
            </div>
          </div>

          <Link
            href="/admin/login"
            aria-label="Admin Login"
            className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/70 px-3 py-1.5 text-sm shadow-sm transition hover:bg-white"
          >
            <LogIn className="size-4" /> Admin Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl md:text-6xl font-extrabold tracking-tight">
            Effortless{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              Routine Access
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-neutral-700">
            View the latest published routine—quick filters, clean layout, always up to date.
          </p>

          {/* Feature chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
              Live Published
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
              Fast & Responsive
            </span>
            <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-fuchsia-700">
              Student, Teacher & Room Views
            </span>
          </div>
        </div>

        {/* CTA Cards */}
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Students */}
          <Link
            href="/student"
            aria-label="Enter as Student"
            className="group rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur-xl transition hover:border-white/60 hover:bg-white/80"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow">
                <GraduationCap className="size-5" />
              </span>
              <div className="text-lg font-semibold">Students</div>
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              Filter by day, batch/section, and slot. Export CSV/PDF in one click.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition group-hover:opacity-95">
              Enter as Student
            </div>
          </Link>

          {/* Teachers */}
          <Link
            href="/teacher"
            aria-label="Enter as Teacher"
            className="group rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur-xl transition hover:border-white/60 hover:bg-white/80"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-600 to-emerald-600 text-white shadow">
                <Users className="size-5" />
              </span>
              <div className="text-lg font-semibold">Teachers</div>
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              Teacher-focused layout with the same clean filters and exports.
            </p>
            {/* Same spacing; just color change */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition group-hover:opacity-95">
              Enter as Teacher
            </div>
          </Link>

          {/* Empty Rooms */}
          <Link
            href="/empty"
            aria-label="View Empty Rooms"
            className="group rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur-xl transition hover:border-white/60 hover:bg-white/80"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-400 text-white shadow">
                <DoorOpen className="size-5" />
              </span>
              <div className="text-lg font-semibold">Empty Rooms</div>
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              Quickly find available classrooms by day, time, or building with ease.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 px-4 py-2 text-sm font-medium text-white shadow-sm transition group-hover:opacity-95">
              View Empty Rooms
            </div>
          </Link>
        </section>

        {/* Footer note */}
        <p className="mt-10 text-center text-xs text-neutral-500">
          Designed for quick access and clarity across all routine views.
        </p>
      </main>
    </div>
  );
}
