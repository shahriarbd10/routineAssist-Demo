// src/app/api/published/[name]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getJSON, getSingle, ROUTINE_KEY, TIF_KEY } from "@/lib/cloudStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nameFromKey(key?: string) {
  if (!key) return undefined;
  const i = key.lastIndexOf("/");
  return i >= 0 ? key.slice(i + 1) : key;
}

/**
 * GET /api/published/[name]
 * name ∈ { "routine", "tif" }
 *
 * Reads published JSON and injects the current raw upload filename.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> } // ← accept string
) {
  try {
    const { name } = await params; // Next 15: params is async

    // Narrow to the two allowed values
    if (name !== "routine" && name !== "tif") {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const key = name === "tif" ? TIF_KEY : ROUTINE_KEY;
    const payload = (await getJSON(key)) ?? { data: [], meta: {}, updatedAt: undefined };

    // reflect current uploaded file name (uploads/routine.* or uploads/tif.*)
    const single = await getSingle(name);
    const currentName = nameFromKey(single?.key);

    return NextResponse.json(
      {
        ...payload,
        meta: {
          ...(payload as any).meta,
          fileName: currentName ?? (payload as any).meta?.fileName ?? undefined,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
