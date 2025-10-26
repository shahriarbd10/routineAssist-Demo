// src/app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateBookingStatus } from "@/lib/bookings";
import { requireAdmin } from "@/lib/auth";

// Next.js 15 route validator: params is a Promise
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 🔐 Admin required
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const status = body?.status as "approved" | "declined" | "cancelled" | undefined;

    if (!status) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }

    const data = await updateBookingStatus(id, status);
    if (!data) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("PATCH /api/bookings/[id] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
