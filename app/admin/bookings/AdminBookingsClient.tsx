// src/app/admin/bookings/AdminBookingsClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  XCircle,
  Search,
  ArrowLeft,
  Filter,
  Loader2,
  User,
  IdCard,
  Quote,
  Clock4,
  Building2,
  Mail,
  User2,
  BadgeCheck,
  Eye,
  ShieldCheck,
  Phone,
  BookOpen,
  Signature,
} from "lucide-react";

/* ------------------------------- Types ---------------------------------- */

export type Booking = {
  _id: string;
  date: string; // YYYY-MM-DD (ISO; internal)
  day: string;
  slot: string;
  room: string;
  status: "requested" | "approved" | "declined" | "cancelled";
  userType: "student" | "teacher";
  student?: {
    name?: string;
    studentId?: string;
    batchSection?: string;
    mobile?: string;
    course?: string;
    courseTeacherInitial?: string;
    email?: string;
  };
  teacher?: {
    name?: string;
    teacherId?: string;
    initial?: string;
    mobile?: string;
    course?: string;
    batchSection?: string;
    email?: string;
  };
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TabKey = "all" | "requested" | "approved" | "declined";
type ViewMode = "upcoming" | "single";

/* ------------------------------- Date utils ----------------------------- */

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayIso(): string {
  return toIsoLocal(new Date());
}
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + n);
  return toIsoLocal(dt);
}

/** dd/mm/yyyy (view only) from ISO YYYY-MM-DD */
function ddmmFromIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dd = String(d ?? 1).padStart(2, "0");
  const mm = String(m ?? 1).padStart(2, "0");
  const yyyy = String(y ?? 1970);
  return `${dd}/${mm}/${yyyy}`;
}
/** Parse dd/mm/yyyy -> ISO (YYYY-MM-DD); null if invalid */
function ddmmToIso(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
  // sanity check round-trip
  const iso = toIsoLocal(new Date(dt));
  const back = ddmmFromIso(iso);
  const norm = `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`;
  return back === norm ? iso : null;
}
function weekdayShortFromIso(iso: string): string {
  const dt = new Date(iso + "T00:00:00");
  return dt.toLocaleDateString(undefined, { weekday: "short" });
}
/** e.g., "Thu, 25/10/2025" */
function labelFromIso(iso: string): string {
  return `${weekdayShortFromIso(iso)}, ${ddmmFromIso(iso)}`;
}

/* ------------------------------- Small UI atoms ------------------------- */

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "danger" | "brand";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    neutral: "border-neutral-200 bg-white text-neutral-800",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
    brand: "border-indigo-200 bg-indigo-50 text-indigo-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

const StatusBadge = ({ status }: { status: Booking["status"] }) => {
  const tone =
    status === "approved" ? "ok" : status === "requested" ? "warn" : status === "declined" ? "danger" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
};

/* ------------------------------- Detail Modal --------------------------- */

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-neutral-500 w-32">{label}</span>
      <span className="font-medium break-all">{value || "—"}</span>
    </div>
  );
}

function DetailModal({
  open,
  onClose,
  booking,
  onApprove,
  onDecline,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  busy: boolean;
}) {
  if (!open || !booking) return null;

  const metaLines = [
    { icon: <CalendarDays className="size-4" />, label: "Date", value: ddmmFromIso(booking.date) },
    { icon: <Clock4 className="size-4" />, label: "Slot", value: booking.slot },
    { icon: <Building2 className="size-4" />, label: "Room", value: booking.room },
    { icon: <BadgeCheck className="size-4" />, label: "Status", value: booking.status },
  ];

  const personLines =
    booking.userType === "student"
      ? [
          { icon: <User className="size-4" />, label: "Name", value: booking.student?.name },
          { icon: <IdCard className="size-4" />, label: "Student ID", value: booking.student?.studentId },
          { icon: <User2 className="size-4" />, label: "Batch/Section", value: booking.student?.batchSection },
          { icon: <Phone className="size-4" />, label: "Mobile", value: booking.student?.mobile },
          { icon: <BookOpen className="size-4" />, label: "Course Code", value: booking.student?.course },
          { icon: <Signature className="size-4" />, label: "Course Teacher Init.", value: booking.student?.courseTeacherInitial },
          { icon: <Mail className="size-4" />, label: "Email", value: booking.student?.email },
        ]
      : [
          { icon: <User className="size-4" />, label: "Name", value: booking.teacher?.name },
          { icon: <IdCard className="size-4" />, label: "Teacher ID", value: booking.teacher?.teacherId },
          { icon: <Signature className="size-4" />, label: "Initial", value: booking.teacher?.initial },
          { icon: <Phone className="size-4" />, label: "Mobile", value: booking.teacher?.mobile },
          { icon: <BookOpen className="size-4" />, label: "Course Code", value: booking.teacher?.course },
          { icon: <User2 className="size-4" />, label: "Batch/Section", value: booking.teacher?.batchSection },
          { icon: <Mail className="size-4" />, label: "Email", value: booking.teacher?.email },
        ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/30 bg-white/90 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-neutral-900 text-white">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <div className="text-lg font-semibold">Request Details</div>
              <div className="text-xs text-neutral-500">
                Submitted {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : "—"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-neutral-50"
          >
            Close
          </button>
        </div>

        {/* Meta */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-neutral-600">Booking</div>
            <div className="space-y-2 text-sm">
              {metaLines.map((m) => (
                <Row key={m.label} icon={m.icon} label={m.label} value={m.value} />
              ))}
              <Row icon={<CalendarDays className="size-4" />} label="Day" value={booking.day} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-neutral-600">Applied by</div>
            <div className="mb-2 text-sm">
              <div className="flex items-center gap-2">
                <User2 className="size-4" />
                <span className="text-neutral-500 w-32">Type</span>
                <span className="font-medium capitalize">{booking.userType}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {personLines.map((m) => (
                <Row key={m.label} icon={m.icon} label={m.label} value={m.value || "—"} />
              ))}
            </div>
          </div>
        </div>

        {booking.comment && (
          <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-neutral-600">
              <Quote className="size-4" /> Comment
            </div>
            <div className="text-sm text-neutral-800">{booking.comment}</div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-neutral-50"
          >
            Close
          </button>

          {booking.status === "requested" ? (
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => onDecline(booking._id)}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-sm text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                <XCircle className="size-4" /> Decline
              </button>
              <button
                disabled={busy}
                onClick={() => onApprove(booking._id)}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                <Check className="size-4" /> Approve
              </button>
            </div>
          ) : (
            <Badge tone={booking.status === "approved" ? "ok" : booking.status === "declined" ? "danger" : "neutral"}>
              Current: {booking.status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Page ----------------------------------- */

export default function AdminBookingsClient() {
  // Mode + date (ISO internal)
  const [mode, setMode] = useState<ViewMode>("upcoming");
  const [date, setDate] = useState<string>(todayIso()); // ISO internal

  // Visible dd/mm/yyyy text (view layer)
  const [dateDisplay, setDateDisplay] = useState<string>(ddmmFromIso(todayIso()));
  useEffect(() => {
    setDateDisplay(ddmmFromIso(date));
  }, [date]);

  const [rows, setRows] = useState<Booking[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [busy, setBusy] = useState(false);

  // Detail modal
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Booking | null>(null);

  // Native date input (hidden) to get the picker
  const datePickerRef = useRef<HTMLInputElement>(null);
  const openNativePicker = () => {
    const el = datePickerRef.current;
    if (!el) return;
    // prefer modern showPicker
    const anyEl = el as unknown as { showPicker?: () => void; focus: () => void };
    if (typeof anyEl.showPicker === "function") {
      anyEl.showPicker();
    } else {
      anyEl.focus();
    }
  };

  // Build the 6-day window (today + next 5)
  const upcomingDates = useMemo(() => {
    const start = todayIso();
    return Array.from({ length: 6 }, (_, i) => addDays(start, i));
  }, []);

  // Load bookings based on mode
  const load = async () => {
    setBusy(true);
    try {
      let list: Booking[] = [];
      if (mode === "upcoming") {
        const results = await Promise.all(
          upcomingDates.map((d) =>
            fetch(`/api/bookings?date=${d}`, { cache: "no-store" })
              .then((r) => r.json())
              .catch(() => ({ data: [] }))
          )
        );
        for (const r of results) {
          if (Array.isArray(r?.data)) list.push(...(r.data as Booking[]));
        }
      } else {
        const r = await fetch(`/api/bookings?date=${date}`, { cache: "no-store" }).catch(() => null);
        const j = r ? await r.json().catch(() => ({ data: [] })) : { data: [] as Booking[] };
        if (Array.isArray(j.data)) list = j.data as Booking[];
      }

      // Sort: newest first by createdAt/date
      list.sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : Date.parse(a.date);
        const tb = b.createdAt ? Date.parse(b.createdAt) : Date.parse(b.date);
        return tb - ta;
      });

      setRows(list);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, date]);

  // Actions
  const setStatus = async (id: string, status: "approved" | "declined") => {
    setBusy(true);
    try {
      await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).catch(() => null);
      await load();
      setCurrent((prev) => (prev && prev._id === id ? { ...prev, status } : prev));
    } finally {
      setBusy(false);
    }
  };

  const approve = (id: string) => setStatus(id, "approved");
  const decline = (id: string) => setStatus(id, "declined");

  // Counts (for tabs)
  const counts = useMemo(() => {
    const c = { all: rows.length, requested: 0, approved: 0, declined: 0 };
    for (const r of rows) {
      if (r.status === "requested") c.requested++;
      if (r.status === "approved") c.approved++;
      if (r.status === "declined") c.declined++;
    }
    return c;
  }, [rows]);

  // Filter + search
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (tab === "all" ? true : r.status === tab))
      .filter((r) => {
        if (!needle) return true;
        const hay = [
          r.room,
          r.slot,
          r.day,
          r.date,
          r.userType,
          r.student?.name,
          r.student?.studentId,
          r.student?.batchSection,
          r.student?.mobile,
          r.student?.course,
          r.student?.courseTeacherInitial,
          r.student?.email,
          r.teacher?.name,
          r.teacher?.teacherId,
          r.teacher?.initial,
          r.teacher?.mobile,
          r.teacher?.course,
          r.teacher?.batchSection,
          r.teacher?.email,
          r.comment,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
  }, [rows, tab, q]);

  // Group filtered by date (ascending) for section headers
  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of filtered) {
      if (!map.has(b.date)) map.set(b.date, []);
      map.get(b.date)!.push(b);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((k) => ({ date: k, items: map.get(k)!.slice() }));
  }, [filtered]);

  const TabBtn = ({ id, label, k }: { id: string; label: string; k: TabKey }) => {
    const active = tab === k;
    return (
      <button
        onClick={() => setTab(k)}
        className={[
          "rounded-full px-3 py-1.5 text-xs font-medium border",
          active
            ? "bg-neutral-900 text-white border-neutral-900"
            : "bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50",
        ].join(" ")}
        aria-controls={id}
      >
        {label}
      </button>
    );
  };

  // visible dd/mm field handlers
  const onDateDisplayChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setDateDisplay(e.target.value);
  };
  const onDateDisplayBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    const iso = ddmmToIso(dateDisplay);
    if (iso) {
      setDate(iso);
    } else {
      setDateDisplay(ddmmFromIso(date)); // revert to last valid
    }
  };

  return (
    <>
      <main className="mx-auto max-w-7xl p-6">
        {/* Top bar */}
        <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-neutral-200 bg-white/90 px-6 py-3 backdrop-blur-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-3">
              <a
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                <ArrowLeft className="size-4" />
                Back
              </a>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Booking Requests</h1>
                <p className="text-sm text-neutral-600">
                  {mode === "upcoming" ? (
                    <>Showing <b>today + next 5 days</b>.</>
                  ) : (
                    <>Showing date: <b>{ddmmFromIso(date)}</b>.</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {/* Mode switch */}
              <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-sm shadow-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    className="accent-neutral-900"
                    checked={mode === "upcoming"}
                    onChange={() => setMode("upcoming")}
                  />
                  <span>Upcoming (6 days)</span>
                </label>
                <span className="mx-1 text-neutral-300">|</span>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mode"
                    className="accent-neutral-900"
                    checked={mode === "single"}
                    onChange={() => setMode("single")}
                  />
                  <span>Pick a date</span>
                </label>
              </div>

              {/* Date (single visible field: dd/mm/yyyy) with calendar picker */}
              <div
                className={[
                  "relative inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-sm shadow-sm",
                  mode === "single" ? "" : "opacity-60",
                ].join(" ")}
                aria-disabled={mode !== "single"}
              >
                <CalendarDays className="size-4" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/yyyy"
                  className="rounded-md border border-neutral-200 px-2 py-1 text-sm text-neutral-900 outline-none disabled:opacity-70 pr-8"
                  value={dateDisplay}
                  onChange={onDateDisplayChange}
                  onBlur={onDateDisplayBlur}
                  disabled={mode !== "single"}
                  aria-label="Date (dd/mm/yyyy)"
                />
                {/* calendar trigger */}
                <button
                  type="button"
                  onClick={openNativePicker}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-600 hover:text-neutral-900"
                  title="Open calendar"
                  aria-label="Open calendar"
                  disabled={mode !== "single"}
                >
                  <CalendarDays className="size-4" />
                </button>
                {/* hidden native date input that actually drives the ISO value */}
                <input
                  ref={datePickerRef}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>

              {/* Search */}
              <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-sm shadow-sm">
                <Search className="size-4 text-neutral-500" />
                <input
                  placeholder="Search room / person / id / email / course code / mobile..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-72 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + counts */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TabBtn id="tab-all" label={`All (${counts.all})`} k="all" />
          <TabBtn id="tab-req" label={`Requested (${counts.requested})`} k="requested" />
          <TabBtn id="tab-app" label={`Approved (${counts.approved})`} k="approved" />
          <TabBtn id="tab-dec" label={`Declined (${counts.declined})`} k="declined" />
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700">
            <Filter className="size-3.5" />
            {busy ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3.5 animate-spin" /> Loading…
              </span>
            ) : (
              `${filtered.length} result${filtered.length === 1 ? "" : "s"}`
            )}
          </span>
        </div>

        {/* Grouped list */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-600">
            No requests match your filters.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ date: d, items }) => (
              <section key={d}>
                <div className="mb-2 sticky -top-1 z-10 bg-white/80 backdrop-blur px-1 py-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {labelFromIso(d)} <span className="text-neutral-400">• {items.length}</span>
                  </h3>
                </div>

                <div className="grid gap-3">
                  {items.map((b) => (
                    <article
                      key={b._id}
                      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                    >
                      {/* Top line */}
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
                        <StatusBadge status={b.status} />
                        <Badge tone="brand">
                          <Clock4 className="size-3.5" />
                          {b.slot}
                        </Badge>
                        <Badge>
                          <CalendarDays className="size-3.5" />
                          {ddmmFromIso(b.date)}
                        </Badge>
                        <Badge>
                          <Building2 className="size-3.5" /> Room {b.room}
                        </Badge>
                        <span className="text-neutral-400">•</span>
                        <span>{b.day}</span>
                        <span className="ml-auto text-[11px] text-neutral-500">
                          {b.createdAt ? `Submitted ${new Date(b.createdAt).toLocaleString()}` : ""}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="text-sm text-neutral-800">
                          {b.userType === "student" ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="inline-flex items-center gap-1.5">
                                <User className="size-4" />
                                <b>{b.student?.name || "—"}</b>
                              </span>
                              {b.student?.studentId && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <IdCard className="size-4" />
                                  {b.student.studentId}
                                </span>
                              )}
                              {b.student?.batchSection && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <User2 className="size-4" />
                                  {b.student.batchSection}
                                </span>
                              )}
                              {b.student?.email && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600 break-all">
                                  <Mail className="size-4" />
                                  {b.student.email}
                                </span>
                              )}
                              {b.student?.mobile && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <Phone className="size-4" />
                                  {b.student.mobile}
                                </span>
                              )}
                              {b.student?.course && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <BookOpen className="size-4" />
                                  Course Code: {b.student.course}
                                </span>
                              )}
                              {b.student?.courseTeacherInitial && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <Signature className="size-4" />
                                  CTI: {b.student.courseTeacherInitial}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="inline-flex items-center gap-1.5">
                                <User className="size-4" />
                                <b>{b.teacher?.name || "—"}</b>
                              </span>
                              {b.teacher?.teacherId && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <IdCard className="size-4" />
                                  {b.teacher.teacherId}
                                </span>
                              )}
                              {b.teacher?.initial && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <Signature className="size-4" />
                                  {b.teacher.initial}
                                </span>
                              )}
                              {b.teacher?.email && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600 break-all">
                                  <Mail className="size-4" />
                                  {b.teacher.email}
                                </span>
                              )}
                              {b.teacher?.mobile && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <Phone className="size-4" />
                                  {b.teacher.mobile}
                                </span>
                              )}
                              {b.teacher?.course && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <BookOpen className="size-4" />
                                  Course Code: {b.teacher.course}
                                </span>
                              )}
                              {b.teacher?.batchSection && (
                                <span className="inline-flex items-center gap-1.5 text-neutral-600">
                                  <User2 className="size-4" />
                                  {b.teacher.batchSection}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-neutral-600 md:text-right">
                          {b.comment ? (
                            <span className="inline-flex items-center gap-1 text-neutral-700">
                              <Quote className="size-4 text-neutral-400" />
                              <em>“{b.comment}”</em>
                            </span>
                          ) : (
                            <span className="text-neutral-400">No comment</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            setCurrent(b);
                            setOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-neutral-50"
                        >
                          <Eye className="size-4" /> View
                        </button>

                        {b.status === "requested" ? (
                          <>
                            <button
                              onClick={() => approve(b._id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm text-white hover:opacity-95 disabled:opacity-60"
                            >
                              <Check className="size-4" /> Approve
                            </button>
                            <button
                              onClick={() => decline(b._id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-sm text-white hover:opacity-95 disabled:opacity-60"
                            >
                              <XCircle className="size-4" /> Decline
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-neutral-500">No actions available</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <DetailModal
        open={open}
        onClose={() => setOpen(false)}
        booking={current}
        onApprove={approve}
        onDecline={decline}
        busy={busy}
      />
    </>
  );
}
