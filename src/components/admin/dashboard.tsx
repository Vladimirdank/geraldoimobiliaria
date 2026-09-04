"use client";
import { useState } from "react";
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
  Trash2,
  Eye,
  EyeOff,
  Download,
  Star,
  Save,
  Menu,
} from "lucide-react";
import { Brand } from "@/components/layout";
import { PropertyEditor, emptyProperty } from "./property-editor";
import type { Property, Settings, Content, Lead } from "@/types";
import { money } from "@/lib/format";
export function AdminDashboard({
  initialProperties,
  initialSettings,
  initialContent,
  initialLeads,
}: {
  initialProperties: Property[];
  initialSettings: Settings;
  initialContent: Content[];
  initialLeads: Lead[];
}) {
  const router = useRouter();
  const [p, setP] = useState(initialProperties);
  const [s, setS] = useState(initialSettings);
  const [c, setC] = useState(initialContent);
  const [l, setL] = useState(initialLeads);
  const [tab, setTab] = useState("Dashboard");
  const [editor, setEditor] = useState<Property | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [contentKind, setContentKind] = useState("faq");
  const [menu, setMenu] = useState(false);
  const api = async (body: any) => {
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    return j;
  };
  const action = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNotice("");
    try {
      await fn();
      setNotice("Alterações salvas.");
      router.refresh();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = async (prop: Property) => {
    await api({ action: "property", property: prop });
    setP((prev) => [...prev.filter((x) => x.id !== prop.id), prop]);
    setEditor(null);
    setNotice("Imóvel salvo. O catálogo já está atualizado.");
    router.refresh();
  };
  const exportCSV = () => {
    const escape = (v: any) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const rows = [
      [
        "Nome",
        "Telefone",
        "Email",
        "Imóvel",
        "Origem",
        "Mensagem",
        "Status",
        "Data",
        "UTM source",
        "UTM medium",
        "UTM campaign",
        "UTM content",
        "UTM term",
      ],
      ...l.map((x) => [
        x.name,
        x.phone,
        x.email,
        p.find((p) => p.id === x.property_id)?.title || "",
        x.origin,
        x.message,
        x.status,
        x.created_at,
        ...["source", "medium", "campaign", "content", "term"].map(
          (k) => x.utms["utm_" + k] || "",
        ),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(escape).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-geraldo.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const nav = [
    ["Dashboard", LayoutDashboard],
    ["Imóveis", House],
    ["Novo imóvel", Plus],
    ["Categorias", House],
    ["Localizações", MapPin],
    ["Leads", MessageSquare],
    ["Depoimentos", MessageSquare],
    ["FAQ", MessageSquare],
    ["Configurações", SettingsIcon],
  ] as const;
  const switchTab = (name: string) => {
    setTab(name);
    setEditor(name === "Novo imóvel" ? emptyProperty() : null);
    setQuery("");
    setMenu(false);
    if (name === "FAQ") setContentKind("faq");
    if (name === "Depoimentos") setContentKind("testimonial");
    if (name === "Categorias") setContentKind("type");
    if (name === "Localizações") setContentKind("city");
  };
  const counts = [
    ["Total de imóveis", p.length],
    ["Imóveis ativos", p.filter((p) => p.active).length],
    ["Vendidos", p.filter((p) => p.status === "Vendido").length],
    ["Em destaque", p.filter((p) => p.featured).length],
    ["Leads recebidos", l.length],
  ];
  return (
    <main id="main" className="admin-shell">
      <aside className={`admin-sidebar ${menu ? "visible" : ""}`}>
        <Brand />
        <span className="eyebrow">GESTÃO DO PORTFÓLIO</span>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => switchTab(name)}
            >
              <Icon size={17} />
              {name}
            </button>
          ))}
        </nav>
        <Link href="/" target="_blank">
          Visualizar site <ExternalLink size={15} />
        </Link>
        <button
          className="text-button"
          onClick={() =>
            action(async () => {
              await api({ action: "logout" });
              router.push("/admin/login");
              router.refresh();
            })
          }
        >
          <LogOut size={16} />
          Sair
        </button>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="text-button admin-menu"
            onClick={() => setMenu(!menu)}
            aria-label="Menu administrativo"
          >
            <Menu size={21} />
          </button>
          <span>Geraldo / {tab}</span>
          <span>Área administrativa</span>
        </header>
        <div className="admin-content">
          {notice && (
            <div className="admin-notice" role="status">
              {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}
          {editor ? (
            <PropertyEditor
              initial={editor}
              content={c}
              onSave={save}
              onClose={() => {
                setEditor(null);
                setTab("Imóveis");
              }}
            />
          ) : (
            <>
              <div className="admin-page-heading">
                <div>
                  <span className="eyebrow">SEU NEGÓCIO, EM PERSPECTIVA</span>
                  <h1>
                    {tab === "Dashboard" ? "Bom ter você por aqui." : tab}
                  </h1>
                </div>
                {["Dashboard", "Imóveis"].includes(tab) && (
                  <button
                    className="button"
                    onClick={() => {
                      setEditor(emptyProperty());
                      setTab("Novo imóvel");
                    }}
                  >
                    <Plus size={17} />
                    Novo imóvel
                  </button>
                )}
              </div>
              {tab === "Dashboard" && (
                <>
                  <div className="stats-grid">
                    {counts.map(([name, value]) => (
                      <div className="admin-card" key={name}>
                        <span>{name}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="admin-card">
                    <h2>Últimos contatos</h2>
                    {l.length ? (
                      <div className="admin-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Nome</th>
                              <th>Contato</th>
                              <th>Origem</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {l.slice(0, 5).map((x) => (
                              <tr key={x.id}>
                                <td>{x.name}</td>
                                <td>{x.phone}</td>
                                <td>{x.origin}</td>
                                <td>
                                  <span className="status-badge">
                                    {x.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p>
                        As solicitações de atendimento aparecerão aqui assim que
                        forem recebidas.
                      </p>
                    )}
                  </div>
                  <div className="admin-card">
                    <h2>Seu site, do seu jeito.</h2>
                    <p>
                      Cadastre o telefone, o CRECI e os textos em Configurações.
                      O WhatsApp só aparece quando houver um número cadastrado.
                    </p>
                    <button
                      className="underlined-link text-button"
                      onClick={() => switchTab("Configurações")}
                    >
                      Personalizar meu site <ExternalLink size={15} />
                    </button>
                  </div>
                </>
              )}
              {tab === "Imóveis" && (
                <>
                  <div className="admin-table-controls">
                    <label>
                      <Search size={17} />
                      <input
                        placeholder="Buscar por nome ou código"
                        aria-label="Buscar imóvel"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filtrar status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">Todos os status</option>
                      {["Disponível", "Reservado", "Vendido", "Alugado"].map(
                        (t) => (
                          <option key={t}>{t}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="admin-card admin-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Imóvel</th>
                          <th>Localização</th>
                          <th>Valor</th>
                          <th>Status</th>
                          <th>Publicação</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p
                          .filter(
                            (p) =>
                              (!status || p.status === status) &&
                              `${p.title} ${p.code}`
                                .toLowerCase()
                                .includes(query.toLowerCase()),
                          )
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((x) => (
                            <tr key={x.id}>
                              <td>
                                <div className="table-property">
                                  <img
                                    src={x.images[0] || "/placeholder.svg"}
                                    alt=""
                                  />
                                  <span>
                                    {x.title}
                                    <small>
                                      {x.code} · Ordem {x.sort_order}
                                    </small>
                                  </span>
                                </div>
                              </td>
                              <td>
                                {x.city}
                                <small>{x.type}</small>
                              </td>
                              <td>
                                {x.show_price ? money(x.price) : "Sob consulta"}
                              </td>
                              <td>
                                <span className="status-badge">{x.status}</span>
                              </td>
                              <td>
                                {x.active ? "Publicado" : "Rascunho"}
                                {x.featured && <Star size={12} />}
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    title="Editar"
                                    aria-label={`Editar ${x.title}`}
                                    onClick={() => setEditor(x)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    title="Duplicar"
                                    aria-label={`Duplicar ${x.title}`}
                                    disabled={busy}
                                    onClick={() => {
                                      const copy = {
                                        ...x,
                                        id: crypto.randomUUID(),
                                        title: x.title + " (cópia)",
                                        slug: x.slug + "-" + Date.now(),
                                        code:
                                          x.code +
                                          "-C" +
                                          Date.now().toString().slice(-4),
                                        active: false,
                                        created_at: new Date().toISOString(),
                                      };
                                      setEditor(copy);
                                    }}
                                  >
                                    <Copy size={15} />
                                  </button>
                                  <button
                                    title={x.active ? "Desativar" : "Publicar"}
                                    aria-label={
                                      x.active
                                        ? "Desativar imóvel"
                                        : "Publicar imóvel"
                                    }
                                    disabled={busy}
                                    onClick={() =>
                                      action(async () => {
                                        const next = {
                                          ...x,
                                          active: !x.active,
                                        };
                                        await api({
                                          action: "property",
                                          property: next,
                                        });
                                        setP(
                                          p.map((v) =>
                                            v.id === x.id ? next : v,
                                          ),
                                        );
                                      })
                                    }
                                  >
                                    {x.active ? (
                                      <Eye size={15} />
                                    ) : (
                                      <EyeOff size={15} />
                                    )}
                                  </button>
                                  <Link
                                    href={`/imovel/${x.slug}`}
                                    target="_blank"
                                    title="Visualizar"
                                    aria-label="Visualizar imóvel"
                                  >
                                    <ExternalLink size={15} />
                                  </Link>
                                  <button
                                    title="Excluir"
                                    aria-label={`Excluir ${x.title}`}
                                    disabled={busy}
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Excluir permanentemente “${x.title}”?`,
                                        )
                                      )
                                        action(async () => {
                                          await api({
                                            action: "delete-property",
                                            id: x.id,
                                          });
                                          setP(p.filter((v) => v.id !== x.id));
                                        });
                                    }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {tab === "Leads" && (
                <>
                  <div className="admin-table-controls">
                    <p>{l.length} contatos recebidos</p>
                    <button className="button" onClick={exportCSV}>
                      <Download size={16} />
                      Exportar CSV
                    </button>
                  </div>
                  <div className="admin-card admin-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Contato</th>
                          <th>Interesse</th>
                          <th>Origem / Campanha</th>
                          <th>Data</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {l.map((x) => (
                          <tr key={x.id}>
                            <td>
                              {x.name}
                              <small>{x.phone}</small>
                              <small>{x.email}</small>
                            </td>
                            <td>
                              {p.find((p) => p.id === x.property_id)?.title ||
                                "Atendimento geral"}
                              <small>{x.message}</small>
                            </td>
                            <td>
                              {x.origin}
                              <small>{x.utms.utm_campaign || "Direto"}</small>
                            </td>
                            <td>
                              {new Date(x.created_at).toLocaleDateString(
                                "pt-BR",
                              )}
                            </td>
                            <td>
                              <select
                                aria-label={`Status de ${x.name}`}
                                value={x.status}
                                disabled={busy}
                                onChange={(e) => {
                                  const status = e.target.value;
                                  action(async () => {
                                    await api({
                                      action: "lead",
                                      id: x.id,
                                      status,
                                    });
                                    setL(
                                      l.map((v) =>
                                        v.id === x.id ? { ...v, status } : v,
                                      ),
                                    );
                                  });
                                }}
                              >
                                {[
                                  "Novo",
                                  "Em atendimento",
                                  "Visita agendada",
                                  "Negociação",
                                  "Convertido",
                                  "Perdido",
                                ].map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!l.length && <p>Nenhum lead recebido até o momento.</p>}
                  </div>
                </>
              )}
              {["Categorias", "Localizações", "FAQ", "Depoimentos"].includes(
                tab,
              ) && (
                <>
                  <div className="content-kind-tabs">
                    {(tab === "Categorias"
                      ? [
                          ["type", "Tipos de imóvel"],
                          ["feature", "Diferenciais"],
                        ]
                      : tab === "Localizações"
                        ? [
                            ["city", "Cidades"],
                            ["neighborhood", "Bairros"],
                            ["condominium", "Condomínios"],
                          ]
                        : []
                    ).map(([kind, label]) => (
                      <button
                        className={kind === contentKind ? "active" : ""}
                        key={kind}
                        onClick={() => setContentKind(kind)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <ContentForm
                    key={contentKind}
                    kind={contentKind}
                    busy={busy}
                    onSave={(item) =>
                      action(async () => {
                        await api({ action: "content", content: item });
                        setC([...c.filter((v) => v.id !== item.id), item]);
                      })
                    }
                  />
                  {c
                    .filter((x) => x.kind === contentKind)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((x) => (
                      <ContentForm
                        key={x.id}
                        initial={x}
                        kind={contentKind}
                        busy={busy}
                        onSave={(item) =>
                          action(async () => {
                            await api({ action: "content", content: item });
                            setC(c.map((v) => (v.id === item.id ? item : v)));
                          })
                        }
                        onDelete={() => {
                          if (confirm(`Excluir “${x.title}”?`))
                            action(async () => {
                              await api({ action: "delete-content", id: x.id });
                              setC(c.filter((v) => v.id !== x.id));
                            });
                        }}
                      />
                    ))}
                </>
              )}
              {tab === "Configurações" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    action(async () => {
                      await api({ action: "settings", settings: s });
                    });
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
                            onChange={(e) =>
                              setS({ ...s, [key]: e.target.value })
                            }
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
                          onChange={(e) =>
                            setS({ ...s, [key]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={s.demo === "true"}
                        onChange={(e) =>
                          setS({ ...s, demo: String(e.target.checked) })
                        }
                      />
                      Identificar portfólio como demonstrativo
                    </label>
                  </div>
                  <div className="admin-card">
                    <h2>Marketing e análise</h2>
                    <p>
                      As tags são carregadas após o consentimento do visitante.
                      Configure Google Ads e demais conversões no GTM.
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
                            onChange={(e) =>
                              setS({ ...s, [key]: e.target.value })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <button className="button" disabled={busy}>
                    <Save size={16} />
                    {busy ? "Salvando…" : "Salvar configurações"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
function ContentForm({
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
