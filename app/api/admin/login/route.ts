import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const adminPass = process.env.ADMIN_PASS || "";

  if (!adminPass) {
    return NextResponse.json(
      { ok: false, error: "Server not configured (ADMIN_PASS missing)." },
      { status: 500 }
    );
  }

  if (password !== adminPass) {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Must match middleware check -> value === "yes"
  res.cookies.set({
    name: "ra_admin",
    value: "yes",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
