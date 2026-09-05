"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Content } from "@/types";
export function ContentForm({
  initial,
  kind,
  onSave,
  onDelete,
  busy,
}: {
  initial?: Content;
  kind: string;
  onSave: (c: Content) => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [extra, setExtra] = useState(initial?.extra || "");
  const [order, setOrder] = useState(initial?.sort_order || 0);
  return (
    <form
      className="admin-card content-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: initial?.id || crypto.randomUUID(),
          kind,
          title,
          body,
          extra,
          sort_order: order,
        });
      }}
    >
      <label>
        {initial ? "Editar" : "Adicionar"}{" "}
        {kind === "faq"
          ? "pergunta"
          : kind === "testimonial"
            ? "depoimento"
            : "item"}
        <input
          required
          value={title}
          placeholder={
            kind === "testimonial" ? "Nome do cliente" : "Nome ou título"
          }
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      {["faq", "testimonial"].includes(kind) && (
        <label>
          {kind === "faq" ? "Resposta" : "Depoimento"}
          <textarea
            rows={3}
            value={body}
            required
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
      )}
      {kind === "testimonial" && (
        <label>
          Tipo da negociação
          <input value={extra} onChange={(e) => setExtra(e.target.value)} />
        </label>
      )}
      <div className="content-form-actions">
        <label>
          Ordem
          <input
            type="number"
            min="0"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </label>
        <button className="button" disabled={busy}>
          {initial ? "Salvar" : "Adicionar"}
        </button>
        {onDelete && (
          <button
            type="button"
            className="text-button"
            onClick={onDelete}
            disabled={busy}
          >
            <Trash2 size={15} />
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
