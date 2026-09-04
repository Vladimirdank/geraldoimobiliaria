"use client";
import { OwnerFields } from "./owner-fields";
import { useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
export function LeadForm({
  propertyId,
  origin = "contato",
}: {
  propertyId?: string;
  origin?: string;
}) {
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  return state === "success" ? (
    <div className="success" role="status">
      <CheckCircle2 size={34} />
      <h3>Conversa iniciada.</h3>
      <p>
        Recebemos sua solicitação. Nossa equipe retornará pelo contato
        informado.
      </p>
    </div>
  ) : (
    <form
      className="lead-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setState("");
        const data = Object.fromEntries(new FormData(e.currentTarget));
        if (origin === "proprietario")
          data.message = `Cidade: ${data.owner_city}; Bairro: ${data.owner_neighborhood}; Tipo: ${data.owner_type}; Valor estimado: R$ ${data.owner_price || "Não informado"}\n${data.message || ""}`;
        let utms = {};
        try {
          utms = JSON.parse(sessionStorage.getItem("geraldo-utms") || "{}");
        } catch {}
        try {
          const r = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...data,
              property_id: propertyId || null,
              origin,
              utms,
            }),
          });
          if (!r.ok)
            throw new Error(
              (await r.json()).error || "Não foi possível enviar.",
            );
          setState("success");
          window.dispatchEvent(
            new CustomEvent("geraldo-track", {
              detail: { event: "Lead", property_id: propertyId },
            }),
          );
        } catch (e) {
          setState((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Seu nome
        <input
          name="name"
          autoComplete="name"
          placeholder="Como podemos chamar você?"
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <div className="form-row">
        <label>
          Telefone
          <input
            name="phone"
            autoComplete="tel"
            type="tel"
            placeholder="(84) 99999-9999"
            required
            minLength={10}
            maxLength={20}
          />
        </label>
        <label>
          E-mail <span>(opcional)</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
          />
        </label>
      </div>
      {origin === "proprietario" && <OwnerFields />}
      <label>
        {origin === "proprietario"
          ? "Conte sobre seu imóvel"
          : "O que você procura?"}
        <textarea
          name="message"
          rows={3}
          maxLength={3000}
          placeholder={
            origin === "proprietario"
              ? "Cidade, bairro, tipo de imóvel e faixa de valor…"
              : "Queremos entender o que faz sentido para você."
          }
        />
      </label>
      <input
        className="honeypot"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <label className="check-label">
        <input type="checkbox" name="consent" required />
        Concordo com o uso dos meus dados para este atendimento, conforme a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </label>
      {state && (
        <p className="form-error" role="alert">
          {state}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy
          ? "Enviando…"
          : propertyId
            ? "Solicitar uma visita"
            : "Solicitar atendimento"}
        <ArrowUpRight size={18} />
      </button>
    </form>
  );
}
