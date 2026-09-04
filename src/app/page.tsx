import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  MoveUpRight,
  MapPin,
  Plus,
} from "lucide-react";
import { properties, settings, content } from "@/services/repository";
import { PropertyCard } from "@/components/property-card";
import { SearchForm } from "@/components/search-form";
import { money } from "@/lib/format";
export default async function Home() {
  const [all, s, c] = await Promise.all([properties(), settings(), content()]);
  const featured = all.filter((p) => p.featured).slice(0, 3);
  const editorial = all.find((p) => p.type === "Condomínio") || all[0];
  const categories = c.filter((x) => x.kind === "type").slice(0, 4);
  const cities = c.filter((x) => x.kind === "city");
  const faqs = c.filter((x) => x.kind === "faq");
  const testimonials = c.filter((x) => x.kind === "testimonial");
  return (
    <main id="main">
      <section className="hero">
        <Image
          className="hero-photo"
          src={s.hero_image || "/placeholder.svg"}
          alt="Arquitetura contemporânea cercada por jardins"
          fill
          priority
          sizes="100vw"
        />
        <div className="hero-shade" />
        <div className="hero-content container">
          <div className="hero-eyebrow">
            <span />
            UM NOVO OLHAR PARA MORAR
          </div>
          <h1>
            {(s.hero_title || "Seu próximo capítulo\ncomeça em casa.")
              .split("\n")
              .map((line, i) => (
                <span key={i}>{line}</span>
              ))}
          </h1>
          <p>{s.hero_subtitle}</p>
          <Link className="button button-light" href="/imoveis">
            Encontre seu lugar <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="hero-bottom container">
          <span>
            <MapPin size={14} />
            {s.region}
          </span>
          <a href="#selecionados">
            DESCUBRA <ArrowDown size={15} />
          </a>
          <span className="hero-counter">
            01 <i /> CURADORIA GERALDO
          </span>
        </div>
      </section>
      <div className="container search-wrap">
        <SearchForm
          cities={cities.map((c) => c.title)}
          types={categories.map((c) => c.title)}
        />
      </div>
      <section id="selecionados" className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NOSSA CURADORIA</span>
            <h2>
              Lugares para se <em>encontrar.</em>
            </h2>
            <p>Uma seleção especial para o seu próximo capítulo.</p>
          </div>
          <Link className="underlined-link" href="/imoveis">
            Ver todos os imóveis <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="property-grid">
          {featured.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
        {!featured.length && <p>Novos imóveis estarão disponíveis em breve.</p>}
      </section>
      {editorial && (
        <section className="editorial">
          <div className="editorial-photo">
            <Image
              src={editorial.images[0] || "/placeholder.svg"}
              alt={editorial.title}
              fill
              sizes="(max-width: 800px) 100vw, 60vw"
            />
            <span>ESPAÇOS QUE INSPIRAM</span>
          </div>
          <div className="editorial-copy">
            <span className="eyebrow">O EXTRAORDINÁRIO MORA NOS DETALHES</span>
            <h2>
              Mais espaço
              <br />
              para <em>viver bem.</em>
            </h2>
            <p>{editorial.short_description}</p>
            <div className="editorial-property">
              <span>
                {editorial.neighborhood} · {editorial.city}
              </span>
              <h3>{editorial.title}</h3>
              <p>
                {editorial.area} m² <span>·</span> {editorial.suites} suítes{" "}
                <span>·</span> {editorial.parking} vagas
              </p>
              <strong>
                {editorial.show_price ? money(editorial.price) : "Sob consulta"}
              </strong>
            </div>
            <Link
              className="underlined-link"
              href={`/imovel/${editorial.slug}`}
            >
              Conhecer este imóvel <ArrowUpRight size={19} />
            </Link>
          </div>
        </section>
      )}
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CADA ESTILO, UM LUGAR</span>
            <h2>
              Como você quer <em>viver?</em>
            </h2>
          </div>
          <p>
            A casa dos seus planos.
            <br />O apartamento do seu momento.
          </p>
        </div>
        <div className="category-grid">
          {categories.map((cat, i) => {
            const p =
              all.find((p) => p.type === cat.title) || all[i % all.length];
            return (
              <Link
                className="category"
                href={`/imoveis?type=${encodeURIComponent(cat.title)}`}
                key={cat.id}
              >
                {p && (
                  <Image
                    src={p.images[0] || "/placeholder.svg"}
                    alt={cat.title}
                    fill
                    sizes="(max-width:650px) 50vw, 25vw"
                  />
                )}
                <div>
                  <h3>
                    {cat.title === "Casa"
                      ? "Casas"
                      : cat.title === "Apartamento"
                        ? "Apartamentos"
                        : cat.title === "Terreno"
                          ? "Terrenos"
                          : "Condomínios"}
                  </h3>
                  <ArrowUpRight size={22} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="locations container">
        <div>
          <span className="eyebrow">PERTENCER COMEÇA AQUI</span>
          <h2>
            Escolha onde <em>viver.</em>
          </h2>
          <p>
            Entre o ritmo da cidade e a tranquilidade de casa,
            <br />
            existe um lugar com a sua essência.
          </p>
        </div>
        <div className="location-links">
          {cities.map((city, i) => (
            <Link
              href={`/imoveis?city=${encodeURIComponent(city.title)}`}
              key={city.id}
            >
              <span className="location-number">0{i + 1}</span>
              <h3>{city.title}</h3>
              <span>
                {all.filter((p) => p.city === city.title).length} imóveis
              </span>
              <ArrowUpRight size={25} />
            </Link>
          ))}
        </div>
      </section>
      <section className="about section container" id="sobre">
        <div className="about-image">
          <Image
            src={all[1]?.images[0] || "/placeholder.svg"}
            alt="Ambiente acolhedor com mobiliário contemporâneo"
            fill
            sizes="(max-width:800px) 100vw, 45vw"
          />
          <div className="image-caption">
            BONS ENCONTROS TRANSFORMAM HISTÓRIAS.
          </div>
        </div>
        <div className="about-copy">
          <span className="eyebrow">A ESSÊNCIA GERALDO</span>
          <h2>
            {s.about_title?.split("\n").map((t, i) => (
              <span key={i}>
                {t}
                <br />
              </span>
            ))}
          </h2>
          <p>{s.about_body}</p>
          <Link href="/contato" className="underlined-link">
            Vamos conversar <ArrowUpRight size={19} />
          </Link>
        </div>
      </section>
      {testimonials.length > 0 && (
        <section className="testimonials section container">
          <span className="eyebrow">HISTÓRIAS REAIS</span>
          <h2>
            Histórias que começaram <em>por aqui.</em>
          </h2>
          <div className="property-grid">
            {testimonials.map((t) => (
              <blockquote key={t.id}>
                <p>“{t.body}”</p>
                <cite>
                  {t.title}
                  <small>{t.extra}</small>
                </cite>
              </blockquote>
            ))}
          </div>
        </section>
      )}
      <section className="owner-cta">
        <div className="container">
          <div>
            <span className="eyebrow">
              NOVAS POSSIBILIDADES PARA O SEU IMÓVEL
            </span>
            <h2>
              Seu imóvel pode ser
              <br />o próximo <em>bom encontro.</em>
            </h2>
          </div>
          <div>
            <p>
              Apresente seu imóvel à nossa curadoria.
              <br />
              Vamos encontrar a melhor forma de contar sua história.
            </p>
            <Link
              href="/contato?origem=proprietario"
              className="button button-light"
            >
              Quero anunciar meu imóvel <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="faq section container">
        <div>
          <span className="eyebrow">PODE PERGUNTAR</span>
          <h2>
            Boas escolhas começam
            <br />
            com <em>clareza.</em>
          </h2>
          <p>Estamos aqui para tornar tudo mais simples.</p>
        </div>
        <div>
          {faqs.map((f) => (
            <details key={f.id}>
              <summary>
                {f.title}
                <Plus size={19} />
              </summary>
              <p>{f.body}</p>
            </details>
          ))}
        </div>
      </section>
      {s.instagram && (
        <section className="instagram container">
          <span className="eyebrow">ALÉM DO CATÁLOGO</span>
          <h2>Acompanhe os imóveis e bastidores.</h2>
          <a
            className="underlined-link"
            href={s.instagram}
            target="_blank"
            rel="noreferrer"
          >
            Seguir no Instagram <ArrowUpRight size={19} />
          </a>
        </section>
      )}
    </main>
  );
}
