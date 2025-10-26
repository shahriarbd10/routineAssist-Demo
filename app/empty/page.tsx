"use client";

import React, { useEffect, useRef, useState } from "react";
import AppNav from "@/components/AppNav";
import { RefreshCw, DoorOpen, Tag, CalendarDays } from "lucide-react";
import { ERSlotPicker } from "@/components/Filters";
import EmptyRoomTab from "@/components/EmptyRoomTab";
import { ClassRow } from "@/lib/routine";
import BookingModal from "@/components/BookingModal";

/* ----------------------------- Timezone utils ----------------------------- */

const TZ = "Asia/Dhaka";

function dateToISOInTZ(d: Date, timeZone = TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function todayISO_TZ(timeZone = TZ) { return dateToISOInTZ(new Date(), timeZone); }
function dateFromISO_TZ(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
}
function weekdayFromISO_TZ(iso: string, timeZone = TZ) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(
    dateFromISO_TZ(iso)
  );
}

/** dd/mm/yyyy for UI display only */
function isoToDDMMYYYY_TZ(iso: string, timeZone = TZ): string {
  const d = dateFromISO_TZ(iso);
  const dd = new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone }).format(d);
  const mm = new Intl.DateTimeFormat("en-GB", { month: "2-digit", timeZone }).format(d);
  const yyyy = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone }).format(d);
  return `${dd}/${mm}/${yyyy}`;
}
/** Parse dd/mm/yyyy -> ISO (YYYY-MM-DD) in TZ; returns null if invalid */
function ddmmToISO_TZ(s: string, timeZone = TZ): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
  // verify round-trip
  const iso = dateToISOInTZ(dt, timeZone);
  const rt = isoToDDMMYYYY_TZ(iso, timeZone);
  return rt === `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}` ? iso : null;
}

/* --------- week helpers (Saturday → Friday) with fixed 7 tiles --------- */
function startOfWeekSaturday(iso: string) {
  const base = dateFromISO_TZ(iso);
  const dow = base.getUTCDay(); // Sun=0..Sat=6
  const saturdayIdx = 6;
  const delta = (dow - saturdayIdx + 7) % 7;
  return new Date(base.getTime() - delta * 86400000);
}
function addDays(d: Date, n: number) { return new Date(d.getTime() + n * 86400000); }
function isoFromDateInTZ(d: Date) { return dateToISOInTZ(d, TZ); }
function weekdayInTZ(d: Date) { return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: TZ }).format(d); }
function dayNumberInTZ(d: Date) { return new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: TZ }).format(d); }

/* ------------------------------ published types --------------------------- */

type PublishedPayload<T = any> = {
  data: T;
  meta?: { fileName?: string; version?: string; effectiveFrom?: string };
  updatedAt?: string;
};

type APIBooking = {
  room: string;
  slot: string;
  status: "requested" | "approved" | "declined" | "cancelled";
  userType: "student" | "teacher";
  student?: { batchSection?: string; course?: string; courseTeacherInitial?: string };
  teacher?: { initial?: string; batchSection?: string; course?: string };
};

/* -------------------------------- fetchers + meta helpers ----------------- */

async function safeJSON<T = any>(res: Response): Promise<T | null> {
  try { return JSON.parse(await res.text()) as T; } catch { return null; }
}
async function fetchJSON<T = any>(url: string) {
  try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? await safeJSON<T>(r) : null; }
  catch { return null; }
}
async function fetchPublished(kind: "routine") {
  const primary = `/api/published/${kind}`;
  const fallback = `/published/${kind}.json`;
  const a = await fetchJSON<PublishedPayload>(primary);
  if (a?.data) return a;
  return await fetchJSON<PublishedPayload>(fallback);
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

/* ----------------------- Lightweight top progress bar --------------------- */

function TopProgress({ show }: { show: boolean }) {
  return (
    <div
      className={[
        "pointer-events-none fixed left-0 right-0 top-[56px] z-30 md:top-[68px]",
        show ? "opacity-100" : "opacity-0",
        "transition-opacity duration-200",
      ].join(" ")}
      aria-hidden
    >
      <div className="mx-auto h-0.5 max-w-7xl overflow-hidden">
        <div className="relative h-full w-full bg-neutral-200">
          <div className="absolute inset-y-0 left-0 h-full w-1/3 animate-[indeterminate_1.1s_ease_infinite] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        </div>
      </div>
      <style>{`
        @keyframes indeterminate {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(50%); }
          100% { transform: translateX(120%); }
        }
      `}</style>
    </div>
  );
}

/* ----------------------------- Day tile row UI ---------------------------- */

function DayTileRow({
  anchorISO, valueISO, onPick,
}: {
  anchorISO: string; valueISO: string;
  onPick: (iso: string, weekday: string) => void;
}) {
  const start = startOfWeekSaturday(anchorISO);
  const anchorMs = dateFromISO_TZ(anchorISO).getTime();

  // Fixed set of 7 tiles from anchor week; wrap tiles before anchor by +7 days (one-time)
  const items = Array.from({ length: 7 }).map((_, i) => {
    const d0 = addDays(start, i);
    const d = d0.getTime() < anchorMs ? addDays(d0, 7) : d0;
    const iso = isoFromDateInTZ(d);
    const label = weekdayInTZ(d);
    const num = dayNumberInTZ(d);
    const selected = iso === valueISO;
    return { iso, label, num, selected };
  });

  return (
    <div className="flex w-full gap-2 overflow-hidden sm:gap-3">
      {items.map(({ iso, label, num, selected }) => (
        <button
          key={iso}
          onClick={() => onPick(iso, label)}
          className={[
            selected ? "flex-[1.6] sm:flex-[1]" : "flex-[0.8] sm:flex-[1]",
            "min-w-0 h-14 rounded-2xl border px-2 text-center font-medium leading-tight select-none",
            "transition-all duration-300 ease-out",
            selected
              ? "border-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm"
              : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50",
          ].join(" ")}
          aria-pressed={selected}
          title={`${label} ${num}`}
        >
          <div className="truncate">
            <div className="font-semibold text-[clamp(11px,3.4vw,16px)]">{num}</div>
            <div className={selected ? "opacity-90 text-white" : "opacity-80 text-neutral-700"}>
              {label.slice(0, 3)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function EmptyPage() {
  // initial selection
  const initialISO = todayISO_TZ();

  // selection state
  const [erDate, setErDate] = useState<string>(initialISO);
  const [erDay, setErDay] = useState<string>(weekdayFromISO_TZ(initialISO));
  const [erSlot, setErSlot] = useState<string>("");

  // Textbox display for dd/mm/yyyy
  const [erDateDisplay, setErDateDisplay] = useState<string>(isoToDDMMYYYY_TZ(initialISO));
  useEffect(() => {
    setErDateDisplay(isoToDDMMYYYY_TZ(erDate));
  }, [erDate]);

  // FIXED week anchor — never changes after first render
  const [weekAnchorISO] = useState<string>(initialISO);

  // data state
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "empty">("idle");
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState<string | undefined>();
  const [effectiveFrom, setEffectiveFrom] = useState<string | undefined>();

  const [bookings, setBookings] = useState<
    Array<{
      room: string;
      slot: string;
      status: "requested" | "approved";
      userType: "student" | "teacher";
      student?: { batchSection?: string; course?: string; courseTeacherInitial?: string };
      teacher?: { initial?: string; batchSection?: string; course?: string };
    }>
  >([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCtx, setModalCtx] = useState<{ room: string; slot: string } | null>(null);

  const initialLoadedOnce = useRef(false);

  const fetchRoutineOnly = async () => {
    const routine = await fetchPublished("routine");
    if (Array.isArray(routine?.data)) {
      setRows(routine!.data as ClassRow[]);
      setVersion(extractVersion(routine?.meta?.fileName, routine?.meta?.version));
      setEffectiveFrom(formatDate(routine?.meta?.effectiveFrom || routine?.updatedAt));
      return true;
    } else {
      setRows([]);
      setVersion(undefined);
      setEffectiveFrom(undefined);
      return false;
    }
  };

  const loadBookings = async (dateStr: string) => {
    const r = await fetch(`/api/bookings?public=1&date=${dateStr}`, { cache: "no-store" }).catch(
      () => null
    );
    const j = r ? await r.json().catch(() => ({ data: [] })) : { data: [] as APIBooking[] };
    const list: APIBooking[] = Array.isArray(j.data) ? (j.data as APIBooking[]) : [];
    setBookings(
      list
        .filter((b) => b.status === "requested" || b.status === "approved")
        .map((b) => ({
          room: b.room,
          slot: b.slot,
          status: b.status as "requested" | "approved",
          userType: b.userType,
          student: b.student,
          teacher: b.teacher,
        }))
    );
  };

  // First load: wait for mongo-backed data before showing content section
  useEffect(() => {
    (async () => {
      setStatus("loading");
      await Promise.all([fetchRoutineOnly(), loadBookings(erDate)]);
      setStatus("loaded");
      initialLoadedOnce.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setStatus("loading");
    await fetchRoutineOnly();
    setLoading(false);
    setStatus("loaded");
  };

  useEffect(() => {
    if (erDate) loadBookings(erDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erDate]);

  const onPickDateISO = (iso: string) => {
    setErDate(iso);
    setErDay(weekdayFromISO_TZ(iso));
  };
  const onPickDayFromRow = (iso: string, weekday: string) => {
    setErDate(iso);
    setErDay(weekday);
  };

  // dd/mm/yyyy input handlers
  const onDateInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setErDateDisplay(e.target.value);
  };
  const onDateInputBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    const parsed = ddmmToISO_TZ(erDateDisplay);
    if (parsed) {
      onPickDateISO(parsed);
    } else {
      // revert to last valid
      setErDateDisplay(isoToDDMMYYYY_TZ(erDate));
    }
  };

  // Native date picker (hidden) + trigger button (NO ts-expect-error needed)
  const nativeDateRef = useRef<HTMLInputElement>(null);
  const openNativePicker = () => {
    const el = nativeDateRef.current;
    if (!el) return;
    // Prefer modern showPicker when available
    const anyEl = el as unknown as { showPicker?: () => void; focus: () => void };
    if (typeof anyEl.showPicker === "function") {
      anyEl.showPicker();
    } else {
      anyEl.focus(); // fallback – many browsers open picker on focus
    }
  };

  const showTopLoader = status === "loading" || loading;

  return (
    <div className="relative min-h-screen bg-neutral-50">
      <AppNav />
      <TopProgress show={showTopLoader} />

      <main className="mx-auto max-w-7xl p-5 md:p-8">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-neutral-900 text-white shadow-sm">
              <DoorOpen className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Empty Rooms</h1>
              <p className="text-sm text-neutral-600">
                Choose a <b>day</b>, <b>time slot</b> and <b>date</b> to find free rooms.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {version && (
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm">
                <Tag className="size-3.5" /> ({version})
              </span>
            )}
            {effectiveFrom && (
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm">
                <CalendarDays className="size-3.5" />
                Effective from: {effectiveFrom}
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

        {/* Filter Card */}
        <div className="mb-4">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">Pick Day, Slot &amp; Date</h3>
              <div className="text-[11px] text-neutral-500">
                Selected: <b>{erDay}</b> • <b>{isoToDDMMYYYY_TZ(erDate)}</b>
              </div>
            </div>

            {status === "loading" && !initialLoadedOnce.current ? (
              <div className="space-y-4">
                <div className="h-14 animate-pulse rounded-xl bg-neutral-100" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="h-11 animate-pulse rounded-xl bg-neutral-100 md:col-span-2" />
                  <div className="h-11 animate-pulse rounded-xl bg-neutral-100" />
                </div>
              </div>
            ) : (
              <>
                {/* Day Row (ANCHOR FIXED) */}
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-neutral-800">Day</label>
                  <DayTileRow anchorISO={weekAnchorISO} valueISO={erDate} onPick={onPickDayFromRow} />
                </div>

                {/* Single aligned row: Time Slot (2 cols) + Date (1 col) */}
                <div className="mt-4 grid items-end gap-4 md:grid-cols-3">
                  {/* Time Slot */}
                  <div className="min-w-0 md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-neutral-800">Time Slot</label>
                    <div className="[&_label]:hidden [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-neutral-300 [&_select]:bg-white [&_select]:pl-9 [&_select]:pr-7 [&_select]:text-sm">
                      <ERSlotPicker value={erSlot} onChange={setErSlot} />
                    </div>
                  </div>

                  {/* Date (dd/mm/yyyy view, with calendar picker) */}
                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-medium text-neutral-800">Date</label>
                    <div className="relative">
                      {/* visible dd/mm/yyyy field */}
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/yyyy"
                        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 pr-10 text-sm text-neutral-900 outline-none ring-0 focus:border-neutral-500"
                        value={erDateDisplay}
                        onChange={onDateInputChange}
                        onBlur={onDateInputBlur}
                        aria-label="Selected date (dd/mm/yyyy)"
                      />
                      {/* calendar picker button */}
                      <button
                        type="button"
                        onClick={openNativePicker}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 hover:text-neutral-900"
                        aria-label="Open calendar"
                        title="Open calendar"
                      >
                        <CalendarDays className="size-4" />
                      </button>
                      {/* hidden native date input that drives the calendar */}
                      <input
                        ref={nativeDateRef}
                        type="date"
                        value={erDate}
                        onChange={(e) => onPickDateISO(e.target.value)}
                        className="sr-only"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mt-2">
          {status === "loading" && !initialLoadedOnce.current ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border bg-white" />
              ))}
            </div>
          ) : rows.length ? (
            <EmptyRoomTab
              rows={rows}
              erDay={erDay}
              erSlot={erSlot}
              setErDay={(d: string) => {
                // find matching weekday’s ISO within the fixed row
                const start = startOfWeekSaturday(weekAnchorISO);
                const anchorMs = dateFromISO_TZ(weekAnchorISO).getTime();
                for (let i = 0; i < 7; i++) {
                  const d0 = addDays(start, i);
                  const dt = d0.getTime() < anchorMs ? addDays(d0, 7) : d0;
                  if (weekdayInTZ(dt) === d) {
                    setErDate(isoFromDateInTZ(dt));
                    break;
                  }
                }
                setErDay(d);
              }}
              setErSlot={setErSlot}
              date={erDate}
              bookings={bookings}
              onBook={(room: string, slot: string) => {
                setModalCtx({ room, slot });
                setModalOpen(true);
              }}
            />
          ) : status === "empty" ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-600">
                <DoorOpen className="size-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">No routine found</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600">
                We couldn’t load a published routine right now. Try Refresh, or come back later.
              </p>
              <button
                onClick={loadData}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
              >
                <RefreshCw className="size-4" />
                Refresh
              </button>
            </div>
          ) : null}
        </div>

        <div className="h-8" />
      </main>

      {/* Booking modal */}
      {modalCtx && (
        <BookingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          date={erDate}
          day={erDay}
          slot={modalCtx.slot}
          room={modalCtx.room}
          onBooked={() => { loadBookings(erDate); }}
        />
      )}
    </div>
  );
}
