import { properties } from "@/services/repository";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return [
    ...["", "/imoveis", "/contato"].map((p) => ({
      url: base + p,
      lastModified: new Date(),
    })),
    ...(await properties()).map((p) => ({
      url: `${base}/imovel/${p.slug}`,
      lastModified: new Date(p.updated_at),
    })),
  ];
}
