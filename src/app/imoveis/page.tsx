import { publicCatalog, catalogQuery } from "@/services/public-catalog";
import Link from "next/link";
import { content } from "@/services/repository";
import { PropertyCard } from "@/components/property-card";
import { Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
export const metadata = { title: "Encontre seu próximo imóvel" };
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = catalogQuery(await searchParams);
  const [result, c] = await Promise.all([publicCatalog(q), content()]);
  const { items: results, total, page, size } = result;
  const pageUrl = (target: number) =>
    `/imoveis?${new URLSearchParams({ ...q, page: String(target) })}`;
  return (
    <main id="main" className="inner-page container">
      <span className="eyebrow">UM LUGAR COM A SUA ESSÊNCIA</span>
      <h1>
        Encontre seu <em>próximo imóvel.</em>
      </h1>
      <p>Explore com calma. O seu próximo capítulo merece uma boa escolha.</p>
      <form action="/imoveis" className="catalog-filters">
        <div className="catalog-search">
          <Search size={20} />
          <input
            name="q"
            defaultValue={q.q}
            placeholder="Busque por bairro, nome ou código"
            aria-label="Pesquisar imóveis"
          />
        </div>
        <div className="filter-main">
          <label>
            Finalidade
            <select name="purpose" defaultValue={q.purpose || ""}>
              <option value="">Comprar ou alugar</option>
              <option>Comprar</option>
              <option>Alugar</option>
            </select>
          </label>
          {[
            ["type", "Tipo de imóvel", "type"],
            ["city", "Cidade", "city"],
            ["neighborhood", "Bairro", "neighborhood"],
          ].map(([name, label, kind]) => (
            <label key={name}>
              {label}
              <select name={name} defaultValue={q[name] || ""}>
                <option value="">Todos</option>
                {c
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id}>{c.title}</option>
                  ))}
              </select>
            </label>
          ))}
          <button className="button" type="submit">
            Buscar <ArrowUpRight size={18} />
          </button>
        </div>
        <details
          className="advanced-filters"
          open={
            !!(
              q.min ||
              q.max ||
              q.bedrooms ||
              q.area ||
              q.suites ||
              q.parking ||
              q.condominium
            )
          }
        >
          <summary>
            <SlidersHorizontal size={16} />
            Mais filtros
          </summary>
          <div className="advanced-grid">
            {[
              ["min", "Preço mínimo"],
              ["max", "Preço máximo"],
              ["bedrooms", "Quartos (mín.)"],
              ["suites", "Suítes (mín.)"],
              ["parking", "Vagas (mín.)"],
              ["area", "Área mínima (m²)"],
            ].map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  type="number"
                  name={name}
                  min="0"
                  defaultValue={q[name]}
                  placeholder="Indiferente"
                />
              </label>
            ))}
            <label>
              Condomínio
              <select name="condominium" defaultValue={q.condominium || ""}>
                <option value="">Todos</option>
                {c
                  .filter((x) => x.kind === "condominium")
                  .map((x) => (
                    <option key={x.id}>{x.title}</option>
                  ))}
              </select>
            </label>
            <label>
              Seleção
              <select name="tag" defaultValue={q.tag || ""}>
                <option value="">Todos</option>
                {[
                  "DESTAQUE",
                  "EXCLUSIVO",
                  "NOVO",
                  "OPORTUNIDADE",
                  "LANÇAMENTO",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </details>
        <div className="catalog-toolbar">
          <span>
            <strong>{total}</strong> imóveis encontrados
          </span>
          <div>
            <Link href="/imoveis">Limpar filtros</Link>
            <label className="sort-label">
              Ordenar
              <select name="sort" defaultValue={q.sort || ""}>
                <option value="">Mais recentes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="area">Maior área</option>
              </select>
            </label>
            <button className="text-button" type="submit">
              Aplicar
            </button>
          </div>
        </div>
      </form>
      {Object.entries(q).some(
        ([key, value]) => value && !["page", "sort"].includes(key),
      ) && (
        <nav
          aria-label="Filtros aplicados"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: ".75rem",
            marginBottom: "1.5rem",
          }}
        >
          {Object.entries(q)
            .filter(([key, value]) => value && !["page", "sort"].includes(key))
            .map(([key, value]) => {
              const next: Record<string, string> = { ...q, page: "1" };
              delete next[key];
              const labels: Record<string, string> = {
                q: "Busca",
                purpose: "Finalidade",
                type: "Tipo",
                city: "Cidade",
                neighborhood: "Bairro",
                condominium: "Condomínio",
                tag: "Seleção",
                min: "Preço mínimo",
                max: "Preço máximo",
                bedrooms: "Quartos mín.",
                suites: "Suítes mín.",
                parking: "Vagas mín.",
                area: "Área mín.",
              };
              return (
                <Link
                  key={key}
                  className="text-button"
                  href={`/imoveis?${new URLSearchParams(next)}`}
                  aria-label={`Remover filtro ${labels[key]}: ${value}`}
                >
                  {labels[key]}: {value} ×
                </Link>
              );
            })}
        </nav>
      )}
      {results.length ? (
        <>
          <div className="property-grid">
            {results.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
          {total > size && (
            <nav
              className="load-more"
              aria-label="Páginas de imóveis"
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {page > 1 && (
                <Link className="button" href={pageUrl(page - 1)} rel="prev">
                  Anterior
                </Link>
              )}
              <span>
                Página {page} de {Math.ceil(total / size)}
              </span>
              {page * size < total && (
                <Link className="button" href={pageUrl(page + 1)} rel="next">
                  Próxima página
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="empty">
          <Search size={34} />
          <h2>Ainda não encontramos esse lugar.</h2>
          {page > 1 && (
            <Link className="button" href={pageUrl(1)}>
              Voltar à primeira página
            </Link>
          )}
          <p>
            Nenhum imóvel nesta página. Volte à primeira página ou amplie a
            busca.
          </p>
          <Link href="/imoveis" className="button">
            Limpar filtros
          </Link>
        </div>
      )}
    </main>
  );
}
