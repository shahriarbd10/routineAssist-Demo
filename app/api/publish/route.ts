// src/app/api/publish/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

import {
  setJSON,
  delJSON,
  exists,
  ROUTINE_KEY,
  TIF_KEY,
  getSingle,
  getUploadMeta,
} from "@/lib/cloudStorage";
import { parseAnyNormalized } from "@/lib/parseNormalized";
import { parseTeacherInfoFromArrayBuffer } from "@/lib/teachers";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------- utils -------------------------------- */

function j(data: any, init?: number | ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    status: typeof init === "number" ? init : init?.status ?? 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function nameFromKey(key?: string) {
  if (!key) return undefined;
  const i = key.lastIndexOf("/");
  return i >= 0 ? key.slice(i + 1) : key;
}

function isHttp(url?: string) {
  return !!url && /^https?:\/\//i.test(url);
}

/** Normalize Node Buffer → real ArrayBuffer */
function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  return ab;
}

/** Read latest uploaded file into an ArrayBuffer, from disk if local, else via HTTP. */
async function readUploadToArrayBuffer(
  kind: "routine" | "tif",
  url?: string,
  key?: string
): Promise<ArrayBuffer> {
  if (key && (key.startsWith("uploads/") || key.startsWith("/uploads/"))) {
    const rel = key.startsWith("/") ? key.slice(1) : key;
    const filePath = path.join(process.cwd(), "public", rel);
    const buf = await fs.readFile(filePath);
    return bufferToArrayBuffer(buf);
  }

  if (isHttp(url)) {
    const resp = await fetch(url!, { cache: "no-store" });
    if (!resp.ok) throw new Error(`Failed to fetch uploaded ${kind} via HTTP`);
    return await resp.arrayBuffer();
  }

  throw new Error(
    `No readable source for ${kind}: url="${url ?? "-"}" key="${key ?? "-"}"`
  );
}

/* --------------------------------- POST --------------------------------- */
/**
 * POST /api/publish   (ADMIN ONLY)
 * Body: { routine?: any[], tif?: any[] }
 *
 * If arrays are NOT provided, we parse the latest uploads:
 *   uploads/routine.*  -> published/routine.json
 *   uploads/tif.*      -> published/tif.json
 */
export async function POST(req: NextRequest) {
  // 🔐 Admin required
  const admin = await requireAdmin(req);
  if (!admin) return j({ ok: false, error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const now = new Date().toISOString();

    const [rSingle, tSingle, rMeta, tMeta] = await Promise.all([
      getSingle("routine").catch(() => null),
      getSingle("tif").catch(() => null),
      getUploadMeta("routine").catch(() => null),
      getUploadMeta("tif").catch(() => null),
    ]);

    const routineFileName = nameFromKey(rSingle?.key);
    const tifFileName = nameFromKey(tSingle?.key);

    // ---------- ROUTINE ----------
    if (Array.isArray(body?.routine)) {
      await setJSON(ROUTINE_KEY, {
        data: body.routine,
        meta: { fileName: routineFileName, ...(rMeta || {}) },
        updatedAt: now,
      });
    } else if (rSingle?.url || rSingle?.key) {
      const buf = await readUploadToArrayBuffer("routine", rSingle?.url, rSingle?.key);
      const { rows } = await parseAnyNormalized(rSingle?.key || "routine.xlsx", buf);
      await setJSON(ROUTINE_KEY, {
        data: rows,
        meta: { fileName: routineFileName, ...(rMeta || {}) },
        updatedAt: now,
      });
    }

    // ------------ TIF ------------
    if (Array.isArray(body?.tif)) {
      await setJSON(TIF_KEY, {
        data: body.tif,
        meta: { fileName: tifFileName, ...(tMeta || {}) },
        updatedAt: now,
      });
    } else if (tSingle?.url || tSingle?.key) {
      const buf = await readUploadToArrayBuffer("tif", tSingle?.url, tSingle?.key);
      const list = await parseTeacherInfoFromArrayBuffer(buf, tSingle?.key || "tif.xlsx");
      await setJSON(TIF_KEY, {
        data: list,
        meta: { fileName: tifFileName, ...(tMeta || {}) },
        updatedAt: now,
      });
    }

    return j({ ok: true });
  } catch (e: any) {
    return j({ ok: false, error: e?.message || String(e) }, 500);
  }
}

/* ---------------------------------- GET ---------------------------------- */
// ADMIN ONLY — just status check
export async function GET(req: NextRequest) {
  // 🔐 Admin required
  const admin = await requireAdmin(req);
  if (!admin) return j({ ok: false, error: "Unauthorized" }, 401);

  try {
    const routine = await exists(ROUTINE_KEY);
    const tif = await exists(TIF_KEY);
    return j({ ok: true, routine, tif });
  } catch (e: any) {
    return j({ ok: false, error: e?.message || String(e) }, 500);
  }
}

/* -------------------------------- DELETE --------------------------------- */
// ADMIN ONLY — clear both published files
export async function DELETE(req: NextRequest) {
  // 🔐 Admin required
  const admin = await requireAdmin(req);
  if (!admin) return j({ ok: false, error: "Unauthorized" }, 401);

  try {
    await Promise.all([delJSON(ROUTINE_KEY), delJSON(TIF_KEY)]);
    return j({ ok: true });
  } catch (e: any) {
    return j({ ok: false, error: e?.message || String(e) }, 500);
  }
}
