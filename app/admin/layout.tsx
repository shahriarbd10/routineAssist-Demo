// src/app/admin/layout.tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth check here — the middleware handles protection,
  // and protected pages (e.g. /admin/page.tsx) do their own server guard.
  return <>{children}</>;
}
