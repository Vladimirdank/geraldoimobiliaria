import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWorkspace } from "@/services/admin-workspace";
import { AdminDashboard } from "@/components/admin/dashboard";
export const metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const query = await searchParams;
  const data = await getWorkspace(query);
  return <AdminDashboard data={data} query={query} />;
}
