import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { cloud, supabase } from "@/lib/supabase";
import { mapProperty } from "./repository";
import type { Property } from "@/types";

const selection =
  "*,property_addresses(address),property_images(*),property_features(features(name)),property_types(name),cities(name),neighborhoods(name),condominiums(name)";
const textKeys = [
  "q",
  "purpose",
  "type",
  "city",
  "neighborhood",
  "condominium",
  "tag",
  "sort",
];
const numericKeys = ["min", "max", "bedrooms", "suites", "parking", "area"];
export function catalogQuery(
  input: Record<string, string | string[] | undefined>,
) {
  const q: Record<string, string> = {};
  for (const key of [...textKeys, ...numericKeys, "page"]) {
    const raw = input[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    if (
      numericKeys.includes(key) &&
      (!Number.isFinite(Number(raw)) || Number(raw) < 0)
    )
      continue;
    q[key] = raw.trim().slice(0, 150);
  }
  q.page = String(
    Math.min(1000000, Math.max(1, Math.floor(Number(q.page) || 1))),
  );
  return q;
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const literalLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
const publicLocal = (p: Property): Property => ({
  ...p,
  address: p.map_mode === "exact" ? p.address : "",
});

export async function publicCatalog(
  input: Record<string, string | string[] | undefined>,
) {
  const q = catalogQuery(input),
    page = Number(q.page),
    size = 6,
    offset = (page - 1) * size;
  if (cloud()) {
    const client = await supabase();
    let query = client.from("catalog_search").select("id", { count: "exact" });
    for (const key of textKeys.filter((k) => !["q", "sort"].includes(k)))
      if (q[key]) query = query.eq(key, q[key]);
    if (q.q)
      query = query.like("search_text", `%${literalLike(normalize(q.q))}%`);
    if (q.min) query = query.gte("visible_price", Number(q.min));
    if (q.max) query = query.lte("visible_price", Number(q.max));
    for (const key of ["bedrooms", "suites", "parking", "area"])
      if (q[key]) query = query.gte(key, Number(q[key]));
    if (q.sort === "price-asc" || q.sort === "price-desc")
      query = query.order("visible_price", {
        ascending: q.sort === "price-asc",
        nullsFirst: false,
      });
    else if (q.sort === "area")
      query = query.order("area", { ascending: false });
    query = query.order("created_at", { ascending: false }).order("id");
    const { data, count, error } = await query.range(offset, offset + size - 1);
    if (error) throw error;
    const ids = (data || []).map((p) => p.id);
    if (!ids.length)
      return { items: [] as Property[], total: count || 0, page, size };
    const rows = await client
      .from("properties")
      .select(selection)
      .in("id", ids)
      .eq("active", true)
      .in("status", ["Disponível", "Reservado"]);
    if (rows.error) throw rows.error;
    const mapped = (rows.data || []).map((p) => mapProperty(p));
    return {
      items: ids.flatMap((id) => mapped.filter((p) => p.id === id)),
      total: count || 0,
      page,
      size,
    };
  }
  const where = [
    "json_extract(payload,'$.active')=1",
    "json_extract(payload,'$.status') IN ('Disponível','Reservado')",
  ];
  const args: (string | number)[] = [];
  for (const key of textKeys.filter((k) => !["q", "sort"].includes(k)))
    if (q[key]) {
      where.push(`json_extract(payload,'$.${key}')=?`);
      args.push(q[key]);
    }
  if (q.q) {
    where.push(
      "search_text(json_extract(payload,'$.title') || ' ' || code || ' ' || json_extract(payload,'$.city') || ' ' || json_extract(payload,'$.neighborhood')) LIKE ? ESCAPE '\\'",
    );
    args.push(`%${literalLike(normalize(q.q))}%`);
  }
  for (const key of numericKeys)
    if (q[key]) {
      const field = key === "min" || key === "max" ? "price" : key;
      if (field === "price")
        where.push("json_extract(payload,'$.show_price')=1");
      where.push(
        `json_extract(payload,'$.${field}') ${key === "max" ? "<=" : ">="} ?`,
      );
      args.push(Number(q[key]));
    }
  let order = "created_at DESC,id";
  if (q.sort === "area") order = "json_extract(payload,'$.area') DESC," + order;
  if (q.sort === "price-asc" || q.sort === "price-desc")
    order =
      `json_extract(payload,'$.show_price') DESC,CASE WHEN json_extract(payload,'$.show_price')=1 THEN json_extract(payload,'$.price') ELSE NULL END ${q.sort === "price-asc" ? "ASC" : "DESC"},` +
      order;
  const clause = where.join(" AND ");
  const total = (
    db()
      .prepare(`SELECT count(*) AS total FROM properties WHERE ${clause}`)
      .get(...args) as { total: number }
  ).total;
  const rows = db()
    .prepare(
      `SELECT payload FROM properties WHERE ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`,
    )
    .all(...args, size, offset) as { payload: string }[];
  return {
    items: rows.map((r) => publicLocal(JSON.parse(r.payload))),
    total,
    page,
    size,
  };
}

export const publicProperty = cache(
  async (slug: string): Promise<Property | null> => {
    if (cloud()) {
      const { data, error } = await (
        await supabase()
      )
        .from("properties")
        .select(selection)
        .eq("slug", slug)
        .eq("active", true)
        .in("status", ["Disponível", "Reservado"])
        .maybeSingle();
      if (error) throw error;
      return data ? mapProperty(data) : null;
    }
    const row = db()
      .prepare(
        "SELECT payload FROM properties WHERE slug=? AND json_extract(payload,'$.active')=1 AND json_extract(payload,'$.status') IN ('Disponível','Reservado')",
      )
      .get(slug) as { payload: string } | undefined;
    return row ? publicLocal(JSON.parse(row.payload)) : null;
  },
);
