// src/app/teacher/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppNav from "@/components/AppNav";
import { RefreshCw, IdCard, Tag, CalendarDays, Layout, LayoutPanelTop } from "lucide-react";
import { InitialPicker } from "@/components/Filters";
import { ClassRow, SLOTS, isRoutineEntry } from "@/lib/routine";
import { TeacherInfo, findByInitial, dayOffList } from "@/lib/teachers";
import { exportTeacherWeeklyPDF } from "@/lib/exporters";

/* ---------------- data fetch helpers ---------------- */

type PublishedPayload<T = any> = {
  data: T;
  meta?: { fileName?: string; version?: string; effectiveFrom?: string; [k: string]: any };
  updatedAt?: string;
};

async function safeJSON<T = any>(res: Response): Promise<T | null> {
  try { return JSON.parse(await res.text()) as T; } catch { return null; }
}
async function fetchJSON<T = any>(url: string) {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? await safeJSON<T>(r) : null; }
  catch { return null; }
}
async function fetchPublished(kind: "routine" | "tif") {
  const primary = `/api/published/${kind}`;
  const fallback = `/published/${kind}.json`;
  const a = await fetchJSON<PublishedPayload>(primary);
  if (a?.data) return a;
  return await fetchJSON<PublishedPayload>(fallback);
}

/* ---------------- meta helpers ---------------- */

function extractVersion(fileName?: string, metaVersion?: string) {
  if (metaVersion) return metaVersion;
  if (!fileName) return undefined;
  const m = fileName.match(/(?:^|[\W_])v(\d+)(?:[\W_]|$)/i);
  return m ? `v${m[1]}` : undefined;
}
function formatDate(d?: string) {
  if (!d) return undefined;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt.toLocaleDateString();
}

/* ---------------- day/date helpers ---------------- */

const ORDER = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] as const;
type PortalDay = (typeof ORDER)[number];

const SHORT: Record<PortalDay, string> = {
  Saturday: "Sat", Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
};
const DOW: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};
function addDays(d: Date, n: number) { const t = new Date(d); t.setDate(d.getDate() + n); return t; }
function nextOnOrAfter(from: Date, targetDow: number) { const delta = (targetDow - from.getDay() + 7) % 7; return addDays(from, delta); }
function buildChips(now = new Date()) {
  return ORDER.map((day) => { const date = nextOnOrAfter(now, DOW[day]); return { full: day as PortalDay, short: SHORT[day], dd: date.getDate() }; });
}
function parseSlotRange(slot: string) {
  const s = slot.replace(/\s+/g, ""); const [a, b] = s.split(/-|–|—/); return { start: a ?? slot, end: b ?? "" };
}
const SLOT_TIMES: Record<string, { start: string; end: string }> =
  Object.fromEntries(SLOTS.map((s) => [s, parseSlotRange(s)]));

/* ---------------- helpers ---------------- */

function teacherInitialOnly(s: string): string {
  return ((s || "").split(" - ")[0] || "").trim().toUpperCase();
}
function buildWeeklyMatrix(rows: ClassRow[], initial: string) {
  const days = ORDER as unknown as string[];
  const by: Record<string, ClassRow[][]> = {};
  for (const d of days) {
    by[d] = SLOTS.map((s) =>
      rows.filter((r) => r.day === d && r.slot === s)
          .filter((r) => teacherInitialOnly(r.teacher) === initial)
          .filter(isRoutineEntry)
    );
  }
  return { days, by };
}

/* ---------------- page ---------------- */

export default function TeacherPage() {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [tif, setTif] = useState<TeacherInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"" | "loading" | "empty">("");

  // Routine meta
  const [routineVersion, setRoutineVersion] = useState<string | undefined>();
  const [routineEffectiveFrom, setRoutineEffectiveFrom] = useState<string | undefined>();
  // TIF meta
  const [tifVersion, setTifVersion] = useState<string | undefined>();
  const [tifEffectiveFrom, setTifEffectiveFrom] = useState<string | undefined>();

  const [initial, setInitial] = useState("");
  const [slot, setSlot] = useState("");
  const [day, setDay] = useState<PortalDay | "">("");

  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const chips = useMemo(() => buildChips(), []);

  useEffect(() => {
    if (!day) {
      const wd = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
      setDay(ORDER.includes(wd as PortalDay) ? (wd as PortalDay) : "Saturday");
    }
  }, [day]);

  const loadData = async () => {
    setLoading(true); setStatus("loading");
    const [r, t] = await Promise.all([fetchPublished("routine"), fetchPublished("tif")]);

    // Routine
    if (Array.isArray(r?.data)) {
      setRows(r!.data as ClassRow[]);
      setRoutineVersion(extractVersion(r?.meta?.fileName, r?.meta?.version));
      setRoutineEffectiveFrom(formatDate(r?.meta?.effectiveFrom || r?.updatedAt));
      setStatus("");
    } else {
      setRows([]);
      setRoutineVersion(undefined);
      setRoutineEffectiveFrom(undefined);
      setStatus("empty");
    }

    // TIF
    if (Array.isArray(t?.data)) {
      setTif(t!.data as TeacherInfo[]);
      setTifVersion(extractVersion(t?.meta?.fileName, t?.meta?.version));
      setTifEffectiveFrom(formatDate(t?.meta?.effectiveFrom || t?.updatedAt));
    } else {
      setTif([]);
      setTifVersion(undefined);
      setTifEffectiveFrom(undefined);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const initialOptions = useMemo(() => {
    if (tif.length) {
      return tif
        .filter((t) => t.initial?.trim())
        .map((t) => ({ initial: t.initial.trim(), name: t.name || "" }))
        .sort((a, b) => a.initial.localeCompare(b.initial));
    }
    const set = new Set<string>();
    for (const r of rows) {
      const ini = (r.teacher || "").split(" - ")[0].trim();
      if (ini) set.add(ini);
    }
    return Array.from(set).sort().map((ini) => ({ initial: ini, name: "" }));
  }, [tif, rows]);

  const matchedTeacher = useMemo(() => (initial ? findByInitial(tif, initial) : null), [tif, initial]);
  const exactInitial = useMemo(() => (matchedTeacher?.initial || initial || "").trim().toUpperCase(), [matchedTeacher, initial]);

  const classesForDay = useMemo(() => {
    if (!exactInitial || !day) return [];
    return rows
      .filter((r) => r.day === day)
      .filter((r) => !slot || r.slot === slot)
      .filter((r) => teacherInitialOnly(r.teacher) === exactInitial)
      .filter(isRoutineEntry)
      .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  }, [rows, day, slot, exactInitial]);

  const timeline = useMemo(() => {
    const out: Array<{ kind: "class"; row: ClassRow } | { kind: "break"; from: string; to: string }> = [];
    for (let i = 0; i < classesForDay.length; i++) {
      out.push({ kind: "class", row: classesForDay[i] });
      const next = classesForDay[i + 1];
      if (!next) break;
      const a = SLOTS.indexOf(classesForDay[i].slot);
      const b = SLOTS.indexOf(next.slot);
      if (b - a > 1) {
        const times = (s: string) => {
          const p = s.replace(/\s+/g, "").split(/-|–|—/);
          return { start: p[0] ?? s, end: p[1] ?? "" };
        };
        out.push({ kind: "break", from: times(classesForDay[i].slot).end, to: times(next.slot).start });
      }
    }
    return out;
  }, [classesForDay]);

  const weekly = useMemo(() => {
    if (!exactInitial) return null;
    return buildWeeklyMatrix(rows, exactInitial);
  }, [rows, exactInitial]);

  const onExportWeeklyPDF = () => {
    if (!exactInitial || !weekly) return;
    exportTeacherWeeklyPDF(rows, {
      days: weekly.days,
      initial: exactInitial,
      teacherName: matchedTeacher?.name || "",
      institute: "Department of CSE",
      title: "Class Routine — Teacher (Weekly)",
    });
  };

  return (
    <div className="relative min-h-screen pb-16 md:pb-0">
      <AppNav />

      <main className="mx-auto max-w-5xl p-5 md:p-8">
        {/* Header row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Teacher</h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Routine Version */}
            {routineVersion && (
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm">
                <Tag className="size-3.5" />
                Routine: ({routineVersion})
              </span>
            )}
            {/* Routine Effective From */}
            {routineEffectiveFrom && (
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm">
                <CalendarDays className="size-3.5" />
                Routine effective from: {routineEffectiveFrom}
              </span>
            )}
            {/* TIF Version */}
            {tifVersion && (
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm">
                <Tag className="size-3.5" />
                TIF: ({tifVersion})
              </span>
            )}
            {/* TIF Effective From */}
            {tifEffectiveFrom && (
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm">
                <CalendarDays className="size-3.5" />
                TIF effective from: {tifEffectiveFrom}
              </span>
            )}
            {/* Loading / Empty */}
            {status === "loading" && (
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs text-indigo-900 shadow-sm">
                Loading published data…
              </span>
            )}
            {status === "empty" && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 shadow-sm">
                No published routine found
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-60"
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search teacher from TIF */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <InitialPicker
              value={initial}
              onChange={setInitial}
              options={initialOptions}
              label="Search Teacher (Initial or Name)"
              placeholder="e.g., MUR or Mushfiqur Rahman"
            />
          </div>

          {/* View mode toggle */}
          <div className="md:col-span-1">
            <label className="text-sm font-medium text-neutral-700">View</label>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setViewMode("day")}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                  viewMode === "day" ? "bg-violet-600 text-white border-violet-600" : "bg-white",
                ].join(" ")}
              >
                <LayoutPanelTop className="size-3.5" />
                Day-wise
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                  viewMode === "week" ? "bg-violet-600 text-white border-violet-600" : "bg-white",
                ].join(" ")}
              >
                <Layout className="size-3.5" />
                Week-wise
              </button>
            </div>
          </div>
        </div>

        {/* TIF card */}
        {initial ? (
          matchedTeacher ? (
            <TeacherInfoCard teacher={matchedTeacher} />
          ) : (
            <div className="mt-4 rounded-2xl border card-surface p-3 text-sm">
              <IdCard className="inline mr-2" size={16} />
              No teacher info found in TIF for <b>{initial}</b>. The routine below still shows all classes.
            </div>
          )
        ) : null}

        {/* Views */}
        {!exactInitial ? (
          <div className="mt-4 rounded-2xl border card-surface px-3 py-2 text-sm">
            Pick a teacher from TIF to view their routine.
          </div>
        ) : viewMode === "day" ? (
          <>
            {/* Day rail */}
            <div className="mt-5 grid grid-cols-6 gap-2">
              {chips.map((c) => {
                const active = c.full === day;
                return (
                  <button
                    key={`${c.full}-${c.dd}`}
                    onClick={() => setDay(c.full)}
                    className={[
                      "transition-all duration-200 ease-out",
                      "rounded-2xl border px-2 py-2 text-center font-medium leading-tight select-none",
                      "hover:scale-[1.03]",
                      active ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent"
                             : "bg-neutral-100 text-neutral-800",
                    ].join(" ")}
                    aria-pressed={active}
                    title={`${c.full} ${c.dd}`}
                  >
                    <div className="font-semibold text-[clamp(11px,3.4vw,16px)]">{c.dd}</div>
                    <div className="opacity-80 text-[clamp(10px,2.9vw,14px)]">{SHORT[c.full]}</div>
                  </button>
                );
              })}
            </div>

            {timeline.length === 0 ? (
              <div className="mt-6 rounded-2xl border card-surface p-3 text-sm text-neutral-700">
                No classes for <b>{exactInitial}</b> on <b>{day || "this day"}</b>{slot ? <> at <b>{slot}</b></> : null}.
              </div>
            ) : (
              <section className="mt-4 space-y-3">
                {timeline.map((item, i) =>
                  item.kind === "class" ? (
                    <TeacherCard key={`c-${i}`} row={item.row} />
                  ) : (
                    <BreakCard key={`b-${i}`} from={item.from} to={item.to} />
                  )
                )}
              </section>
            )}

            {/* Download PDF (Weekly) also in Day view */}
            <div className="mt-4">
              <button
                onClick={onExportWeeklyPDF}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border hover:bg-neutral-50"
              >
                <CalendarDays className="size-4" />
                Download PDF (Weekly)
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Week-wise matrix (days rows, slots columns) */}
            <div className="overflow-x-auto mt-5">
              <div className="min-w-[900px] rounded-xl border" id="teacher-weekly">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Day</th>
                      {SLOTS.map((s) => (
                        <th key={s} className="px-3 py-2 text-left font-semibold">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ORDER.map((d) => (
                      <tr key={d} className="align-top">
                        <td className="whitespace-nowrap px-3 py-3 font-medium">{d}</td>
                        {SLOTS.map((s, si) => {
                          const items = weekly?.by[d]?.[si] || [];
                          const className = ["bg-pink-50","bg-blue-50","bg-amber-50","bg-violet-50","bg-cyan-50","bg-emerald-50"][ORDER.indexOf(d)%6];
                          return (
                            <td key={`${d}-${s}`} className="px-3 py-3">
                              <div className="space-y-2">
                                {items.length ? items.map((r, i) => (
                                  <div key={i} className={`rounded-lg border p-2 ${className}`}>
                                    <div className="font-medium">{r.course || "(Course)"}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                                      {r.batch && <span className="inline-flex rounded-full border px-2 py-0.5">{r.batch}</span>}
                                      {r.room && <span>📍 {r.room}</span>}
                                    </div>
                                  </div>
                                )) : <div className="text-xs text-neutral-400">—</div>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={onExportWeeklyPDF}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border hover:bg-neutral-50"
              >
                <CalendarDays className="size-4" />
                Download PDF (Weekly)
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ---------------- cards ---------------- */

function TeacherCard({ row }: { row: ClassRow }) {
  const p = row.slot.replace(/\s+/g, "").split(/-|–|—/);
  const t = { start: p[0] ?? row.slot, end: p[1] ?? "" };
  return (
    <div className="relative grid grid-cols-[62px_1fr] gap-3 rounded-2xl border card-surface p-3 shadow-sm">
      <div className="flex flex-col items-center text-[11px] text-neutral-600">
        <div className="rail-pill rounded-full px-2 py-0.5 font-medium">{t.start}</div>
        <div className="mt-2 h-12 w-px bg-white/60" />
        <div className="rail-pill rounded-full px-2 py-0.5 font-medium">{t.end}</div>
      </div>

      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-neutral-900">{row.course || "(Course name)"}</div>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
          <Info label="Course" value={row.course || "—"} />
          <Info label="Section" value={row.batch || "—"} />
          <Info label="Teacher" value={row.teacher || "—"} />
          <Info label="Room" value={row.room || "—"} />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-violet-500 to-fuchsia-500" />
    </div>
  );
}

function BreakCard({ from, to }: { from: string; to: string }) {
  return (
    <div className="relative grid grid-cols-[62px_1fr] gap-3 rounded-2xl border card-break-surface p-3">
      <div className="flex flex-col items-center text-[11px] text-neutral-600">
        <div className="rail-pill rounded-full px-2 py-0.5 font-medium">{from}</div>
        <div className="mt-2 h-12 w-px bg-white/60" />
        <div className="rail-pill rounded-full px-2 py-0.5 font-medium">{to}</div>
      </div>

      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-violet-700">Break Time</div>
        <div className="text-xs text-neutral-700">{from} – {to}</div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-violet-400 to-fuchsia-400" />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="truncate">
      <span className="font-semibold text-neutral-700">{label}</span>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}

function TeacherInfoCard({ teacher }: { teacher: TeacherInfo }) {
  const offs = dayOffList(teacher);
  return (
    <div className="mt-4 rounded-2xl border card-surface p-4">
      <div className="flex items-center gap-2 text-sm text-neutral-700">
        <IdCard size={16} className="text-violet-700" />
        <div className="font-semibold text-base">
          {teacher.name} <span className="text-neutral-500">({teacher.initial})</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <Info label="Designation" value={teacher.designation} />
        <Info label="Mobile" value={teacher.mobile} />
        <Info label="Email" value={teacher.email} />
        <Info label="Office Desk" value={teacher.officeDesk} />
        <div className="truncate">
          <span className="font-semibold text-neutral-700">Day Off</span>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {offs.length ? offs.map((d, i) => (
              <span key={`${d}-${i}`} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
                {d}
              </span>
            )) : <span className="font-medium text-neutral-900">—</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
