import { publicProperty, publicCatalog } from "@/services/public-catalog";
import { FormattedDescription } from "@/components/formatted-description";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Maximize,
  BedDouble,
  Bath,
  CarFront,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { settings } from "@/services/repository";
import { Gallery, ShareButton } from "@/components/gallery";
import { FavoriteButton, PropertyCard } from "@/components/property-card";
import { LeadForm } from "@/components/lead-form";
import { PropertyTracking } from "@/components/tracking";
import { money } from "@/lib/format";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await publicProperty(slug);
  if (!p) return { title: "Imóvel não encontrado" };
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || p.short_description,
    alternates: { canonical: `/imovel/${p.slug}` },
    openGraph: {
      title: p.title,
      description: `${p.show_price ? money(p.price) : "Sob consulta"} · ${p.neighborhood}, ${p.city}`,
      images: p.images.slice(0, 1),
    },
    twitter: {
      card: "summary_large_image" as const,
      images: p.images.slice(0, 1),
    },
  };
}
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [p, s] = await Promise.all([publicProperty(slug), settings()]);
  if (!p) notFound();
  const related = (
    await publicCatalog({ city: p.city, purpose: p.purpose })
  ).items
    .filter((x) => x.id !== p.id)
    .slice(0, 3);
  const message = `Olá! Vi o imóvel ${p.title} – código ${p.code} no site e gostaria de receber mais informações.`;
  return (
    <main id="main" className="inner-page property-page container">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link>
        <span>/</span>
        <Link href="/imoveis">Imóveis</Link>
        <span>/</span>
        <span>{p.title}</span>
      </nav>
      <div className="property-heading">
        <div>
          <span className="eyebrow">
            {p.type} · {p.purpose} · {p.code}
          </span>
          <h1>{p.title}</h1>
          <p>
            <MapPin size={17} />
            {p.neighborhood} · {p.city}, {p.state}
          </p>
        </div>
        <div className="property-actions">
          <ShareButton title={p.title} />
          <FavoriteButton id={p.id} />
        </div>
      </div>
      <Gallery
        images={p.images.length ? p.images : ["/placeholder.svg"]}
        title={p.title}
      />
      <div className="property-body">
        <div>
          <div className="detail-specs">
            {[
              [Maximize, `${p.area} m²`, "Área construída"],
              [BedDouble, p.bedrooms, "Quartos"],
              [Bath, p.suites, "Suítes"],
              [Bath, p.bathrooms, "Banheiros"],
              [CarFront, p.parking, "Vagas"],
            ].map(([Icon, value, label]: any) => (
              <div key={label}>
                <Icon size={23} />
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <section>
            <span className="eyebrow">UM LUGAR PARA CHAMAR DE SEU</span>
            <h2>Sobre esta propriedade</h2>
            <FormattedDescription text={p.description} />
            {p.land_area > 0 && <p>Área do terreno: {p.land_area} m²</p>}
          </section>
          <section>
            <h2>Detalhes que fazem a diferença.</h2>
            <div className="feature-tags">
              {p.features.map((f) => (
                <span key={f}>
                  <Check size={15} />
                  {f}
                </span>
              ))}
            </div>
          </section>
          {p.map_mode !== "hidden" && (
            <section>
              <h2>Conheça a região.</h2>
              <p>
                {p.map_mode === "exact" ? p.address : p.neighborhood} · {p.city}
                , {p.state}
              </p>
              <iframe
                title="Localização do imóvel"
                className="map"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent((p.map_mode === "exact" ? p.address : p.neighborhood) + ", " + p.city + ", " + p.state)}&output=embed`}
              />
              {p.map_mode === "approximate" && (
                <small>
                  Localização aproximada para preservar a privacidade do imóvel.
                </small>
              )}
            </section>
          )}
          {(p.video || p.tour) && (
            <section>
              <h2>Explore cada detalhe.</h2>
              {p.video && (
                <a
                  className="underlined-link"
                  href={p.video}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver vídeo <ArrowUpRight size={17} />
                </a>
              )}
              {p.tour && (
                <a
                  className="underlined-link"
                  href={p.tour}
                  target="_blank"
                  rel="noreferrer"
                >
                  Tour virtual <ArrowUpRight size={17} />
                </a>
              )}
            </section>
          )}
        </div>
        <aside className="visit-card">
          <span className="eyebrow">
            {p.purpose === "Alugar" ? "VALOR DO ALUGUEL" : "INVESTIMENTO"}
          </span>
          <h2>{p.show_price ? money(p.price) : "Sob consulta"}</h2>
          {p.purpose === "Alugar" && <small>por mês</small>}
          <p>
            Condomínio: {money(p.condo_fee)} / mês
            <br />
            IPTU: {money(p.iptu)} / ano
          </p>
          <hr />
          <h3>Vamos conhecer seu próximo lugar?</h3>
          <p>Solicite uma visita ou tire suas dúvidas.</p>
          <LeadForm propertyId={p.id} origin="imovel" />
          {s.whatsapp && (
            <a
              className="button whatsapp-link"
              href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
            >
              Conversar pelo WhatsApp <ArrowUpRight size={17} />
            </a>
          )}
        </aside>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CONTINUE EXPLORANDO</span>
            <h2>
              Você também pode <em>gostar.</em>
            </h2>
          </div>
        </div>
        <div className="property-grid">
          {related.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>
      <PropertyTracking id={p.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: p.title,
            description: p.short_description,
            url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/imovel/${p.slug}`,
            image: p.images,
            datePosted: p.created_at,
            ...(p.show_price
              ? {
                  offers: {
                    "@type": "Offer",
                    price: p.price,
                    priceCurrency: "BRL",
                  },
                }
              : {}),
          }).replace(/</g, "\u003c"),
        }}
      />
    </main>
  );
}
