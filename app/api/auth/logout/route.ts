// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

export async function GET(request: Request) {
  // Build an absolute URL based on the incoming request host
  const redirectURL = new URL("/admin/login", request.url);

  const res = NextResponse.redirect(redirectURL);

  // Clear the admin cookie
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return res;
}

export async function POST(request: Request) {
  return GET(request);
}
