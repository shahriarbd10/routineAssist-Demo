// src/app/admin/AdminPanelClient.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudUpload,
  FilePlus2,
  ExternalLink,
  Trash2,
  LogOut,
  RefreshCw,
  CalendarClock,
  Accessibility as AccessibilityIcon,
  Zap,
  Sparkles,
} from "lucide-react";

type UploadMeta = { version?: string; effectiveFrom?: string };

type CloudFile = {
  key: string;
  url: string;
  size?: number;
  uploadedAt?: string;
  contentType?: string | null;
  fileName?: string;
  meta?: UploadMeta | null;
};

type ConfirmState =
  | { show: false }
  | {
      show: true;
      kind: "routine" | "tif";
      incomingFile: File;
      replacing: boolean;
      currentName?: string | null;
      version: string;
      effectiveFrom: string;
    };

type PublishState =
  | { show: false }
  | {
      show: true;
      only: ("routine" | "tif")[];
      busy?: boolean;
    };

type Toast = { show: boolean; ok: boolean; msg: string };

async function safeJson(res: Response) {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return { ok: false, error: t };
  }
}
async function fetchOne(kind: "routine" | "tif") {
  const r = await fetch(`/api/files?kind=${kind}`, { cache: "no-store" });
  const j = await safeJson(r);
  return (j?.item ?? null) as CloudFile | null;
}
async function upload(kind: "routine" | "tif", file: File, meta?: UploadMeta) {
  const fd = new FormData();
  fd.append("kind", kind);
  fd.append("file", file);
  if (meta?.version) fd.append("version", meta.version);
  if (meta?.effectiveFrom) fd.append("effectiveFrom", meta.effectiveFrom);
  const res = await fetch("/api/files", { method: "POST", body: fd });
  const j = await safeJson(res);
  if (!res.ok || !j?.ok) throw new Error(j?.error || "Upload failed");
  return j as { ok: true; key: string; url: string };
}
async function removeOne(kind: "routine" | "tif") {
  const r = await fetch(`/api/files?kind=${kind}`, { method: "DELETE" });
  const j = await safeJson(r);
  if (!r.ok || !j?.ok) throw new Error(j?.error || "Delete failed");
}

export default function AdminPanelClient() {
  const [routine, setRoutine] = useState<CloudFile | null>(null);
  const [tif, setTif] = useState<CloudFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>({ show: false, ok: true, msg: "" });

  const [confirm, setConfirm] = useState<ConfirmState>({ show: false });
  const [publish, setPublish] = useState<PublishState>({ show: false });

  async function refresh() {
    setBusy(true);
    try {
      const [r, t] = await Promise.all([fetchOne("routine"), fetchOne("tif")]);
      if (r) r.fileName = r.key.split("/").pop() || r.key;
      if (t) t.fileName = t.key.split("/").pop() || t.key;
      setRoutine(r);
      setTif(t);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  const requestUpload = (kind: "routine" | "tif") => (file?: File) => {
    if (!file) return;
    const current = kind === "routine" ? routine : tif;
    setConfirm({
      show: true,
      kind,
      incomingFile: file,
      replacing: !!current,
      currentName: current?.fileName ?? null,
      version: current?.meta?.version || "",
      effectiveFrom: current?.meta?.effectiveFrom?.slice(0, 10) || "",
    });
  };

  const confirmUpload = async () => {
    if (!confirm.show) return;
    try {
      setBusy(true);
      await upload(confirm.kind, confirm.incomingFile, {
        version: confirm.version?.trim() || undefined,
        effectiveFrom: confirm.effectiveFrom?.trim() || undefined,
      });
      await refresh();
      setToast({
        show: true,
        ok: true,
        msg: confirm.replacing
          ? `${confirm.kind.toUpperCase()} replaced with ${confirm.incomingFile.name}.`
          : `${confirm.kind.toUpperCase()} uploaded: ${confirm.incomingFile.name}.`,
      });
      setPublish({ show: true, only: [confirm.kind] });
    } catch (e: any) {
      setToast({ show: true, ok: false, msg: e?.message || "Upload failed" });
    } finally {
      setBusy(false);
      setConfirm({ show: false });
    }
  };

  const onDelete = (kind: "routine" | "tif") => async () => {
    try {
      setBusy(true);
      await removeOne(kind);
      await refresh();
      setToast({ show: true, ok: true, msg: `${kind.toUpperCase()} removed.` });
    } catch (e: any) {
      setToast({ show: true, ok: false, msg: e?.message || "Delete failed" });
    } finally {
      setBusy(false);
    }
  };

  const openPublish = (only?: ("routine" | "tif")[]) => {
    const kinds: ("routine" | "tif")[] =
      only && only.length
        ? only
        : ([routine ? "routine" : null, tif ? "tif" : null].filter(Boolean) as (
            | "routine"
            | "tif"
          )[]);
    setPublish({ show: true, only: kinds.length ? kinds : ["routine", "tif"] });
  };
  const toggleKind = (k: "routine" | "tif") => {
    if (!publish.show) return;
    const set = new Set(publish.only);
    if (set.has(k)) set.delete(k);
    else set.add(k);
    setPublish({ ...publish, only: Array.from(set) as ("routine" | "tif")[] });
  };
  const doPublish = async () => {
    if (!publish.show || !publish.only.length) {
      setPublish({ show: false });
      return;
    }
    try {
      setPublish({ ...publish, busy: true });
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ only: publish.only }),
      });
      const j = await safeJson(res);
      if (!res.ok || j?.ok === false) throw new Error(j?.error || "Publish failed");
      setToast({
        show: true,
        ok: true,
        msg: `Published: ${publish.only.map((s) => s.toUpperCase()).join(" & ")}`,
      });
    } catch (e: any) {
      setToast({ show: true, ok: false, msg: e?.message || "Publish failed" });
    } finally {
      setPublish({ show: false });
      refresh();
    }
  };

  return (
    <div className="relative min-h-screen text-neutral-900">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tr from-indigo-400 via-fuchsia-400 to-pink-400 opacity-30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tr from-cyan-400 via-teal-300 to-emerald-300 opacity-30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(60rem_60rem_at_120%_10%,rgba(99,102,241,0.15),transparent_60%),radial-gradient(50rem_50rem_at_0%_110%,rgba(16,185,129,0.12),transparent_60%)]" />
      </div>

      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-white/30 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 grid place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/30">
              <Cloud className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">Routine Admin</div>
              <div className="text-xs text-neutral-600">
                Single-file uploads with versioning &amp; effective date
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={busy}
              title="Refresh"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/70 px-3 py-1.5 text-sm shadow-sm ring-1 ring-black/5 transition hover:bg-white disabled:opacity-60"
            >
              <RefreshCw
                className={`size-4 transition ${busy ? "animate-spin" : "group-hover:rotate-180"}`}
              />
              Refresh
            </button>

            {/* Logout → clears JWT cookie and redirects to login */}
            <a
              href="/api/auth/logout"
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-black"
              title="Sign out"
            >
              <LogOut className="size-4" /> Logout
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-5 py-8 space-y-8">
        {/* Feature highlights — 3 cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<AccessibilityIcon className="size-5" />}
            title="Accessibility"
            badge="Inclusive by design"
            desc="Clear layouts, readable UI, and simple flows so admins get things done without friction."
          />
          <FeatureCard
            icon={<Zap className="size-5" />}
            title="Efficient"
            badge="Fast workflows"
            desc="Upload, replace, and publish in a few clicks — with inline status and toasts."
          />
          <FeatureCard
            icon={<Sparkles className="size-5" />}
            title="Simple"
            badge="No clutter"
            desc="Only the essentials: routine, TIF, and bookings — nothing extra to slow you down."
          />
        </section>

        {/* Upload panels */}
        <section className="grid gap-6 md:grid-cols-2">
          <GlassCard>
            <HeaderLine
              icon={<CloudUpload className="size-4" />}
              title="Routine (CSV/XLSX)"
              meta={
                routine ? (
                  <MetaBar file={routine} />
                ) : (
                  <span className="text-xs text-neutral-600">No file stored</span>
                )
              }
            />
            <UploaderRow
              file={routine}
              busy={busy}
              onPick={requestUpload("routine")}
              onDelete={onDelete("routine")}
            />
          </GlassCard>

          <GlassCard>
            <HeaderLine
              icon={<CloudUpload className="size-4" />}
              title="Teacher Info (TIF) — CSV/XLSX"
              meta={
                tif ? (
                  <MetaBar file={tif} />
                ) : (
                  <span className="text-xs text-neutral-600">No file stored</span>
                )
              }
            />
            <UploaderRow file={tif} busy={busy} onPick={requestUpload("tif")} onDelete={onDelete("tif")} />
          </GlassCard>
        </section>

        {/* Bookings Panel */}
        <section>
          <GlassCard>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm">
                  <CalendarClock className="size-4" />
                </span>
                Room Booking Requests
              </h2>
              <a
                href="/admin/bookings"
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
              >
                Open panel
              </a>
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              Approve or decline requests across all rooms. Filter by date; live updates after actions.
            </p>
          </GlassCard>
        </section>

        {/* Big Publish button */}
        <section className="pt-2">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => openPublish()}
              disabled={busy}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white text-base font-semibold shadow-lg transition hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2"
              title="Publish to /published/*.json (used by portals)"
            >
              <CloudUpload className="size-5" />
              Publish to portals
            </button>
            <p className="mt-2 text-center text-xs text-neutral-600">
              Uses the latest uploaded Routine and TIF. You can choose which ones in the next step.
            </p>
          </div>
        </section>
      </main>

      {/* Confirm Replace/Upload Modal */}
      {confirm.show && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/80 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-base font-semibold">
              {confirm.replacing ? "Replace existing file?" : "Upload file?"}
            </h3>
            <p className="mt-2 text-sm text-neutral-700 leading-relaxed">
              Kind: <b className="uppercase">{confirm.kind}</b>
              <br />
              New file: <b>{confirm.incomingFile.name}</b>
              {confirm.replacing && (
                <>
                  <br />
                  Currently stored: <b>{confirm.currentName || "(unknown)"} </b>
                </>
              )}
            </p>

            {/* Meta inputs */}
            <div className="mt-4 grid gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-neutral-700">Version</label>
                <input
                  type="text"
                  value={confirm.version}
                  onChange={(e) => setConfirm({ ...confirm, version: e.target.value })}
                  placeholder="e.g., v1.2 Final"
                  className="w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm shadow-inner outline-none transition placeholder:text-neutral-400 focus:bg-white"
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-neutral-700">Effective From</label>
                <input
                  type="date"
                  value={confirm.effectiveFrom}
                  onChange={(e) => setConfirm({ ...confirm, effectiveFrom: e.target.value })}
                  className="w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm shadow-inner outline-none transition focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirm({ show: false })}
                className="rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm transition hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
              >
                {confirm.replacing ? "Replace" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {publish.show && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/80 p-5 shadow-2xl backdrop-blur-xl">
            <h3 className="text-base font-semibold">Publish to portals?</h3>
            <p className="mt-2 text-sm text-neutral-700">
              This will generate/overwrite the public JSON used by the UI.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publish.only.includes("routine")}
                  onChange={() => toggleKind("routine")}
                />
                <span className="font-medium">Routine</span>
                <span className="ml-auto text-xs text-neutral-600">
                  {routine?.fileName || "—"}
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={publish.only.includes("tif")}
                  onChange={() => toggleKind("tif")}
                />
                <span className="font-medium">Teacher Info (TIF)</span>
                <span className="ml-auto text-xs text-neutral-600">
                  {tif?.fileName || "—"}
                </span>
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPublish({ show: false })}
                className="rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm transition hover:bg-white"
              >
                Not now
              </button>
              <button
                onClick={doPublish}
                disabled={publish.only.length === 0 || publish.busy}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {publish.busy
                  ? "Publishing…"
                  : `Publish ${publish.only.map((k) => k.toUpperCase()).join(" & ")}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`rounded-xl border px-3 py-2 text-sm shadow-lg backdrop-blur-md ${
              toast.ok
                ? "border-emerald-200/70 bg-emerald-50/80 text-emerald-700"
                : "border-rose-200/70 bg-rose-50/80 text-rose-700"
            }`}
            onAnimationEnd={() => setToast({ ...toast, show: false })}
          >
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

/* Pieces */
function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-xl backdrop-blur-xl transition hover:border-white/60 hover:bg-white/80">
      {children}
    </div>
  );
}
function HeaderLine({ icon, title, meta }: { icon: React.ReactNode; title: string; meta?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span className="grid size-7 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm">
          {icon}
        </span>
        {title}
      </h2>
      {meta}
    </div>
  );
}
function FeatureCard({
  icon,
  title,
  badge,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  desc?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/40 bg-white/70 p-4 shadow-xl backdrop-blur-xl hover:bg-white/80 hover:border-white/60 transition">
      <div className="flex items-center gap-3 text-neutral-900">
        <div className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-sm">
          {icon}
        </div>
        <div className="text-sm font-semibold">{title}</div>
        {badge && (
          <span className="ml-auto rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
            {badge}
          </span>
        )}
      </div>
      {desc && <p className="mt-2 text-xs text-neutral-600 leading-relaxed">{desc}</p>}
    </div>
  );
}
function MetaBar({ file }: { file: CloudFile | null }) {
  if (!file) return <div className="mt-1 text-xs text-neutral-600">No file stored</div>;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-800">
      <span className="mr-1 truncate max-w-[12rem] rounded-full border px-2 py-0.5 font-medium bg-white/70">
        {file.fileName || "(unknown)"}
      </span>
      {file.meta?.version && (
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-700">v {file.meta.version}</span>
      )}
      {file.meta?.effectiveFrom && (
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
          from {new Date(file.meta.effectiveFrom).toLocaleDateString()}
        </span>
      )}
      <span className="rounded-full border px-2 py-0.5">{file.contentType || "—"}</span>
      <span className="rounded-full border px-2 py-0.5">{file.size ? `${file.size} bytes` : "size—"}</span>
      <span className="rounded-full border px-2 py-0.5">
        {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : "time—"}
      </span>
    </div>
  );
}
function UploaderRow({
  file,
  busy,
  onPick,
  onDelete,
}: {
  file: CloudFile | null;
  busy: boolean;
  onPick: (file?: File) => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-95">
        <FilePlus2 className="size-4" /> {file ? "Replace file" : "Choose file"}
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          disabled={busy}
          onChange={(e) => onPick(e.target.files?.[0])}
          className="hidden"
        />
      </label>

      {file && (
        <>
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm shadow-sm transition hover:bg-white"
          >
            <ExternalLink className="size-4" /> Open
          </a>
          <button
            onClick={onDelete}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-sm text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
          >
            <Trash2 className="size-4" /> Remove
          </button>
        </>
      )}
    </div>
  );
}
