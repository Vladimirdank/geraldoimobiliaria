"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Phone,
  Mail,
  Save,
  Clock3,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import {
  leadStages,
  type ManagedLead,
  type LeadActivity,
} from "@/lib/admin-model";

const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não registrado";
function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function LeadDetail({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [lead, setLead] = useState<ManagedLead | null>(null),
    [activities, setActivities] = useState<LeadActivity[]>([]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [note, setNote] = useState(""),
    [contacted, setContacted] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/admin/workspace?lead=" + id, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (!data.lead) throw new Error("Contato não encontrado.");
        setLead(data.lead);
        setActivities(data.activities);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);
  const field = (key: keyof ManagedLead, value: unknown) =>
    setLead((prev) => (prev ? { ...prev, [key]: value } : prev));
  return (
    <dialog
      ref={dialog}
      className="lead-dialog"
      aria-labelledby="lead-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="drawer-head">
        <div>
          <span className="eyebrow">ATENDIMENTO</span>
          <h2 id="lead-title">{lead?.name || "Detalhes do contato"}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar atendimento"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </div>
      {loading ? (
        <div className="admin-empty" role="status">
          Carregando atendimento…
        </div>
      ) : lead ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "lead-workflow",
                  workflow: {
                    id: lead.id,
                    expected_updated_at: lead.updated_at,
                    status: lead.status,
                    assignee: lead.assignee,
                    priority: lead.priority,
                    next_action: lead.next_action,
                    next_action_at: lead.next_action_at,
                    lost_reason: lead.lost_reason,
                    note,
                    contacted,
                  },
                }),
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              onSaved();
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="drawer-body">
            <div className="contact-links">
              <a href={"tel:" + lead.phone.replace(/[^+\d]/g, "")}>
                <Phone size={15} />
                {lead.phone}
              </a>
              {lead.email && (
                <a href={"mailto:" + lead.email}>
                  <Mail size={15} />
                  {lead.email}
                </a>
              )}
            </div>
            <div className="lead-interest">
              <span>Interesse</span>
              <strong>
                {lead.property_title ||
                  (lead.origin === "proprietario"
                    ? "Anunciar um imóvel"
                    : "Atendimento geral")}
              </strong>
              <p>{lead.message || "Nenhuma mensagem adicional."}</p>
            </div>
            <div className="admin-form-grid two">
              <label>
                Etapa
                <select
                  value={lead.status}
                  onChange={(e) => field("status", e.target.value)}
                >
                  {leadStages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Prioridade
                <select
                  value={lead.priority}
                  onChange={(e) => field("priority", e.target.value)}
                >
                  <option>Normal</option>
                  <option>Alta</option>
                </select>
              </label>
              <label className="full">
                Responsável
                <input
                  placeholder="Nome da pessoa que vai atender"
                  maxLength={100}
                  value={lead.assignee}
                  onChange={(e) => field("assignee", e.target.value)}
                />
              </label>
              {!["Convertido", "Perdido"].includes(lead.status) && (
                <>
                  <label className="full">
                    Próxima ação
                    <input
                      placeholder="Ex.: confirmar visita ao imóvel"
                      maxLength={300}
                      value={lead.next_action}
                      onChange={(e) => field("next_action", e.target.value)}
                    />
                  </label>
                  <label className="full">
                    Data e horário da ação
                    <input
                      type="datetime-local"
                      value={localDate(lead.next_action_at)}
                      onChange={(e) =>
                        field(
                          "next_action_at",
                          e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        )
                      }
                    />
                  </label>
                </>
              )}
              {lead.status === "Perdido" && (
                <label className="full">
                  Motivo da perda
                  <textarea
                    required
                    maxLength={500}
                    value={lead.lost_reason}
                    onChange={(e) => field("lost_reason", e.target.value)}
                  />
                </label>
              )}
            </div>
            {!lead.first_contact_at ? (
              <label className="check-label first-contact">
                <input
                  type="checkbox"
                  checked={contacted}
                  onChange={(e) => setContacted(e.target.checked)}
                />
                Registrar que o primeiro contato foi realizado
              </label>
            ) : (
              <p className="detail-meta">
                Primeiro contato: {date(lead.first_contact_at)}
              </p>
            )}
            <label>
              Adicionar observação
              <textarea
                rows={3}
                value={note}
                maxLength={3000}
                placeholder="Registre o que foi conversado e o próximo passo."
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <details className="attribution">
              <summary>
                Origem e campanha <ExternalLink size={13} />
              </summary>
              <dl>
                <dt>Recebido em</dt>
                <dd>{date(lead.created_at)}</dd>
                <dt>Canal</dt>
                <dd>{lead.origin}</dd>
                {Object.entries(lead.utms).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k.replace("utm_", "")}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <div className="timeline">
              <h3>
                <Clock3 size={17} />
                Histórico do atendimento
              </h3>
              {activities.length ? (
                activities.map((a) => (
                  <article key={a.id}>
                    <span className="timeline-dot">
                      <MessageSquare size={12} />
                    </span>
                    <div>
                      <small>
                        {date(a.created_at)} ·{" "}
                        {a.kind === "note" ? "Observação" : "Atualização"}
                      </small>
                      <p>{a.body}</p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="detail-meta">
                  As atualizações e observações serão registradas aqui.
                </p>
              )}
            </div>
          </div>
          <div className="drawer-footer">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button" disabled={busy}>
              <Save size={16} />
              {busy ? "Salvando…" : "Salvar atendimento"}
            </button>
          </div>
        </form>
      ) : null}
      {!lead && error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}
