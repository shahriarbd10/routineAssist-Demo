// src/app/admin/bookings/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminJWT } from "@/lib/auth";
import AdminBookingsClient from "./AdminBookingsClient";

export default async function AdminBookingsPage() {
  // Read and verify the HttpOnly JWT cookie on the server
  const token = (await cookies()).get("ra_admin")?.value;
  const payload = await verifyAdminJWT(token);

  if (!payload) {
    // Not logged in → go to login (no ?next to avoid loops)
    redirect("/admin/login");
  }

  return <AdminBookingsClient />;
}
