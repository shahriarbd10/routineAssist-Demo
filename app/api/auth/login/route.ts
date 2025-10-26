import { NextRequest, NextResponse } from "next/server";
import { getAdminByEmail } from "@/lib/admins";
import { signAdminJWT, verifyPassword, cookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").toLowerCase().trim();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email and password required." }, { status: 400 });
    }

    const admin = await getAdminByEmail(email);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
    }

    const ok = await verifyPassword(password, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
    }

    const jwt = await signAdminJWT({
      sub: admin._id!.toString(),
      email: admin.email,
      username: admin.username,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...cookieOptions, value: jwt });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Login failed" }, { status: 500 });
  }
}
