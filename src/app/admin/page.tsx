import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { properties, settings, content, leads } from "@/services/repository";
import { AdminDashboard } from "@/components/admin/dashboard";
export const metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [p, s, c, l] = await Promise.all([
    properties(true),
    settings(),
    content(),
    leads(),
  ]);
  return (
    <AdminDashboard
      initialProperties={p}
      initialSettings={s}
      initialContent={c}
      initialLeads={l}
    />
  );
}
