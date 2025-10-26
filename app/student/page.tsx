"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search, Tag, CalendarDays, ChevronDown, Layout, LayoutPanelTop } from "lucide-react";
import AppNav from "@/components/AppNav";
import { ClassRow, SLOTS, uc, isRoutineEntry } from "@/lib/routine";
import { exportStudentWeeklyPDF } from "@/lib/exporters";

/* ------------------------------ helpers ------------------------------ */

type PublishedPayload<T = any> = {
  data: T;
  meta?: { fileName?: string; version?: string; effectiveFrom?: string; [k: string]: any };
  updatedAt?: string;
};

async function safeJSON<T = any>(res: Response): Promise<T | null> {
  try { return JSON.parse(await res.text()) as T; } catch { return null; }
}
async function fetchJSON<T = any>(url: string): Promise<T | null> {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? await safeJSON<T>(r) : null; } catch { return null; }
}
async function fetchPublished(kind: "routine" | "tif") {
  const a = await fetchJSON<PublishedPayload>(`/api/published/${kind}`);
  if (a?.data) return a;
  return await fetchJSON<PublishedPayload>(`/published/${kind}.json`);
}

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

/** Fixed portal days – no Friday */
const ORDER = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"] as const;
type PortalDay = typeof ORDER[number];
const SHORT: Record<PortalDay,string> = {Saturday:"Sat",Sunday:"Sun",Monday:"Mon",Tuesday:"Tue",Wednesday:"Wed",Thursday:"Thu"};
const DOW: Record<string,number> = {Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};

function addDays(d: Date, n: number){ const t=new Date(d); t.setDate(d.getDate()+n); return t; }
function onOrAfter(from: Date, dow: number){ const delta=(dow-from.getDay()+7)%7; return addDays(from,delta); }
function buildChips(now = new Date()){
  return ORDER.map(day => {
    const date = onOrAfter(now, DOW[day]);
    return { full: day as PortalDay, short: SHORT[day], dd: date.getDate() };
  });
}
function parseSlotRange(slot: string){
  const s = slot.replace(/\s+/g,"");
  const [a,b] = s.split(/-|–|—/);
  return { start: a ?? slot, end: b ?? "" };
}
const SLOT_TIMES: Record<string,{start:string;end:string}> =
  Object.fromEntries(SLOTS.map(s => [s, parseSlotRange(s)]));

/* day-card background keyed by slot (time-wise colors) */
const SLOT_BG = ["bg-pink-50","bg-blue-50","bg-amber-50","bg-violet-50","bg-cyan-50","bg-emerald-50"];
function slotBg(slot: string){
  const i = Math.max(0, SLOTS.indexOf(slot));
  return SLOT_BG[i % SLOT_BG.length];
}

/** Extract teacher INITIAL only (handles "ZAF - Name" or "ZAF") */
function teacherInitialOnly(s?: string){
  return ((s || "").split(" - ")[0] || "").trim().toUpperCase();
}

/** Normalize a batch query: convert lab sections to base batch, e.g., 61_A1 → 61_A */
function normalizeBatchForSearch(q: string){
  const t = q.trim().toUpperCase();
  const m = t.match(/^(\d+_[A-Z])\d$/);
  if (m) return m[1];
  return t;
}

/* ------------------------------- page ------------------------------- */

export default function StudentPage(){
  const [rows,setRows] = useState<ClassRow[]>([]);
  const [status,setStatus] = useState<"" | "loading" | "empty">("");
  const [loading,setLoading] = useState(false);

  const [version, setVersion] = useState<string | undefined>();
  const [effectiveFrom, setEffectiveFrom] = useState<string | undefined>();

  const [qBatch,setQBatch] = useState("");
  const [appliedBatch,setAppliedBatch] = useState("");

  const [day,setDay] = useState<PortalDay | "">("");
  const [slot,setSlot] = useState("");

  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  // autocomplete state
  const [openList, setOpenList] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const chips = useMemo(() => buildChips(), []);
  useEffect(() => {
    if (!day){
      const wd = new Intl.DateTimeFormat("en-US",{weekday:"long"}).format(new Date());
      setDay(ORDER.includes(wd as PortalDay) ? (wd as PortalDay) : "Saturday");
    }
  },[day]);

  const loadData = async () => {
    setLoading(true);
    setStatus("loading");
    const j = await fetchPublished("routine");
    if (Array.isArray(j?.data)){
      setRows(j!.data as ClassRow[]);
      setVersion(extractVersion(j?.meta?.fileName, j?.meta?.version));
      setEffectiveFrom(formatDate(j?.meta?.effectiveFrom || j?.updatedAt));
      setStatus("");
    } else {
      setRows([]);
      setVersion(undefined);
      setEffectiveFrom(undefined);
      setStatus("empty");
    }
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  /* available batches for suggestions */
  const batchOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows){ const b = (r.batch || "").trim(); if (b) s.add(b); }
    // include base batches if only lab subsections exist
    for (const b of Array.from(s)){
      const m = b.match(/^(\d+_[A-Z])\d$/);
      if (m) s.add(m[1]);
    }
    return Array.from(s).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
  },[rows]);

  const normQ = qBatch.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normQ) return batchOptions.slice(0, 12);
    return batchOptions.filter(b => b.toLowerCase().includes(normQ)).slice(0, 12);
  }, [batchOptions, normQ]);

  useEffect(() => {
    function onDocClick(e: MouseEvent){
      const t = e.target as Node;
      if (inputRef.current && inputRef.current.contains(t)) return;
      if (listRef.current && listRef.current.contains(t)) return;
      setOpenList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const applyBatch = (val: string) => {
    const normalized = normalizeBatchForSearch(val || qBatch);
    setQBatch(normalized);          // reflect base batch in the input box
    setAppliedBatch(normalized);    // search with base batch
    setOpenList(false);
  };

  const onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!openList && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenList(true);
      return;
    }
    if (!openList) {
      if (e.key === "Enter") {
        const pick = filtered[activeIndex] || qBatch.trim();
        if (pick) applyBatch(pick);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[activeIndex] || qBatch.trim();
      if (pick) applyBatch(pick);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpenList(false);
    }
  };

  /* ---------------- Day view data ---------------- */
  const classesForDay = useMemo(() => {
    if (!appliedBatch || !day) return [];
    const QB = uc(appliedBatch);
    return rows
      .filter(r => r.day === day)
      .filter(r => !slot || r.slot === slot)
      .filter(r => uc(r.batch).includes(QB))
      .filter(isRoutineEntry)
      .sort((a,b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  },[rows,appliedBatch,day,slot]);

  /* ---------------- Week view data ---------------- */
  const weekly = useMemo(() => {
    if (!appliedBatch) return null;
    const QB = uc(appliedBatch);
    const by: Record<string, ClassRow[][]> = {};
    for (const d of ORDER as unknown as string[]) {
      by[d] = SLOTS.map((s) =>
        rows
          .filter((r) => r.day === d && r.slot === s)
          .filter((r) => uc(r.batch).includes(QB))
          .filter(isRoutineEntry)
      );
    }
    return by;
  }, [rows, appliedBatch]);

  /* ---------------- Week PDF (HTML print) ---------------- */
  const onExportWeeklyPDF = () => {
    if (!appliedBatch) return;
    exportStudentWeeklyPDF(rows, {
      days: ORDER as unknown as string[],
      batch: appliedBatch,
    });
  };

  return (
    <div className="relative min-h-screen pb-16 md:pb-0">
      <AppNav />

      {/* widened to match Teacher page */}
      <main className="mx-auto max-w-6xl p-4">
        {/* Header row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Student</h1>

          <div className="flex flex-wrap items-center gap-2">
            {version && (
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm">
                <Tag className="size-3.5" />
                Current Version: ({version})
              </span>
            )}
            {effectiveFrom && (
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm">
                <CalendarDays className="size-3.5" />
                Effective from: {effectiveFrom}
              </span>
            )}
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
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-60"
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /> Refresh
            </button>
          </div>
        </div>

        {/* Batch input with autocomplete */}
        <div className="rounded-2xl border card-surface p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <input
              ref={inputRef}
              value={qBatch}
              onChange={(e) => {
                setQBatch(e.target.value);
                setOpenList(true);
                setActiveIndex(0);
              }}
              onFocus={() => setOpenList(true)}
              onKeyDown={onInputKeyDown}
              placeholder="Enter Batch : 61_A"
              className="w-full rounded-xl border bg-neutral-50 pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 hover:border-neutral-300"
            />
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400"
              aria-hidden
            />

            {/* Dropdown */}
            {openList && (
              <div
                ref={listRef}
                className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
              >
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-neutral-500">No matches</div>
                ) : (
                  <div className="max-h-64 overflow-auto py-1">
                    {filtered.map((opt, idx) => {
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => applyBatch(opt)}
                          className={[
                            "block w-full cursor-pointer px-3 py-2 text-left text-sm",
                            active ? "bg-violet-50 text-violet-900" : "hover:bg-neutral-50"
                          ].join(" ")}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 text-[11px] text-neutral-500">
            Start typing to filter. Press <b>↓/↑</b> to navigate, <b>Enter</b> to apply.
          </div>

          <button
            onClick={() => applyBatch(qBatch.trim())}
            className="mt-3 w-full rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-600"
          >
            Get Schedule
          </button>
        </div>

        {/* View toggle appears once batch is applied */}
        {appliedBatch && (
          <div className="mt-3">
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
        )}

        {/* Day rail & quick slot pills only in Day view */}
        {appliedBatch && viewMode === "day" && (
          <>
            <div className="mt-4 day-rail">
              {chips.map(c => {
                const active = c.full === day;
                return (
                  <button
                    key={`${c.full}-${c.dd}`}
                    onClick={() => setDay(c.full)}
                    className={[
                      "chip rounded-2xl border px-2 py-2 text-center font-medium leading-tight select-none",
                      active
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent"
                        : "bg-neutral-100 text-neutral-800"
                    ].join(" ")}
                    aria-pressed={active}
                    title={`${c.full} ${c.dd}`}
                  >
                    <div className="font-semibold text-[clamp(11px,3.4vw,16px)]">{c.dd}</div>
                    <div className="opacity-80 text-[clamp(10px,2.9vw,14px)]">{c.short}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {SLOTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSlot(prev => prev===s ? "" : s)}
                  className={[
                    "rounded-full border px-2 py-1 text-xs",
                    slot===s ? "border-violet-600 bg-violet-600 text-white" : "bg-white"
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
              {slot && (
                <button onClick={() => setSlot("")} className="rounded-full border px-2 py-1 text-xs text-neutral-600">
                  Clear
                </button>
              )}
            </div>
          </>
        )}

        {/* Views */}
        {appliedBatch ? (
          viewMode === "day" ? (
            classesForDay.length === 0 ? (
              <div className="mt-6 rounded-2xl border card-surface p-3 text-sm text-neutral-700">
                No classes for <b>{appliedBatch}</b> on <b>{day || "this day"}</b>{slot ? <> at <b>{slot}</b></> : null}.
              </div>
            ) : (
              <>
                <section className="mt-4 space-y-3">
                  {classesForDay.map((row, i) => <ClassCard key={i} row={row} />)}
                </section>

                {/* Download PDF (Weekly) button also here */}
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
            )
          ) : (
            <>
              {/* Week-wise: days rows, slots columns */}
              <div className="overflow-x-auto mt-5">
                <div className="min-w-[1100px] rounded-xl border" id="student-weekly">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Day</th>
                        {SLOTS.map((s) => (
                          <th key={s} className="px-3 py-2 text-left font-semibold">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(ORDER as unknown as string[]).map((d) => (
                        <tr key={d} className="align-top">
                          <td className="whitespace-nowrap px-3 py-3 font-medium">{d}</td>
                          {SLOTS.map((s, si) => {
                            const items = weekly?.[d]?.[si] || [];
                            const bg = ["bg-pink-50","bg-blue-50","bg-amber-50","bg-violet-50","bg-cyan-50","bg-emerald-50"][si%6]; // time-wise color
                            return (
                              <td key={`${d}-${s}`} className="px-3 py-3">
                                <div className="space-y-2">
                                  {items.length ? (
                                    items.map((r, i) => {
                                      const init = teacherInitialOnly(r.teacher);
                                      return (
                                        <div key={i} className={`rounded-lg border p-2 ${bg}`}>
                                          <div className="font-medium">{r.course || "(Course)"}</div>
                                          {/* chips row */}
                                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                                            {r.batch && (
                                              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 bg-white/60">
                                                <b>{r.batch}</b>
                                              </span>
                                            )}
                                            {init && (
                                              <span className="inline-flex rounded-full border px-2 py-0.5 bg-white/60">
                                                {init}
                                              </span>
                                            )}
                                          </div>
                                          {/* room line below */}
                                          {r.room && (
                                            <div className="mt-1 text-xs text-neutral-700">📍 {r.room}</div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-xs text-neutral-400">—</div>
                                  )}
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

              {/* Download PDF (Weekly) */}
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
          )
        ) : (
          <div className="mt-6 rounded-2xl border card-surface p-3 text-sm text-neutral-700">
            Type your <b>Batch_Section</b> (e.g., <code>61_A</code> or lab <code>61_A1</code>) and press <b>Get Schedule</b> to see the full batch schedule.
          </div>
        )}
      </main>
    </div>
  );
}

/* ------------------------------- cards ------------------------------- */

function ClassCard({ row }: { row: ClassRow }){
  const t = SLOT_TIMES[row.slot] || { start: row.slot, end: "" };
  const bg = slotBg(row.slot);
  return (
    <div className={`relative grid grid-cols-[62px_1fr] gap-3 rounded-2xl border card-surface p-3 shadow-sm ${bg}`}>
      {/* time rail */}
      <div className="flex flex-col items-center text-[11px] text-neutral-600">
        <div className="rail-pill rounded-full px-2 py-0.5 font-medium">{t.start}</div>
        <div className="mt-2 h-12 w-px bg-white/60" />
        <div className="rail-pill rounded-full px-2 py-0.5 font-medium">{t.end}</div>
      </div>

      {/* body */}
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

function Info({ label, value }: { label: string; value: string }){
  return (
    <div className="truncate">
      <span className="font-semibold text-neutral-700">{label}</span>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}
