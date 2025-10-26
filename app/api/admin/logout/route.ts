import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // expire cookie
  res.cookies.set({
    name: "ra_admin",
    value: "",
    path: "/",
    maxAge: 0,
  });
  return res;
}
