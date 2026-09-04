import Link from "next/link";
import { properties, content } from "@/services/repository";
import { PropertyCard } from "@/components/property-card";
import { Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
export const metadata = { title: "Encontre seu próximo imóvel" };
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const q = await searchParams;
  const [all, c] = await Promise.all([properties(), content()]);
  let results = all.filter(
    (p) =>
      (!q.purpose || p.purpose === q.purpose) &&
      (!q.type || p.type === q.type) &&
      (!q.city || p.city === q.city) &&
      (!q.neighborhood || p.neighborhood === q.neighborhood) &&
      (!q.condominium || p.condominium === q.condominium) &&
      (!q.tag || p.tag === q.tag) &&
      (!q.min || (p.show_price && p.price >= Number(q.min))) &&
      (!q.max || (p.show_price && p.price <= Number(q.max))) &&
      (!q.bedrooms || p.bedrooms >= Number(q.bedrooms)) &&
      (!q.suites || p.suites >= Number(q.suites)) &&
      (!q.parking || p.parking >= Number(q.parking)) &&
      (!q.area || p.area >= Number(q.area)) &&
      (!q.q ||
        `${p.title} ${p.code} ${p.city} ${p.neighborhood}`
          .toLowerCase()
          .includes(q.q.toLowerCase())),
  );
  results.sort((a, b) =>
    q.sort === "price-asc"
      ? a.price - b.price
      : q.sort === "price-desc"
        ? b.price - a.price
        : q.sort === "area"
          ? b.area - a.area
          : b.created_at.localeCompare(a.created_at),
  );
  const count = Math.max(6, Math.min(100, Number(q.limit) || 6));
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
            <strong>{results.length}</strong> imóveis encontrados
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
      {results.length ? (
        <>
          <div className="property-grid">
            {results.slice(0, count).map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
          {results.length > count && (
            <div className="load-more">
              <Link
                className="button"
                href={`/imoveis?${new URLSearchParams({ ...q, limit: String(count + 6) }).toString()}`}
              >
                Carregar mais imóveis
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <Search size={34} />
          <h2>Ainda não encontramos esse lugar.</h2>
          <p>
            Nenhum imóvel encontrado com esses filtros. Experimente ampliar a
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
