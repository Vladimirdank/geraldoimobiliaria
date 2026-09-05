"use client";
import { useEffect, useState } from "react";
import { prepareImage } from "@/lib/prepare-image";
import { publicationIssues } from "@/lib/admin-model";
import { ArrowLeft, ArrowRight, Upload, X, Star, Save } from "lucide-react";
import type { Property, Content } from "@/types";
import { slugify } from "@/lib/format";
export const emptyProperty = (): Property => ({
  id: crypto.randomUUID(),
  slug: "",
  code: "GI-" + Date.now().toString().slice(-6),
  title: "",
  description: "",
  short_description: "",
  purpose: "Comprar",
  type: "Casa",
  city: "",
  neighborhood: "",
  condominium: "",
  state: "RN",
  address: "",
  map_mode: "approximate",
  price: 0,
  condo_fee: 0,
  iptu: 0,
  show_price: true,
  area: 0,
  land_area: 0,
  bedrooms: 0,
  suites: 0,
  bathrooms: 0,
  parking: 0,
  floor: 0,
  year: 2026,
  status: "Disponível",
  active: false,
  featured: false,
  tag: "",
  sort_order: 0,
  images: [],
  captions: [],
  features: [],
  financing: false,
  fgts: false,
  exchange: false,
  video: "",
  tour: "",
  seo_title: "",
  seo_description: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
export function PropertyEditor({
  initial,
  content,
  onSave,
  onClose,
}: {
  initial: Property;
  content: Content[];
  onSave: (p: Property) => Promise<void>;
  onClose: () => void;
}) {
  const [p, setP] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [drag, setDrag] = useState<number | null>(null);
  const field = (key: keyof Property, value: any) =>
    setP((prev) => ({ ...prev, [key]: value }));
  const upload = async (files: FileList | null) => {
    if (!files) return;
    if (p.images.length + files.length > 40) {
      setError("Cada imóvel pode ter até 40 fotos.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let index = 0;
      for (const file of Array.from(files)) {
        setUploadProgress(
          `Preparando e enviando foto ${++index} de ${files.length}…`,
        );
        const f = new FormData();
        f.set("file", await prepareImage(file));
        const r = await fetch("/api/upload", { method: "POST", body: f });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setP((prev) => ({
          ...prev,
          images: [...prev.images, j.url],
          captions: [...prev.captions, ""],
        }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setUploadProgress("");
    }
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= p.images.length) return;
    const images = [...p.images],
      captions = [...p.captions];
    images.splice(to, 0, images.splice(from, 1)[0]);
    captions.splice(to, 0, captions.splice(from, 1)[0] || "");
    setP({ ...p, images, captions });
  };
  const input = (key: keyof Property, label: string, type = "text") => (
    <label key={key}>
      {label}
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={
          type === "number"
            ? ["price", "condo_fee", "iptu", "area", "land_area"].includes(key)
              ? "0.01"
              : "1"
            : undefined
        }
        required={["title", "code", "city", "type"].includes(key)}
        value={String(p[key])}
        onChange={(e) => {
          const value =
            type === "number" ? Number(e.target.value) : e.target.value;
          setP((prev) => ({
            ...prev,
            [key]: value,
            ...(key === "title" &&
            (!prev.slug || prev.slug === slugify(prev.title))
              ? { slug: slugify(String(value)) }
              : {}),
          }));
        }}
      />
    </label>
  );
  const select = (key: keyof Property, label: string, options: string[]) => (
    <label key={key}>
      {label}
      <select
        value={String(p[key])}
        onChange={(e) => field(key, e.target.value)}
      >
        <option value="">Selecione</option>
        {Array.from(
          new Set([...options, ...(p[key] ? [String(p[key])] : [])]),
        ).map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
  return (
    <form
      className="admin-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const issues = p.active ? publicationIssues(p) : [];
          if (issues.length) throw new Error(issues.join(" "));
          await onSave(p);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="editor-toolbar">
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => {
            if (
              !dirty ||
              confirm("Descartar as alterações não salvas deste imóvel?")
            )
              onClose();
          }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <h2>{initial.title ? "Editar imóvel" : "Novo imóvel"}</h2>
        <button className="button" disabled={busy}>
          <Save size={16} />
          {busy ? "Salvando…" : "Salvar imóvel"}
        </button>
      </div>
      <nav className="editor-steps" aria-label="Seções do cadastro">
        {[
          "Informações",
          "Localização",
          "Características",
          "Fotografias",
          "Publicação",
        ].map((label, i) => (
          <a key={label} href={"#editor-section-" + i}>
            {String(i + 1).padStart(2, "0")} · {label}
          </a>
        ))}
      </nav>
      <div
        className={
          "publication-checklist " +
          (!publicationIssues(p).length ? "ready" : "")
        }
      >
        <p>
          {publicationIssues(p).length
            ? "Para publicar este imóvel:"
            : "As informações essenciais estão prontas para publicação."}
        </p>
        {publicationIssues(p).length > 0 && (
          <ul>
            {publicationIssues(p).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>
      {uploadProgress && (
        <p className="upload-progress" role="status">
          {uploadProgress}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section id="editor-section-0" className="admin-card">
        <h3>01 · Informações do imóvel</h3>
        <div className="admin-form-grid">
          {input("title", "Título")}
          {input("slug", "Endereço da página (slug)")}
          {input("code", "Código")}
          {select("purpose", "Finalidade", ["Comprar", "Alugar"])}
          {select(
            "type",
            "Tipo",
            content.filter((c) => c.kind === "type").map((c) => c.title),
          )}
          {select("status", "Disponibilidade", [
            "Disponível",
            "Reservado",
            "Vendido",
            "Alugado",
          ])}
        </div>
        <label>
          Descrição curta
          <textarea
            rows={2}
            value={p.short_description}
            onChange={(e) => field("short_description", e.target.value)}
          />
        </label>
        <label>
          Descrição completa (use ## para subtítulos, - para listas e uma linha
          em branco entre blocos)
          <textarea
            rows={7}
            value={p.description}
            onChange={(e) => field("description", e.target.value)}
          />
        </label>
      </section>
      <section id="editor-section-1" className="admin-card">
        <h3>02 · Valores e localização</h3>
        <div className="admin-form-grid">
          {input("price", "Valor (R$)", "number")}
          {input("condo_fee", "Condomínio mensal (R$)", "number")}
          {input("iptu", "IPTU anual (R$)", "number")}
          {select(
            "city",
            "Cidade",
            content.filter((c) => c.kind === "city").map((c) => c.title),
          )}
          {select(
            "neighborhood",
            "Bairro",
            content
              .filter((c) => c.kind === "neighborhood")
              .map((c) => c.title),
          )}
          {select(
            "condominium",
            "Condomínio",
            content.filter((c) => c.kind === "condominium").map((c) => c.title),
          )}
          {input("state", "Estado (UF)")}
          {input("address", "Endereço completo")}
          <label>
            Privacidade do mapa
            <select
              value={p.map_mode}
              onChange={(e) => field("map_mode", e.target.value)}
            >
              <option value="approximate">Mostrar apenas o bairro</option>
              <option value="exact">Mostrar endereço completo</option>
              <option value="hidden">Ocultar mapa</option>
            </select>
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={p.show_price}
            onChange={(e) => field("show_price", e.target.checked)}
          />
          Exibir preço (desmarcado: Sob consulta)
        </label>
      </section>
      <section id="editor-section-2" className="admin-card">
        <h3>03 · Características</h3>
        <div className="admin-form-grid">
          {(
            [
              ["area", "Área construída (m²)"],
              ["land_area", "Área do terreno (m²)"],
              ["bedrooms", "Quartos"],
              ["suites", "Suítes"],
              ["bathrooms", "Banheiros"],
              ["parking", "Vagas"],
              ["floor", "Andar"],
              ["year", "Ano"],
            ] as [keyof Property, string][]
          ).map(([key, label]) => input(key, label, "number"))}
        </div>
        <div className="admin-checkboxes">
          {content
            .filter((c) => c.kind === "feature")
            .map((f) => (
              <label className="check-label" key={f.id}>
                <input
                  type="checkbox"
                  checked={p.features.includes(f.title)}
                  onChange={(e) =>
                    field(
                      "features",
                      e.target.checked
                        ? [...p.features, f.title]
                        : p.features.filter((x) => x !== f.title),
                    )
                  }
                />
                {f.title}
              </label>
            ))}
        </div>
        <div className="admin-checkboxes">
          {(
            [
              ["financing", "Aceita financiamento"],
              ["fgts", "Aceita FGTS"],
              ["exchange", "Aceita permuta"],
            ] as [keyof Property, string][]
          ).map(([key, label]) => (
            <label className="check-label" key={key}>
              <input
                type="checkbox"
                checked={Boolean(p[key])}
                onChange={(e) => field(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </section>
      <section id="editor-section-3" className="admin-card">
        <h3>04 · Fotografias</h3>
        <p>
          A primeira foto será a capa. Arraste para reorganizar ou use as setas.
          Fotos são convertidas para WebP automaticamente.
        </p>
        <label
          className="upload-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          <Upload size={25} />
          {busy ? "Enviando…" : "Arraste fotos ou clique para selecionar"}
          <small>JPG, PNG, WebP ou AVIF · até 12 MB por foto</small>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={busy}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
        <div className="admin-photo-grid">
          {p.images.map((src, i) => (
            <div
              key={src + i}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (drag !== null) move(drag, i);
                setDrag(null);
              }}
            >
              <img src={src} alt={p.captions[i] || `Foto ${i + 1}`} />
              <div>
                <button
                  type="button"
                  aria-label="Mover foto para antes"
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Definir como capa"
                  onClick={() => move(i, 0)}
                >
                  <Star size={14} fill={i === 0 ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  aria-label="Mover foto para depois"
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Excluir foto"
                  onClick={() =>
                    setP({
                      ...p,
                      images: p.images.filter((_, n) => n !== i),
                      captions: p.captions.filter((_, n) => n !== i),
                    })
                  }
                >
                  <X size={14} />
                </button>
              </div>
              <input
                aria-label={`Legenda da foto ${i + 1}`}
                placeholder="Legenda / texto alternativo"
                value={p.captions[i] || ""}
                onChange={(e) => {
                  const next = [...p.captions];
                  next[i] = e.target.value;
                  field("captions", next);
                }}
              />
            </div>
          ))}
        </div>
        <div className="admin-form-grid">
          {input("video", "Vídeo (YouTube ou Instagram)", "url")}
          {input("tour", "Tour virtual (https://)", "url")}
        </div>
      </section>
      <section id="editor-section-4" className="admin-card">
        <h3>05 · Publicação e SEO</h3>
        <div className="admin-form-grid">
          {select("tag", "Etiqueta", [
            "DESTAQUE",
            "NOVO",
            "EXCLUSIVO",
            "OPORTUNIDADE",
            "LANÇAMENTO",
          ])}
          {input("sort_order", "Ordem no catálogo", "number")}
          {input("seo_title", "Título SEO")}
          {input("seo_description", "Descrição SEO")}
        </div>
        <div className="admin-checkboxes">
          <label className="check-label">
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => field("active", e.target.checked)}
            />
            Publicado no site
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={p.featured}
              onChange={(e) => field("featured", e.target.checked)}
            />
            Destaque na página inicial
          </label>
        </div>
      </section>
      <button className="button" disabled={busy}>
        <Save size={16} />
        {busy ? "Salvando…" : "Salvar imóvel"}
      </button>
    </form>
  );
}
