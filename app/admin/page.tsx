// src/app/admin/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminJWT } from "@/lib/auth";
import AdminPanelClient from "./AdminPanelClient";

export default async function AdminPage() {
  const token = (await cookies()).get("ra_admin")?.value;
  const payload = await verifyAdminJWT(token);
  if (!payload) redirect("/admin/login");
  return <AdminPanelClient />;
}
