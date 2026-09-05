"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  House,
  Plus,
  MapPin,
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  Search,
  Copy,
  Pencil,
  Eye,
  EyeOff,
  Download,
  Star,
  Menu,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock3,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  SlidersHorizontal,
  Users,
  CircleDot,
} from "lucide-react";
import { Brand } from "@/components/layout";
import { PropertyEditor, emptyProperty } from "./property-editor";
import { ContentForm } from "./content-form";
import { SettingsEditor } from "./settings-editor";
import { LeadDetail } from "./lead-detail";
import {
  leadStages,
  csvCell,
  publicationIssues,
  type Workspace,
  type AdminTab,
  type ManagedLead,
} from "@/lib/admin-model";
import type { Property, Content } from "@/types";
import { money } from "@/lib/format";

const nav = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "properties", label: "Imóveis", icon: House },
  { id: "leads", label: "Atendimentos", icon: MessageSquare },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "content", label: "Conteúdo do site", icon: FileText },
  { id: "settings", label: "Configurações", icon: SettingsIcon },
] as const;
const descriptions: Record<AdminTab, string> = {
  overview: "Seu portfólio e suas oportunidades, em um só lugar.",
  properties: "Organize seu catálogo e prepare os próximos bons encontros.",
  leads: "Dê continuidade a cada conversa, do interesse à conquista.",
  agenda: "Os próximos passos do seu atendimento.",
  content: "Uma presença que conta a sua história.",
  settings: "A identidade e os canais da sua imobiliária.",
};
const date = (value: string | null, time = false) =>
  value
    ? new Date(value).toLocaleString(
        "pt-BR",
        time
          ? { dateStyle: "short", timeStyle: "short" }
          : { dateStyle: "short" },
      )
    : "Sem prazo";
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"workspace-badge " + tone}>{children}</span>;
}
function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-empty">
      <span className="empty-icon">
        <Search size={24} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function AdminDashboard({
  data,
  query,
}: {
  data: Workspace;
  query: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(
      null,
    );
  const [editor, setEditor] = useState<Property | null>(data.editing),
    [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [kind, setKind] = useState("faq");
  const [catalogView, setCatalogView] = useState<"list" | "grid">("list");
  const [contentEditor, setContentEditor] = useState<Content | null>(null);
  const [addContent, setAddContent] = useState(false);
  useEffect(() => {
    setEditor(data.editing);
    setMenu(false);
    setContentEditor(null);
    setAddContent(false);
  }, [data.tab, data.editing]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const api = async (body: unknown) => {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    return j;
  };
  const action = async (
    fn: () => Promise<void>,
    message = "Alterações salvas.",
  ) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice({ text: message });
      router.refresh();
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };
  const navigate = (tab: AdminTab, params: Record<string, string> = {}) => {
    setEditor(null);
    setNotice(null);
    setMenu(false);
    startTransition(() =>
      router.push("/admin?" + new URLSearchParams({ tab, ...params })),
    );
  };
  const edit = (p: Property) => {
    setEditor(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const save = async (p: Property) => {
    await api({ action: "property", property: p });
    setEditor(null);
    setNotice({ text: "Imóvel salvo. O catálogo está atualizado." });
    router.replace("/admin?tab=properties");
    router.refresh();
  };
  const filter = (form: HTMLFormElement) => {
    const values = Object.fromEntries(new FormData(form)) as Record<
      string,
      string
    >;
    navigate(
      data.tab,
      Object.fromEntries(Object.entries(values).filter(([, v]) => v)),
    );
  };
  const exportPage = () => {
    const rows = [
      [
        "Nome",
        "Telefone",
        "Email",
        "Interesse",
        "Etapa",
        "Responsável",
        "Prioridade",
        "Próxima ação",
        "Prazo",
        "Recebido em",
      ],
      ...data.leads.map((l) => [
        l.name,
        l.phone,
        l.email,
        l.property_title || l.origin,
        l.status,
        l.assignee,
        l.priority,
        l.next_action,
        l.next_action_at || "",
        l.created_at,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "atendimentos-pagina-" + data.page + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const pagination = () => {
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    return (
      <div className="workspace-pagination">
        <span>
          {data.total
            ? `${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} de ${data.total}`
            : "Nenhum registro"}
        </span>
        <div>
          <button
            aria-label="Página anterior"
            disabled={pending || data.page <= 1}
            onClick={() =>
              navigate(data.tab, { ...query, page: String(data.page - 1) })
            }
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Página {data.page} de {pages}
          </span>
          <button
            aria-label="Próxima página"
            disabled={pending || data.page >= pages}
            onClick={() =>
              navigate(data.tab, { ...query, page: String(data.page + 1) })
            }
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };
  const propertyActions = (p: Property) => (
    <div className="table-actions">
      <button
        title="Editar imóvel"
        aria-label={"Editar " + p.title}
        onClick={() => edit(p)}
      >
        <Pencil size={16} />
      </button>
      <button
        title="Duplicar como rascunho"
        aria-label={"Duplicar " + p.title}
        onClick={() =>
          edit({
            ...p,
            id: crypto.randomUUID(),
            title: p.title + " (cópia)",
            code: p.code + "-C" + Date.now().toString().slice(-5),
            slug: p.slug + "-" + Date.now(),
            active: false,
            created_at: new Date().toISOString(),
          })
        }
      >
        <Copy size={16} />
      </button>
      <button
        title={p.active ? "Retirar do site" : "Publicar no site"}
        aria-label={p.active ? "Desativar imóvel" : "Publicar imóvel"}
        disabled={busy}
        onClick={() =>
          action(
            async () => {
              const next = { ...p, active: !p.active };
              const issues = next.active ? publicationIssues(next) : [];
              if (issues.length) throw new Error(issues.join(" "));
              await api({ action: "property", property: next });
            },
            p.active
              ? "Imóvel retirado do site. O cadastro foi preservado."
              : "Imóvel publicado.",
          )
        }
      >
        {p.active ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
      {p.active && ["Disponível", "Reservado"].includes(p.status) && (
        <Link
          href={"/imovel/" + p.slug}
          target="_blank"
          title="Abrir no site"
          aria-label={"Abrir " + p.title + " no site"}
        >
          <ExternalLink size={16} />
        </Link>
      )}
    </div>
  );
  const leadsTable = (leads: ManagedLead[], compact = false) => (
    <div className="admin-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Contato</th>
            <th>Interesse</th>
            <th>Etapa</th>
            {!compact && (
              <>
                <th>Responsável</th>
                <th>Próxima ação</th>
              </>
            )}
            <th>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>
                <button
                  className="lead-name"
                  onClick={() => setSelectedLead(l.id)}
                >
                  <span className="avatar">
                    {l.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    {l.name}
                    <small>{l.phone}</small>
                  </span>
                </button>
              </td>
              <td>
                <span className="cell-title">
                  {l.property_title ||
                    (l.origin === "proprietario"
                      ? "Anunciar imóvel"
                      : "Atendimento geral")}
                </span>
                <small>
                  {date(l.created_at)} · {l.origin}
                </small>
              </td>
              <td>
                <Badge
                  tone={
                    l.status === "Novo"
                      ? "orange"
                      : l.status === "Convertido"
                        ? "success"
                        : "neutral"
                  }
                >
                  {l.status}
                </Badge>
              </td>
              {!compact && (
                <>
                  <td>
                    {l.assignee || <span className="muted">Não atribuído</span>}
                    {l.priority === "Alta" && (
                      <small className="priority-high">Prioridade alta</small>
                    )}
                  </td>
                  <td>
                    <span className="cell-title">
                      {l.next_action || "Definir próximo passo"}
                    </span>
                    <small
                      className={
                        l.next_action_at &&
                        new Date(l.next_action_at) < new Date() &&
                        !["Convertido", "Perdido"].includes(l.status)
                          ? "overdue"
                          : ""
                      }
                    >
                      {date(l.next_action_at, true)}
                    </small>
                  </td>
                </>
              )}
              <td>
                <button
                  className="round-action"
                  aria-label={"Abrir atendimento de " + l.name}
                  onClick={() => setSelectedLead(l.id)}
                >
                  <ArrowUpRight size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  const overview = data.overview;
  const title = nav.find((n) => n.id === data.tab)?.label || "Visão geral";
  return (
    <main id="main" className="admin-shell workspace-shell">
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"admin-sidebar " + (menu ? "visible" : "")}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="admin-menu icon-button"
            aria-label="Fechar menu"
            onClick={() => setMenu(false)}
          >
            <X size={18} />
          </button>
        </div>
        <span className="sidebar-label">ESPAÇO DE GESTÃO</span>
        <nav aria-label="Administração">
          {nav.map(({ id, label, icon: Icon }, i) => (
            <button
              key={id}
              className={
                (data.tab === id ? "active " : "") +
                (i === 4 ? "nav-divider" : "")
              }
              aria-current={data.tab === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "leads" && overview && overview.new_leads > 0 && (
                <b className="nav-count">{overview.new_leads}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="sidebar-help-icon">
            <House size={21} />
          </span>
          <strong>Sua vitrine está aqui.</strong>
          <p>Acompanhe como os imóveis aparecem para os visitantes.</p>
          <Link href="/" target="_blank">
            Visualizar site <ArrowUpRight size={16} />
          </Link>
        </div>
        <button
          className="sidebar-account"
          disabled={busy}
          onClick={() =>
            action(async () => {
              await api({ action: "logout" });
              router.push("/admin/login");
              router.refresh();
            })
          }
        >
          <span className="avatar">G</span>
          <span>
            Administração<small>Geraldo Imobiliária</small>
          </span>
          <LogOut size={16} />
        </button>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-menu icon-button"
            onClick={() => setMenu(true)}
            aria-label="Abrir menu administrativo"
            aria-expanded={menu}
          >
            <Menu size={21} />
          </button>
          <span className="breadcrumb-admin">
            Gestão <ChevronRight size={13} /> <strong>{title}</strong>
          </span>
          <div className="topbar-right">
            <span className="today-label">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
              })}
            </span>
            <Link href="/" target="_blank">
              Abrir site <ExternalLink size={14} />
            </Link>
            <span className="avatar">G</span>
          </div>
        </header>
        <div className="admin-content" aria-busy={pending}>
          {notice && (
            <div
              className={"admin-notice " + (notice.error ? "error" : "")}
              role={notice.error ? "alert" : "status"}
            >
              {notice.error ? (
                <AlertCircle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <span>{notice.text}</span>
              <button aria-label="Fechar aviso" onClick={() => setNotice(null)}>
                <X size={17} />
              </button>
            </div>
          )}
          {editor ? (
            <PropertyEditor
              key={editor.id}
              initial={editor}
              content={data.content}
              onSave={save}
              onClose={() => {
                setEditor(null);
                if (query.edit || query.new) navigate("properties");
              }}
            />
          ) : (
            <>
              <div className="admin-page-heading">
                <div>
                  <span className="eyebrow">GERALDO IMOBILIÁRIA</span>
                  <h1>
                    {data.tab === "overview"
                      ? "Um olhar para o seu negócio."
                      : title}
                  </h1>
                  <p>{descriptions[data.tab]}</p>
                </div>
                {["overview", "properties"].includes(data.tab) && (
                  <button
                    className="button"
                    onClick={() => {
                      if (data.tab === "properties") edit(emptyProperty());
                      else navigate("properties", { new: "1" });
                    }}
                  >
                    <Plus size={17} />
                    Novo imóvel
                  </button>
                )}
              </div>
              {data.tab === "properties" && query.new === "1" && !editor && (
                <NewProperty onCreate={() => edit(emptyProperty())} />
              )}
              {data.tab === "overview" && overview && (
                <>
                  <div className="workspace-stats">
                    {[
                      {
                        label: "Imóveis publicados",
                        value: overview.published,
                        detail: `${overview.properties} imóveis no portfólio`,
                        icon: House,
                        tab: "properties",
                        params: { publication: "published" },
                      },
                      {
                        label: "Novos contatos",
                        value: overview.new_leads,
                        detail: "Aguardando o primeiro atendimento",
                        icon: MessageSquare,
                        tab: "leads",
                        params: { status: "Novo" },
                      },
                      {
                        label: "Ações em atraso",
                        value: overview.overdue,
                        detail: "Uma conversa pode estar esperando",
                        icon: Clock3,
                        tab: "agenda",
                        params: { due: "overdue" },
                      },
                      {
                        label: "Imóveis em rascunho",
                        value: overview.drafts,
                        detail: "Prepare para a próxima publicação",
                        icon: FileText,
                        tab: "properties",
                        params: { publication: "draft" },
                      },
                    ].map(
                      ({ label, value, detail, icon: Icon, tab, params }) => (
                        <button
                          className="stat-card"
                          key={label}
                          onClick={() =>
                            navigate(
                              tab as AdminTab,
                              Object.fromEntries(
                                Object.entries(params).filter(
                                  (entry): entry is [string, string] =>
                                    typeof entry[1] === "string",
                                ),
                              ),
                            )
                          }
                        >
                          <span className="stat-top">
                            {label}
                            <span className="stat-icon">
                              <Icon size={18} />
                            </span>
                          </span>
                          <strong>{value.toLocaleString("pt-BR")}</strong>
                          <span className="stat-bottom">
                            {detail}
                            <ArrowUpRight size={16} />
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                  <div className="overview-grid">
                    <section className="admin-card pipeline-card">
                      <div className="card-heading">
                        <div>
                          <span className="eyebrow">OPORTUNIDADES</span>
                          <h2>Cada conversa, um próximo passo.</h2>
                        </div>
                        <Badge>{overview.leads} contatos</Badge>
                      </div>
                      <div className="pipeline-bars">
                        {leadStages.map((s, i) => (
                          <button
                            key={s}
                            onClick={() => navigate("leads", { status: s })}
                          >
                            <span className="pipeline-label">
                              <i
                                style={{
                                  background: [
                                    "#bd542a",
                                    "#cf8359",
                                    "#ddae85",
                                    "#e2cbb0",
                                    "#849581",
                                    "#aca39b",
                                  ][i],
                                }}
                              />
                              {s}
                            </span>
                            <span className="pipeline-track">
                              <i
                                style={{
                                  width:
                                    (overview.leads
                                      ? (overview.stages[s] / overview.leads) *
                                        100
                                      : 0) + "%",
                                  background: [
                                    "#bd542a",
                                    "#cf8359",
                                    "#ddae85",
                                    "#e2cbb0",
                                    "#849581",
                                    "#aca39b",
                                  ][i],
                                }}
                              />
                            </span>
                            <strong>{overview.stages[s] || 0}</strong>
                          </button>
                        ))}
                      </div>
                      <p className="card-footnote">
                        Distribuição atual dos atendimentos cadastrados.
                      </p>
                    </section>
                    <section className="admin-card attention-card">
                      <span className="eyebrow">ATENÇÃO AOS DETALHES</span>
                      <h2>Vale olhar hoje.</h2>
                      <button
                        onClick={() => navigate("leads", { due: "unassigned" })}
                      >
                        <span className="attention-icon">
                          <Users size={18} />
                        </span>
                        <span>
                          <strong>
                            {overview.unassigned} contatos sem responsável
                          </strong>
                          <small>Defina quem continua cada conversa.</small>
                        </span>
                        <ArrowRight size={17} />
                      </button>
                      <button
                        onClick={() =>
                          navigate("properties", { publication: "draft" })
                        }
                      >
                        <span className="attention-icon">
                          <EyeOff size={18} />
                        </span>
                        <span>
                          <strong>
                            {overview.drafts} imóveis fora da vitrine
                          </strong>
                          <small>
                            Revise as informações antes de publicar.
                          </small>
                        </span>
                        <ArrowRight size={17} />
                      </button>
                      <button onClick={() => navigate("settings")}>
                        <span className="attention-icon">
                          <SettingsIcon size={18} />
                        </span>
                        <span>
                          <strong>
                            {data.settings.email && data.settings.creci
                              ? "Identidade comercial cadastrada"
                              : "Complete a identidade comercial"}
                          </strong>
                          <small>E-mail, CRECI e apresentação do site.</small>
                        </span>
                        <ArrowRight size={17} />
                      </button>
                    </section>
                  </div>
                  <section className="admin-card recent-card">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">
                          BONS ENCONTROS COMEÇAM AQUI
                        </span>
                        <h2>Últimos contatos</h2>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("leads")}
                      >
                        Todos os atendimentos <ArrowUpRight size={16} />
                      </button>
                    </div>
                    {data.leads.length ? (
                      leadsTable(data.leads, true)
                    ) : (
                      <Empty
                        title="A próxima conversa começa aqui."
                        body="Os pedidos de atendimento do site aparecerão neste espaço, com o imóvel de interesse e a origem do contato."
                        action={
                          <Link
                            href="/contato"
                            className="underlined-link"
                            target="_blank"
                          >
                            Ver formulário do site <ArrowUpRight size={15} />
                          </Link>
                        }
                      />
                    )}
                  </section>
                </>
              )}
              {data.tab === "properties" && (
                <>
                  <div className="workspace-tabs">
                    <button
                      className={!query.publication ? "active" : ""}
                      onClick={() => navigate("properties")}
                    >
                      Todos os imóveis
                    </button>
                    <button
                      className={
                        query.publication === "published" ? "active" : ""
                      }
                      onClick={() =>
                        navigate("properties", { publication: "published" })
                      }
                    >
                      Publicados
                    </button>
                    <button
                      className={query.publication === "draft" ? "active" : ""}
                      onClick={() =>
                        navigate("properties", { publication: "draft" })
                      }
                    >
                      Rascunhos
                    </button>
                    <div className="view-switch">
                      <button
                        className={catalogView === "list" ? "active" : ""}
                        onClick={() => setCatalogView("list")}
                        aria-label="Visualizar imóveis em lista"
                      >
                        <Menu size={16} />
                      </button>
                      <button
                        className={catalogView === "grid" ? "active" : ""}
                        onClick={() => setCatalogView("grid")}
                        aria-label="Visualizar imóveis em cartões"
                      >
                        <LayoutDashboard size={16} />
                      </button>
                    </div>
                  </div>
                  <form
                    className="workspace-filters"
                    key={JSON.stringify(query)}
                    onSubmit={(e) => {
                      e.preventDefault();
                      filter(e.currentTarget);
                    }}
                  >
                    <label className="search-field">
                      <Search size={18} />
                      <input
                        name="q"
                        defaultValue={query.q || ""}
                        placeholder="Buscar por nome ou código do imóvel"
                        aria-label="Buscar imóvel"
                      />
                    </label>
                    <input
                      type="hidden"
                      name="publication"
                      value={query.publication || ""}
                    />
                    <select
                      name="status"
                      aria-label="Disponibilidade"
                      defaultValue={query.status || ""}
                    >
                      <option value="">Toda disponibilidade</option>
                      {["Disponível", "Reservado", "Vendido", "Alugado"].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                    <button className="button button-light" disabled={pending}>
                      <SlidersHorizontal size={16} />
                      Filtrar
                    </button>
                  </form>
                  <section
                    className={
                      "admin-card portfolio-card " +
                      (catalogView === "grid" ? "grid-mode" : "")
                    }
                  >
                    {!data.properties.length ? (
                      <Empty
                        title="Nenhum imóvel por aqui."
                        body="Ajuste a busca ou comece um novo cadastro para compor seu portfólio."
                        action={
                          <button
                            className="button"
                            onClick={() => edit(emptyProperty())}
                          >
                            <Plus size={16} />
                            Cadastrar imóvel
                          </button>
                        }
                      />
                    ) : catalogView === "list" ? (
                      <div className="admin-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Imóvel</th>
                              <th>Localização</th>
                              <th>Valor</th>
                              <th>Disponibilidade</th>
                              <th>Publicação</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.properties.map((p) => (
                              <tr key={p.id}>
                                <td>
                                  <button
                                    className="table-property property-open"
                                    onClick={() => edit(p)}
                                  >
                                    <img
                                      src={p.images[0] || "/placeholder.svg"}
                                      alt=""
                                    />
                                    <span>
                                      {p.title}
                                      <small>
                                        {p.code} · {p.type}
                                      </small>
                                    </span>
                                  </button>
                                </td>
                                <td>
                                  {p.city}
                                  <small>{p.neighborhood}</small>
                                </td>
                                <td className="price-cell">
                                  {p.show_price
                                    ? money(p.price)
                                    : "Sob consulta"}
                                  <small>
                                    {p.purpose === "Alugar"
                                      ? "Locação"
                                      : "Venda"}
                                  </small>
                                </td>
                                <td>
                                  <Badge
                                    tone={
                                      p.status === "Disponível"
                                        ? "success"
                                        : "neutral"
                                    }
                                  >
                                    {p.status}
                                  </Badge>
                                </td>
                                <td>
                                  <Badge tone={p.active ? "orange" : "neutral"}>
                                    {p.active ? "Publicado" : "Rascunho"}
                                  </Badge>
                                  {p.featured && (
                                    <Star size={12} className="featured-star" />
                                  )}
                                </td>
                                <td>{propertyActions(p)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="portfolio-grid">
                        {data.properties.map((p) => (
                          <article key={p.id}>
                            <div className="portfolio-photo">
                              <img
                                src={p.images[0] || "/placeholder.svg"}
                                alt={p.captions[0] || p.title}
                              />
                              <Badge tone={p.active ? "orange" : "neutral"}>
                                {p.active ? "Publicado" : "Rascunho"}
                              </Badge>
                            </div>
                            <div className="portfolio-copy">
                              <small>
                                {p.code} · {p.city}
                              </small>
                              <button
                                className="lead-name"
                                onClick={() => edit(p)}
                              >
                                {p.title}
                              </button>
                              <strong>
                                {p.show_price ? money(p.price) : "Sob consulta"}
                              </strong>
                              <div className="portfolio-bottom">
                                <Badge>{p.status}</Badge>
                                {propertyActions(p)}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                    {pagination()}
                  </section>
                </>
              )}
              {["leads", "agenda"].includes(data.tab) && (
                <>
                  <form
                    className="workspace-filters"
                    key={JSON.stringify(query)}
                    onSubmit={(e) => {
                      e.preventDefault();
                      filter(e.currentTarget);
                    }}
                  >
                    <label className="search-field">
                      <Search size={18} />
                      <input
                        name="q"
                        defaultValue={query.q || ""}
                        placeholder="Buscar nome, telefone ou responsável"
                        aria-label="Buscar atendimento"
                      />
                    </label>
                    <select
                      name="status"
                      defaultValue={query.status || ""}
                      aria-label="Etapa do atendimento"
                    >
                      <option value="">Todas as etapas</option>
                      {leadStages.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      name="due"
                      defaultValue={query.due || ""}
                      aria-label="Pendências"
                    >
                      <option value="">Todas as pendências</option>
                      <option value="overdue">Em atraso</option>
                      <option value="unassigned">Sem responsável</option>
                    </select>
                    <select
                      name="priority"
                      defaultValue={query.priority || ""}
                      aria-label="Prioridade"
                    >
                      <option value="">Toda prioridade</option>
                      <option>Alta</option>
                      <option>Normal</option>
                    </select>
                    <button className="button button-light" disabled={pending}>
                      Filtrar
                    </button>
                  </form>
                  <section className="admin-card recent-card">
                    <div className="card-heading">
                      <div>
                        <h2>
                          {data.tab === "agenda"
                            ? "Próximas ações"
                            : "Conversas em movimento"}
                        </h2>
                        <p>
                          {data.total}{" "}
                          {data.tab === "agenda"
                            ? "ações agendadas"
                            : "contatos encontrados"}
                        </p>
                      </div>
                      <button
                        className="text-button"
                        disabled={!data.leads.length}
                        onClick={exportPage}
                      >
                        <Download size={15} />
                        Exportar esta página
                      </button>
                    </div>
                    {data.leads.length ? (
                      data.tab === "agenda" ? (
                        <div className="agenda-list">
                          {data.leads.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => setSelectedLead(l.id)}
                            >
                              <span className="agenda-date">
                                <strong>
                                  {new Date(
                                    l.next_action_at!,
                                  ).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                  })}
                                </strong>
                                <small>
                                  {new Date(
                                    l.next_action_at!,
                                  ).toLocaleDateString("pt-BR", {
                                    month: "short",
                                  })}
                                </small>
                              </span>
                              <span>
                                <strong>
                                  {l.next_action || "Atendimento agendado"}
                                </strong>
                                <small>
                                  {l.name} · {l.assignee || "Sem responsável"}
                                </small>
                              </span>
                              <span className="agenda-time">
                                <Badge
                                  tone={
                                    new Date(l.next_action_at!) < new Date()
                                      ? "orange"
                                      : "neutral"
                                  }
                                >
                                  {new Date(l.next_action_at!) < new Date()
                                    ? "Em atraso"
                                    : l.status}
                                </Badge>
                                <small>{date(l.next_action_at, true)}</small>
                              </span>
                              <ArrowUpRight size={18} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        leadsTable(data.leads)
                      )
                    ) : (
                      <Empty
                        title={
                          data.tab === "agenda"
                            ? "Sua agenda está livre."
                            : "Nenhum atendimento encontrado."
                        }
                        body={
                          data.tab === "agenda"
                            ? "Defina a próxima ação e o horário dentro de um atendimento para organizar os retornos aqui."
                            : "Os contatos enviados pelo site aparecem aqui. Você também pode ajustar os filtros de busca."
                        }
                        action={
                          data.tab === "agenda" ? (
                            <button
                              className="underlined-link text-button"
                              onClick={() => navigate("leads")}
                            >
                              Organizar atendimentos <ArrowUpRight size={16} />
                            </button>
                          ) : undefined
                        }
                      />
                    )}{" "}
                    {pagination()}
                  </section>
                </>
              )}
              {data.tab === "content" && (
                <>
                  <div className="workspace-tabs content-tabs">
                    {[
                      ["faq", "Perguntas frequentes"],
                      ["testimonial", "Depoimentos"],
                      ["type", "Tipos"],
                      ["feature", "Diferenciais"],
                      ["city", "Cidades"],
                      ["neighborhood", "Bairros"],
                      ["condominium", "Condomínios"],
                    ].map(([id, label]) => (
                      <button
                        className={kind === id ? "active" : ""}
                        key={id}
                        onClick={() => {
                          setKind(id);
                          setContentEditor(null);
                          setAddContent(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="content-heading">
                    <p>
                      {data.content.filter((c) => c.kind === kind).length} itens
                      cadastrados
                    </p>
                    <button
                      className="button"
                      onClick={() => {
                        setAddContent(true);
                        setContentEditor(null);
                      }}
                    >
                      <Plus size={16} />
                      Adicionar item
                    </button>
                  </div>
                  {(addContent || contentEditor) && (
                    <div className="content-edit-panel">
                      <button
                        className="text-button"
                        onClick={() => {
                          setAddContent(false);
                          setContentEditor(null);
                        }}
                      >
                        <X size={15} />
                        Fechar edição
                      </button>
                      <ContentForm
                        key={contentEditor?.id || kind}
                        initial={contentEditor || undefined}
                        kind={kind}
                        busy={busy}
                        onSave={(item) =>
                          action(async () => {
                            await api({ action: "content", content: item });
                            setAddContent(false);
                            setContentEditor(null);
                          })
                        }
                      />
                    </div>
                  )}
                  <section className="admin-card content-list">
                    {data.content.filter((c) => c.kind === kind).length ? (
                      data.content
                        .filter((c) => c.kind === kind)
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((c) => (
                          <article key={c.id}>
                            <span className="content-order">
                              {String(c.sort_order + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <h3>{c.title}</h3>
                              {c.body && <p>{c.body}</p>}
                              {c.extra && <small>{c.extra}</small>}
                            </div>
                            <div className="table-actions">
                              <button
                                aria-label={"Editar " + c.title}
                                onClick={() => {
                                  setContentEditor(c);
                                  setAddContent(false);
                                }}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                aria-label={"Excluir " + c.title}
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Excluir “${c.title}”? Itens vinculados a imóveis não podem ser excluídos.`,
                                    )
                                  )
                                    action(async () => {
                                      await api({
                                        action: "delete-content",
                                        id: c.id,
                                      });
                                    });
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </article>
                        ))
                    ) : (
                      <Empty
                        title="Conte sua história."
                        body="Adicione conteúdo real para completar a apresentação da imobiliária."
                      />
                    )}
                  </section>
                </>
              )}
              {data.tab === "settings" && (
                <SettingsEditor
                  initial={data.settings}
                  busy={busy}
                  onSave={(s) =>
                    action(async () => {
                      await api({ action: "settings", settings: s });
                    })
                  }
                />
              )}
            </>
          )}
          <div className="workspace-footer">
            <span>Geraldo Imobiliária</span>
            <span>Um bom encontro começa com cuidado.</span>
          </div>
        </div>
      </div>
      {selectedLead && (
        <LeadDetail
          id={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSaved={() => {
            setNotice({
              text: "Atendimento atualizado. O histórico foi registrado.",
            });
            router.refresh();
          }}
        />
      )}
    </main>
  );
}
function NewProperty({ onCreate }: { onCreate: () => void }) {
  useEffect(() => {
    onCreate();
  }, []);
  return null;
}
