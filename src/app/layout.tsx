import type { Metadata } from "next";
import { Header, Footer } from "@/components/layout";
import { Tracking } from "@/components/tracking";
import { settings } from "@/services/repository";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Geraldo Imobiliária | Um lugar para a sua história",
    template: "%s | Geraldo Imobiliária",
  },
  description:
    "Uma seleção de imóveis para morar, investir e viver novas histórias em Natal e região.",
  openGraph: {
    locale: "pt_BR",
    type: "website",
    siteName: "Geraldo Imobiliária",
  },
  twitter: { card: "summary_large_image" },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await settings();
  return (
    <html lang="pt-BR">
      <body
        style={
          {
            "--accent": /^#[0-9a-f]{6}$/i.test(s.accent || "")
              ? s.accent
              : "#b94f24",
          } as React.CSSProperties
        }
      >
        <a href="#main" className="skip-link">
          Pular para o conteúdo
        </a>
        <Header />
        {children}
        <Footer settings={s} />
        <Tracking settings={s} />
      </body>
    </html>
  );
}
