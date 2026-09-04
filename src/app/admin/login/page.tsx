import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
export const metadata = {
  title: "Acesso administrativo",
  robots: { index: false, follow: false },
};
export default async function Login() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main id="main" className="login-page">
      <LoginForm />
    </main>
  );
}
