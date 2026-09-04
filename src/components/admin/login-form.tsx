"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/layout";
import Link from "next/link";
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  return (
    <div className="login-card">
      <Brand />
      <span className="eyebrow">ÁREA ADMINISTRATIVA</span>
      <h1>{reset ? "Recuperar acesso" : "Bem-vindo de volta."}</h1>
      <p>
        {reset
          ? "Informe seu e-mail para receber as instruções."
          : "Seu portfólio, cuidado em cada detalhe."}
      </p>
      <form
        className="lead-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const data = Object.fromEntries(new FormData(e.currentTarget));
            const r = await fetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...data,
                action: reset ? "reset" : "login",
              }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error);
            if (reset)
              setError(
                "Se houver uma conta cadastrada, você receberá instruções por e-mail.",
              );
            else {
              router.push("/admin");
              router.refresh();
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          E-mail
          <input type="email" name="email" autoComplete="username" required />
        </label>
        {!reset && (
          <label>
            Senha
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
        )}
        {error && (
          <p role="status" className="form-error">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? "Aguarde…" : reset ? "Enviar instruções" : "Entrar no painel"}
          <ArrowRight size={18} />
        </button>
      </form>
      <button
        className="text-button"
        onClick={() => {
          setReset(!reset);
          setError("");
        }}
      >
        {reset ? "Voltar ao login" : "Esqueci minha senha"}
      </button>
      <Link href="/" className="back-home">
        <ArrowLeft size={15} />
        Voltar ao site
      </Link>
    </div>
  );
}
