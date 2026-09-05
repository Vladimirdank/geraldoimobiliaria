import "server-only";
import { db } from "@/lib/db";
import { cloud, supabase } from "@/lib/supabase";
import type { Property, Lead, Content, Settings } from "@/types";
export async function properties(admin = false): Promise<Property[]> {
  if (cloud()) {
    const c = await supabase();
    let q = c
      .from("properties")
      .select(
        "*,property_addresses(address),property_images(*),property_features(features(name)),property_types(name),cities(name),neighborhoods(name),condominiums(name)",
      )
      .order("sort_order");
    if (!admin)
      q = q.eq("active", true).in("status", ["Disponível", "Reservado"]);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map((p: any) => mapProperty(p, admin));
  }
  const rows = db()
    .prepare(
      "SELECT payload FROM properties ORDER BY sort_order, created_at DESC",
    )
    .all() as { payload: string }[];
  return rows
    .map((r) => JSON.parse(r.payload) as Property)
    .filter(
      (p) =>
        admin || (p.active && ["Disponível", "Reservado"].includes(p.status)),
    )
    .map((p) => (admin || p.map_mode === "exact" ? p : { ...p, address: "" }));
}
export async function settings(): Promise<Settings> {
  if (cloud()) {
    const { data, error } = await (
      await supabase()
    )
      .from("site_settings")
      .select("*");
    if (error) throw error;
    return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  }
  return Object.fromEntries(
    (
      db().prepare("SELECT * FROM site_settings").all() as {
        key: string;
        value: string;
      }[]
    ).map((r) => [r.key, r.value]),
  );
}
export async function content(kind?: string): Promise<Content[]> {
  if (cloud()) {
    let q = (await supabase()).from("content").select("*").order("sort_order");
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  return (
    kind
      ? db()
          .prepare("SELECT * FROM content WHERE kind=? ORDER BY sort_order")
          .all(kind)
      : db().prepare("SELECT * FROM content ORDER BY sort_order").all()
  ) as Content[];
}
export async function leads(): Promise<Lead[]> {
  if (cloud()) {
    const { data, error } = await (
      await supabase()
    )
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return (
    db().prepare("SELECT * FROM leads ORDER BY created_at DESC").all() as any[]
  ).map((l) => ({ ...l, utms: JSON.parse(l.utms) }));
}
export async function saveLead(l: Lead) {
  if (cloud()) {
    const { error } = await (await supabase()).from("leads").insert(l);
    if (error) throw error;
  } else
    db()
      .prepare(
        "INSERT INTO leads(id,name,phone,email,property_id,origin,message,status,utms,created_at,updated_at,consent_at,consent_version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        l.id,
        l.name,
        l.phone,
        l.email,
        l.property_id,
        l.origin,
        l.message,
        l.status,
        JSON.stringify(l.utms),
        l.created_at,
        l.created_at,
        l.consent_at || null,
        l.consent_version || "",
      );
}
export async function saveProperty(p: Property) {
  if (cloud()) {
    const { error } = await (
      await supabase()
    ).rpc("save_property", { document: p });
    if (error) throw error;
  } else
    db()
      .prepare(
        "INSERT INTO properties(id,slug,code,payload,sort_order,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,code=excluded.code,payload=excluded.payload,sort_order=excluded.sort_order",
      )
      .run(p.id, p.slug, p.code, JSON.stringify(p), p.sort_order, p.created_at);
}
export async function removeProperty(id: string) {
  if (cloud()) {
    const { error } = await (
      await supabase()
    )
      .from("properties")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } else db().prepare("DELETE FROM properties WHERE id=?").run(id);
}
export async function saveSettings(values: Settings) {
  if (cloud()) {
    const { error } = await (
      await supabase()
    )
      .from("site_settings")
      .upsert(Object.entries(values).map(([key, value]) => ({ key, value })));
    if (error) throw error;
  } else {
    const q = db().prepare(
      "INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    );
    for (const [k, v] of Object.entries(values)) q.run(k, v);
  }
}
export async function saveContent(c: Content) {
  if (cloud()) {
    const { error } = await (await supabase()).from("content").upsert(c);
    if (error) throw error;
  } else {
    const conn = db();
    conn.exec("BEGIN IMMEDIATE");
    try {
      const old = conn.prepare("SELECT * FROM content WHERE id=?").get(c.id) as
        Content | undefined;
      if (old && old.kind !== c.kind)
        throw new Error("Não altere o tipo de um cadastro existente.");
      const key = (
        {
          type: "type",
          city: "city",
          neighborhood: "neighborhood",
          condominium: "condominium",
          feature: "features",
        } as Record<string, string>
      )[c.kind];
      if (key) {
        if (
          conn
            .prepare(
              "SELECT id FROM content WHERE kind=? AND title=? AND id<>?",
            )
            .get(c.kind, c.title, c.id)
        )
          throw new Error("UNIQUE");
        if (old && old.title !== c.title)
          for (const row of conn
            .prepare("SELECT id,payload FROM properties")
            .all() as { id: string; payload: string }[]) {
            const property = JSON.parse(row.payload);
            const linked =
              key === "features"
                ? property.features.includes(old.title)
                : property[key] === old.title;
            if (!linked) continue;
            if (key === "features")
              property.features = property.features.map((name: string) =>
                name === old.title ? c.title : name,
              );
            else property[key] = c.title;
            property.updated_at = new Date().toISOString();
            conn
              .prepare("UPDATE properties SET payload=? WHERE id=?")
              .run(JSON.stringify(property), row.id);
          }
      }
      conn
        .prepare(
          "INSERT INTO content(id,kind,title,body,extra,sort_order) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,extra=excluded.extra,sort_order=excluded.sort_order",
        )
        .run(c.id, c.kind, c.title, c.body, c.extra, c.sort_order);
      conn.exec("COMMIT");
    } catch (error) {
      conn.exec("ROLLBACK");
      throw error;
    }
  }
}
export async function deleteContent(id: string) {
  if (cloud()) {
    const { error } = await (
      await supabase()
    )
      .from("content")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } else {
    const item = db().prepare("SELECT * FROM content WHERE id=?").get(id) as
      Content | undefined;
    const key = (
      {
        type: "type",
        city: "city",
        neighborhood: "neighborhood",
        condominium: "condominium",
        feature: "features",
      } as Record<string, string>
    )[item?.kind || ""];
    if (item && key)
      for (const row of db()
        .prepare("SELECT payload FROM properties")
        .all() as { payload: string }[]) {
        const p = JSON.parse(row.payload);
        if (
          key === "features"
            ? p.features.includes(item.title)
            : p[key] === item.title
        )
          throw new Error("CONTENT_IN_USE");
      }
    db().prepare("DELETE FROM content WHERE id=?").run(id);
  }
}
export async function updateLead(id: string, status: string) {
  const { leadDetail, saveWorkflow } = await import("./admin-workspace");
  const { lead } = await leadDetail(id);
  if (!lead) throw new Error("NOT_FOUND");
  await saveWorkflow({
    ...lead,
    id,
    status,
    expected_updated_at: lead.updated_at,
    note: "",
    contacted: false,
  });
}

export function mapProperty(p: any, admin = false): Property {
  return {
    ...p,
    address:
      admin || p.map_mode === "exact"
        ? (Array.isArray(p.property_addresses)
            ? p.property_addresses[0]?.address
            : p.property_addresses?.address) || ""
        : "",
    type: p.property_types?.name || "",
    city: p.cities?.name || "",
    neighborhood: p.neighborhoods?.name || "",
    condominium: p.condominiums?.name || "",
    images: p.property_images
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((i: any) => i.url),
    captions: p.property_images.map((i: any) => i.caption),
    features: p.property_features.map((f: any) => f.features.name),
  };
}
