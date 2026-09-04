"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Heart, Menu, X, ArrowRight } from "lucide-react";
import type { Settings } from "@/types";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Geraldo Imobiliária — início">
      <span className="brand-symbol">
        g<span>.</span>
      </span>
      <span>
        GERALDO<small>IMOBILIÁRIA</small>
      </span>
    </Link>
  );
}
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => setOpen(false), [path]);
  if (path.startsWith("/admin")) return null;
  return (
    <header className={`header ${path === "/" && !scrolled ? "on-hero" : ""}`}>
      <div className="header-inner">
        <Brand />
        <nav className={open ? "open" : ""} aria-label="Navegação principal">
          <Link href="/imoveis">Imóveis</Link>
          <Link href="/imoveis?purpose=Comprar">Comprar</Link>
          <Link href="/imoveis?tag=LANÇAMENTO">Lançamentos</Link>
          <Link href="/#sobre">Nossa essência</Link>
        </nav>
        <div className="header-actions">
          <Link
            href="/favoritos"
            className="icon-button"
            aria-label="Meus favoritos"
          >
            <Heart size={19} />
          </Link>
          <Link className="header-contact" href="/contato">
            Vamos conversar <ArrowUpRight size={17} />
          </Link>
          <button
            className="mobile-menu icon-button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer({ settings: s }: { settings: Settings }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <footer>
      <div className="container footer-top">
        <div>
          <Brand />
          <p>
            Imóveis que fazem sentido.
            <br />
            Relações que fazem a diferença.
          </p>
          <span className="eyebrow">{s.region || "Natal e região"}</span>
        </div>
        <div>
          <span className="eyebrow">ENCONTRE SEU LUGAR</span>
          <Link href="/imoveis?purpose=Comprar">Comprar um imóvel</Link>
          <Link href="/imoveis?purpose=Alugar">Alugar um imóvel</Link>
          <Link href="/imoveis?tag=LANÇAMENTO">Lançamentos</Link>
          <Link href="/favoritos">Meus favoritos</Link>
        </div>
        <div>
          <span className="eyebrow">UMA BOA CONVERSA</span>
          <Link href="/contato">
            Solicitar atendimento <ArrowUpRight size={16} />
          </Link>
          <Link href="/contato?origem=proprietario">Anunciar meu imóvel</Link>
          {s.instagram && (
            <a href={s.instagram} target="_blank" rel="noreferrer">
              Instagram ↗
            </a>
          )}
          {s.creci && <p>CRECI {s.creci}</p>}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Geraldo Imobiliária.</span>
        <div>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
        </div>
        {s.demo === "true" && (
          <span>Portfólio demonstrativo · imagens ilustrativas</span>
        )}
      </div>
    </footer>
  );
}
