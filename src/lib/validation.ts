import { z } from "zod";
const text = z.string().trim().max(1000);
const num = z.coerce.number().min(0).max(1e12);
const url = z
  .string()
  .refine(
    (v) =>
      !v ||
      v.startsWith("/uploads/") ||
      v === "/placeholder.svg" ||
      /^https:\/\/(images\.unsplash\.com|[a-z0-9-]+\.supabase\.co)\//.test(v),
    "Use imagens enviadas ou URLs do Unsplash/Supabase.",
  );
export const propertySchema = z.object({
  id: z.uuid(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180),
  code: z.string().min(1).max(50),
  title: z.string().min(3).max(180),
  description: z.string().max(20000),
  short_description: text,
  purpose: z.enum(["Comprar", "Alugar"]),
  type: text,
  city: text,
  neighborhood: text,
  condominium: text,
  state: z.string().max(2),
  address: text,
  map_mode: z.enum(["approximate", "exact", "hidden"]),
  price: num,
  condo_fee: num,
  iptu: num,
  show_price: z.boolean(),
  area: num,
  land_area: num,
  bedrooms: num,
  suites: num,
  bathrooms: num,
  parking: num,
  floor: num,
  year: num,
  status: z.enum(["Disponível", "Reservado", "Vendido", "Alugado"]),
  active: z.boolean(),
  featured: z.boolean(),
  tag: z.enum([
    "",
    "DESTAQUE",
    "NOVO",
    "EXCLUSIVO",
    "OPORTUNIDADE",
    "LANÇAMENTO",
  ]),
  sort_order: num,
  images: z.array(url).max(40),
  captions: z.array(text).max(40),
  features: z.array(text).max(80),
  financing: z.boolean(),
  fgts: z.boolean(),
  exchange: z.boolean(),
  video: z
    .string()
    .refine(
      (v) =>
        !v ||
        /^https:\/\/(www\.)?(youtube\.com|youtu\.be|instagram\.com)\//.test(v),
    ),
  tour: z.string().refine((v) => !v || v.startsWith("https://")),
  seo_title: text,
  seo_description: text,
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
