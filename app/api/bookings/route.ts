// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createBooking,
  listBookingsByDate,
  listAllBookings,
  listPublicBookedByDate,
} from "@/lib/bookings";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/bookings
 * Modes:
 * - Public (no auth):  ?public=1&date=YYYY-MM-DD  -> returns condensed docs for requested|approved
 * - Admin (auth):
 *      ?date=YYYY-MM-DD  -> list that day's requests (all fields)
 *      (no query)        -> list ALL requests newest-first (all fields)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const isPublic = url.searchParams.get("public") === "1";
  const date = url.searchParams.get("date");

  // Public read — only allowed when date is specified
  if (isPublic) {
    if (!date) {
      return NextResponse.json({ error: "date required for public mode" }, { status: 400 });
    }
    try {
      const data = await listPublicBookedByDate(date);
      return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
      console.error("GET /api/bookings (public) error:", err);
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }
  }

  // 🔐 Admin required for all other reads
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (date) {
      const data = await listBookingsByDate(date);
      return NextResponse.json({ data }, { status: 200 });
    }

    const data = await listAllBookings();
    data.sort((a: any, b: any) => {
      const ta = a?.createdAt ? Date.parse(a.createdAt) : Date.parse(a?.date ?? "1970-01-01");
      const tb = b?.createdAt ? Date.parse(b.createdAt) : Date.parse(b?.date ?? "1970-01-01");
      return tb - ta;
    });
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

/**
 * POST /api/bookings  (Public)
 * Body: { date, day, slot, room, userType, student?, teacher?, comment? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const data = await createBooking(body);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
