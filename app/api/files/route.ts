// src/app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

import {
  saveSingle,
  getSingle,
  deleteSingle,
  setUploadMeta,
  deleteUploadMeta,
  setJSON,
  delJSON,
  ROUTINE_KEY,
  TIF_KEY,
  type UploadMeta,
} from "@/lib/cloudStorage";
import { parseAny } from "@/lib/parse";
import type { ClassRow } from "@/lib/routine";
import { parseTeacherInfoFromArrayBuffer } from "@/lib/teachers";
import { requireAdmin } from "@/lib/auth";

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

export async function GET(req: NextRequest) {
  // 🔐 Admin required
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const kind = (req.nextUrl.searchParams.get("kind") || "") as "routine" | "tif";
  if (kind !== "routine" && kind !== "tif") return bad("kind must be 'routine' or 'tif'");
  const item = await getSingle(kind);
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: NextRequest) {
  // 🔐 Admin required
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const kind = (req.nextUrl.searchParams.get("kind") || "") as "routine" | "tif";
  if (kind !== "routine" && kind !== "tif") return bad("kind must be 'routine' or 'tif'");

  await deleteSingle(kind);
  await deleteUploadMeta(kind);
  if (kind === "routine") await delJSON(ROUTINE_KEY);
  if (kind === "tif") await delJSON(TIF_KEY);

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  // 🔐 Admin required
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const kind = (form.get("kind") || "") as "routine" | "tif";
  if (kind !== "routine" && kind !== "tif") return bad("kind must be 'routine' or 'tif'");

  const file = form.get("file");
  if (!(file instanceof File)) return bad("file missing");

  const version = (form.get("version") || "") as string;
  const effectiveFrom = (form.get("effectiveFrom") || "") as string;
  const meta: UploadMeta = {
    version: version?.trim() || undefined,
    effectiveFrom: effectiveFrom?.trim() || undefined,
  };

  // Save raw
  const saved = await saveSingle(kind, file);
  await setUploadMeta(kind, meta);

  const now = new Date().toISOString();

  if (kind === "routine") {
    // parse routine -> publish
    let rows: ClassRow[] = [];
    try {
      const parsed = await parseAny(file);
      rows = parsed.rows;
    } catch (e: any) {
      return NextResponse.json({
        ok: true,
        key: saved.key,
        url: saved.url,
        warn: "Saved file, but parsing failed. Check format.",
        error: e?.message ?? String(e),
      });
    }
    await setJSON(ROUTINE_KEY, {
      data: rows,
      meta: { fileName: file.name, version: meta.version, effectiveFrom: meta.effectiveFrom },
      updatedAt: now,
    });
  } else {
    // parse TIF -> publish
    try {
      const buf = await file.arrayBuffer();
      const list = await parseTeacherInfoFromArrayBuffer(buf, file.name);
      await setJSON(TIF_KEY, {
        data: list,
        meta: { fileName: file.name, version: meta.version, effectiveFrom: meta.effectiveFrom },
        updatedAt: now,
      });
    } catch (e: any) {
      await setJSON(TIF_KEY, {
        data: [],
        meta: { fileName: file.name, version: meta.version, effectiveFrom: meta.effectiveFrom },
        updatedAt: now,
      });
      return NextResponse.json({
        ok: true,
        key: saved.key,
        url: saved.url,
        warn: "TIF saved but parsing failed. Check column headers.",
        error: e?.message ?? String(e),
      });
    }
  }

  return NextResponse.json({ ok: true, key: saved.key, url: saved.url });
}
