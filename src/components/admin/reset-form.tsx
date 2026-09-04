"use client";
import { useState } from "react";
import Link from "next/link";
export function ResetForm() {
  const [message, setMessage] = useState("");
  return (
    <div className="login-card">
      <h1>Nova senha</h1>
      <form
        className="lead-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          if (d.get("password") !== d.get("confirm")) {
            setMessage("As senhas precisam ser iguais.");
            return;
          }
          const r = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "password",
              password: d.get("password"),
            }),
          });
          const j = await r.json();
          setMessage(
            r.ok ? "Senha atualizada. Você já pode acessar o painel." : j.error,
          );
        }}
      >
        <label>
          Nova senha
          <input
            type="password"
            name="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirmar senha
          <input
            type="password"
            name="confirm"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="button">Atualizar senha</button>
        <p role="status">{message}</p>
        <Link href="/admin">Ir para o painel</Link>
      </form>
    </div>
  );
}
