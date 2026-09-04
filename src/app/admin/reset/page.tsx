import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResetForm } from "@/components/admin/reset-form";
export default async function Reset() {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <main id="main" className="login-page">
      <ResetForm />
    </main>
  );
}
