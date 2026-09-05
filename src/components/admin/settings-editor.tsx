"use client";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import Link from "next/link";
import type { Settings } from "@/types";
export function SettingsEditor({
  initial,
  busy,
  onSave,
}: {
  initial: Settings;
  busy: boolean;
  onSave: (s: Settings) => void;
}) {
  const [s, setS] = useState(initial);
  useEffect(() => setS(initial), [initial]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(s);
      }}
    >
      <div className="admin-card">
        <h2>Identidade e contato</h2>
        <div className="admin-form-grid">
          {[
            ["whatsapp", "WhatsApp com DDI (opcional)"],
            ["creci", "CRECI"],
            ["email", "E-mail comercial"],
            ["instagram", "URL do Instagram"],
            ["region", "Região de atuação"],
            ["accent", "Cor de destaque (#hex)"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={s[key] || ""}
                onChange={(e) => setS({ ...s, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="admin-card">
        <h2>Conteúdo do site</h2>
        {[
          ["hero_title", "Título principal"],
          ["hero_subtitle", "Subtítulo"],
          ["hero_image", "URL da foto principal"],
          ["about_title", "Título institucional"],
          ["about_body", "Apresentação da imobiliária"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              rows={key === "about_body" ? 5 : 2}
              value={s[key] || ""}
              onChange={(e) => setS({ ...s, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="check-label">
          <input
            type="checkbox"
            checked={s.demo === "true"}
            onChange={(e) => setS({ ...s, demo: String(e.target.checked) })}
          />
          Identificar portfólio como demonstrativo
        </label>
      </div>
      <div className="admin-card">
        <h2>Marketing e análise</h2>
        <p>
          As tags são carregadas após o consentimento do visitante. Configure
          Google Ads e demais conversões no GTM.
        </p>
        <div className="admin-form-grid">
          {[
            ["gtm", "Google Tag Manager (GTM-…)"],
            ["ga4", "Google Analytics (G-…)"],
            ["meta_pixel", "Meta Pixel (ID numérico)"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={s[key] || ""}
                onChange={(e) => setS({ ...s, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="admin-card">
        <h2>Segurança do acesso</h2>
        <p>Use uma senha exclusiva para a administração do portal.</p>
        <Link href="/admin/reset" className="underlined-link">
          Alterar minha senha
        </Link>
      </div>
      <button className="button" disabled={busy}>
        <Save size={16} />
        {busy ? "Salvando…" : "Salvar configurações"}
      </button>
    </form>
  );
}
