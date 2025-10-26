import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const me = await requireAdmin(req);
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, user: { email: me.email, username: me.username } });
}
