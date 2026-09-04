import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="inner-page container empty">
      <span className="eyebrow">404</span>
      <h1>Esse lugar não está por aqui.</h1>
      <p>O imóvel pode ter sido removido ou estar indisponível.</p>
      <Link href="/imoveis" className="button">
        Explorar imóveis
      </Link>
    </main>
  );
}
