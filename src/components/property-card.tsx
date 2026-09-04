"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Heart,
  Maximize,
  BedDouble,
  CarFront,
} from "lucide-react";
import { money } from "@/lib/format";
import type { Property } from "@/types";
export function FavoriteButton({ id }: { id: string }) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    try {
      setFavorite(
        JSON.parse(localStorage.getItem("geraldo-favorites") || "[]").includes(
          id,
        ),
      );
    } catch {}
  }, [id]);
  return (
    <button
      className={`favorite ${favorite ? "selected" : ""}`}
      aria-label={favorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
      aria-pressed={favorite}
      onClick={() => {
        let ids: string[] = [];
        try {
          ids = JSON.parse(localStorage.getItem("geraldo-favorites") || "[]");
        } catch {}
        const next = favorite ? ids.filter((i) => i !== id) : [...ids, id];
        localStorage.setItem("geraldo-favorites", JSON.stringify(next));
        setFavorite(!favorite);
        window.dispatchEvent(new Event("favorites-change"));
      }}
    >
      <Heart size={19} fill={favorite ? "currentColor" : "none"} />
    </button>
  );
}
export function PropertyCard({ property: p }: { property: Property }) {
  return (
    <article className="property-card">
      <div className="property-image">
        <Link href={`/imovel/${p.slug}`} aria-label={`Conhecer ${p.title}`}>
          <Image
            src={p.images[0] || "/placeholder.svg"}
            alt={p.captions[0] || p.title}
            fill
            sizes="(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 33vw"
          />
          <span className="image-cta">
            Conhecer imóvel <ArrowUpRight size={18} />
          </span>
        </Link>
        {p.tag && <span className="property-tag">{p.tag}</span>}
        <FavoriteButton id={p.id} />
      </div>
      <div className="card-location">
        {p.neighborhood} <span>·</span> {p.city}, {p.state}
      </div>
      <Link href={`/imovel/${p.slug}`}>
        <h3>{p.title}</h3>
      </Link>
      <div className="property-specs">
        <span>
          <Maximize size={15} />
          {p.area} m²
        </span>
        <span>
          <BedDouble size={17} />
          {p.bedrooms} quartos
        </span>
        <span>
          <CarFront size={17} />
          {p.parking} vagas
        </span>
      </div>
      <div className="card-price">
        <strong>
          {p.show_price ? money(p.price) : "Sob consulta"}
          {p.purpose === "Alugar" && <small> / mês</small>}
        </strong>
        <Link aria-label={`Ver ${p.title}`} href={`/imovel/${p.slug}`}>
          <ArrowUpRight size={23} />
        </Link>
      </div>
    </article>
  );
}
export function FavoriteList({ properties }: { properties: Property[] }) {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        setIds(JSON.parse(localStorage.getItem("geraldo-favorites") || "[]"));
      } catch {
        setIds([]);
      }
    };
    read();
    window.addEventListener("favorites-change", read);
    return () => window.removeEventListener("favorites-change", read);
  }, []);
  if (ids === null) return <p>Carregando favoritos…</p>;
  const list = properties.filter((p) => ids.includes(p.id));
  return list.length ? (
    <div className="property-grid">
      {list.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  ) : (
    <div className="empty">
      <Heart size={35} />
      <h2>Guarde seus próximos capítulos.</h2>
      <p>Toque no coração de um imóvel para encontrá-lo aqui.</p>
      <Link href="/imoveis" className="button">
        Explorar imóveis <ArrowUpRight size={18} />
      </Link>
    </div>
  );
}
