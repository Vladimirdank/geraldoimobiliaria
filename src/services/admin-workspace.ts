import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { cloud, supabase } from "@/lib/supabase";
import { requireAdmin, adminActor } from "@/lib/auth";
import { content, settings, mapProperty } from "./repository";
import {
  adminTabs,
  leadStages,
  normalizeSearch,
  type Workspace,
  type ManagedLead,
  type Overview,
  type LeadActivity,
} from "@/lib/admin-model";
import type { Property } from "@/types";

const propertySelect =
  "*,property_addresses(address),property_images(*),property_features(features(name)),property_types(name),cities(name),neighborhoods(name),condominiums(name)";
const pageSize = 12;
export const workspaceQuery = z.object({
  tab: z.enum(adminTabs).catch("overview"),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
  q: z.string().trim().max(100).catch(""),
  status: z.string().max(40).catch(""),
  publication: z.enum(["", "published", "draft"]).catch(""),
  priority: z.enum(["", "Normal", "Alta"]).catch(""),
  due: z.enum(["", "overdue", "unassigned"]).catch(""),
  edit: z.uuid().optional().catch(undefined),
});
const like = (value: string) => value.replace(/[\\%_]/g, "\\$&");
const cloudSearch = (value: string) =>
  value.replace(/[^\p{L}\p{N}\s@.+-]/gu, " ").trim();
const readLead = (row: any): ManagedLead => ({
  ...row,
  utms: typeof row.utms === "string" ? JSON.parse(row.utms) : row.utms,
  property_title: row.properties?.title || row.property_title || "",
});

export async function getWorkspace(
  raw: Record<string, unknown>,
): Promise<Workspace> {
  await requireAdmin();
  const q = workspaceQuery.parse(raw);
  const result: Workspace = {
    tab: q.tab,
    page: q.page,
    pageSize,
    total: 0,
    properties: [],
    leads: [],
    content: [],
    settings: {},
    overview: null,
    editing: null,
  };
  if (q.tab === "overview") {
    result.overview = await getOverview();
    result.leads = (await queryLeads({ ...q, page: 1 }, 5)).items;
    result.settings = await settings();
  } else if (q.tab === "properties") {
    const page = await queryProperties(q);
    result.properties = page.items;
    result.total = page.total;
    result.page = page.page;
    result.content = await content();
    if (q.edit) result.editing = await propertyById(q.edit);
  } else if (q.tab === "leads" || q.tab === "agenda") {
    const page = await queryLeads(q);
    result.leads = page.items;
    result.total = page.total;
    result.page = page.page;
  } else if (q.tab === "content") result.content = await content();
  else result.settings = await settings();
  return result;
}

type Query = z.infer<typeof workspaceQuery>;
async function queryProperties(q: Query) {
  let page = q.page;
  if (cloud()) {
    const c = await supabase();
    const build = (count = false) => {
      let query = c
        .from("properties")
        .select(count ? "id" : propertySelect, { count: "exact", head: count });
      if (q.status) query = query.eq("status", q.status);
      if (q.publication)
        query = query.eq("active", q.publication === "published");
      if (q.q)
        query = query.or(
          `title.ilike.%${cloudSearch(q.q)}%,code.ilike.%${cloudSearch(q.q)}%`,
        );
      return query;
    };
    const count = await build(true);
    if (count.error) throw count.error;
    const total = count.count || 0;
    page = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
    const { data, error } = await build()
      .order("sort_order")
      .order("id")
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return {
      items: (data || []).map((p: any) => mapProperty(p, true)),
      total,
      page,
    };
  }
  const clauses: string[] = [];
  const values: (string | number)[] = [];
  if (q.status) {
    clauses.push("json_extract(payload,'$.status')=?");
    values.push(q.status);
  }
  if (q.publication) {
    clauses.push("json_extract(payload,'$.active')=?");
    values.push(q.publication === "published" ? 1 : 0);
  }
  if (q.q) {
    clauses.push(
      "search_text(json_extract(payload,'$.title') || ' ' || code) LIKE ? ESCAPE '\\'",
    );
    values.push("%" + like(normalizeSearch(q.q)) + "%");
  }
  const where = clauses.length ? " WHERE " + clauses.join(" AND ") : "";
  const total = Number(
    (
      db()
        .prepare("SELECT count(*) n FROM properties" + where)
        .get(...values) as any
    ).n,
  );
  page = Math.min(page, Math.max(1, Math.ceil(total / pageSize)));
  const rows = db()
    .prepare(
      "SELECT payload FROM properties" +
        where +
        " ORDER BY sort_order,id LIMIT ? OFFSET ?",
    )
    .all(...values, pageSize, (page - 1) * pageSize) as { payload: string }[];
  return {
    items: rows.map((r) => JSON.parse(r.payload) as Property),
    total,
    page,
  };
}

export async function propertyById(id: string): Promise<Property | null> {
  await requireAdmin();
  if (cloud()) {
    const { data, error } = await (
      await supabase()
    )
      .from("properties")
      .select(propertySelect)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProperty(data, true) : null;
  }
  const row = db()
    .prepare("SELECT payload FROM properties WHERE id=?")
    .get(id) as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) : null;
}

async function queryLeads(q: Query, size = pageSize) {
  let page = q.page;
  const now = new Date().toISOString();
  if (cloud()) {
    const c = await supabase();
    const build = (count = false) => {
      let query = c
        .from("leads")
        .select(count ? "id" : "*,properties(title)", {
          count: "exact",
          head: count,
        });
      if (q.status) query = query.eq("status", q.status);
      if (q.priority) query = query.eq("priority", q.priority);
      if (q.q)
        query = query.or(
          `name.ilike.%${cloudSearch(q.q)}%,phone.ilike.%${cloudSearch(q.q)}%,email.ilike.%${cloudSearch(q.q)}%,assignee.ilike.%${cloudSearch(q.q)}%`,
        );
      if (q.due === "unassigned")
        query = query
          .eq("assignee", "")
          .not("status", "in", '("Convertido","Perdido")');
      if (q.due === "overdue")
        query = query
          .lt("next_action_at", now)
          .not("status", "in", '("Convertido","Perdido")');
      if (q.tab === "agenda")
        query = query
          .not("next_action_at", "is", null)
          .not("status", "in", '("Convertido","Perdido")');
      return query;
    };
    const count = await build(true);
    if (count.error) throw count.error;
    const total = count.count || 0;
    page = Math.min(page, Math.max(1, Math.ceil(total / size)));
    const { data, error } = await build()
      .order(q.tab === "agenda" ? "next_action_at" : "created_at", {
        ascending: q.tab === "agenda",
      })
      .order("id")
      .range((page - 1) * size, page * size - 1);
    if (error) throw error;
    return { items: (data || []).map(readLead), total, page };
  }
  const clauses: string[] = [];
  const values: string[] = [];
  if (q.status) {
    clauses.push("l.status=?");
    values.push(q.status);
  }
  if (q.priority) {
    clauses.push("l.priority=?");
    values.push(q.priority);
  }
  if (q.q) {
    clauses.push(
      "search_text(l.name || ' ' || l.phone || ' ' || l.email || ' ' || l.assignee) LIKE ? ESCAPE '\\'",
    );
    values.push("%" + like(normalizeSearch(q.q)) + "%");
  }
  if (q.due === "unassigned")
    clauses.push("l.assignee='' AND l.status NOT IN ('Convertido','Perdido')");
  if (q.due === "overdue") {
    clauses.push(
      "l.next_action_at<? AND l.status NOT IN ('Convertido','Perdido')",
    );
    values.push(now);
  }
  if (q.tab === "agenda")
    clauses.push(
      "l.next_action_at IS NOT NULL AND l.status NOT IN ('Convertido','Perdido')",
    );
  const where = clauses.length ? " WHERE " + clauses.join(" AND ") : "";
  const total = Number(
    (
      db()
        .prepare("SELECT count(*) n FROM leads l" + where)
        .get(...values) as any
    ).n,
  );
  page = Math.min(page, Math.max(1, Math.ceil(total / size)));
  const rows = db()
    .prepare(
      "SELECT l.*,json_extract(p.payload,'$.title') property_title FROM leads l LEFT JOIN properties p ON p.id=l.property_id" +
        where +
        ` ORDER BY l.${q.tab === "agenda" ? "next_action_at ASC" : "created_at DESC"},l.id LIMIT ? OFFSET ?`,
    )
    .all(...values, size, (page - 1) * size);
  return { items: rows.map(readLead), total, page };
}

export async function getOverview(): Promise<Overview> {
  await requireAdmin();
  if (cloud()) {
    const { data, error } = await (await supabase()).rpc("admin_overview");
    if (error) throw error;
    return data;
  }
  const p = db()
    .prepare(
      "SELECT count(*) properties,coalesce(sum(json_extract(payload,'$.active')=1 AND json_extract(payload,'$.status') IN ('Disponível','Reservado')),0) published,coalesce(sum(json_extract(payload,'$.active')=0),0) drafts,coalesce(sum(json_extract(payload,'$.featured')=1),0) featured FROM properties",
    )
    .get() as any;
  const l = db()
    .prepare(
      "SELECT count(*) leads,coalesce(sum(status='Novo'),0) new_leads,coalesce(sum(next_action_at<? AND status NOT IN ('Convertido','Perdido')),0) overdue,coalesce(sum(assignee='' AND status NOT IN ('Convertido','Perdido')),0) unassigned FROM leads",
    )
    .get(new Date().toISOString()) as any;
  const stages = Object.fromEntries(leadStages.map((s) => [s, 0]));
  for (const row of db()
    .prepare("SELECT status,count(*) n FROM leads GROUP BY status")
    .all() as { status: string; n: number }[])
    stages[row.status] = row.n;
  return { ...p, ...l, stages };
}

export async function leadDetail(id: string) {
  await requireAdmin();
  if (cloud()) {
    const c = await supabase();
    const [l, a] = await Promise.all([
      c.from("leads").select("*,properties(title)").eq("id", id).maybeSingle(),
      c
        .from("lead_activities")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (l.error) throw l.error;
    if (a.error) throw a.error;
    return {
      lead: l.data ? readLead(l.data) : null,
      activities: (a.data || []) as LeadActivity[],
    };
  }
  const row = db()
    .prepare(
      "SELECT l.*,json_extract(p.payload,'$.title') property_title FROM leads l LEFT JOIN properties p ON p.id=l.property_id WHERE l.id=?",
    )
    .get(id);
  return {
    lead: row ? readLead(row) : null,
    activities: db()
      .prepare(
        "SELECT * FROM lead_activities WHERE lead_id=? ORDER BY created_at DESC,id DESC LIMIT 100",
      )
      .all(id) as LeadActivity[],
  };
}
export const workflowSchema = z
  .object({
    id: z.uuid(),
    expected_updated_at: z.string().min(1),
    status: z.enum(leadStages),
    assignee: z.string().trim().max(100),
    priority: z.enum(["Normal", "Alta"]),
    next_action: z.string().trim().max(300),
    next_action_at: z.iso.datetime().nullable(),
    lost_reason: z.string().trim().max(500),
    note: z.string().trim().max(3000).default(""),
    contacted: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.status === "Perdido" && !v.lost_reason)
      ctx.addIssue({
        code: "custom",
        path: ["lost_reason"],
        message: "Informe o motivo da perda.",
      });
    if (v.next_action_at && !v.next_action)
      ctx.addIssue({
        code: "custom",
        path: ["next_action"],
        message: "Descreva a próxima ação.",
      });
  });
export async function saveWorkflow(raw: unknown) {
  await requireAdmin();
  const value = workflowSchema.parse(raw),
    actor = await adminActor();
  if (cloud()) {
    const { error } = await (
      await supabase()
    ).rpc("save_lead_workflow", { document: value });
    if (error) {
      if (error.message.includes("CONFLICT")) throw new Error("CONFLICT");
      throw error;
    }
    return;
  }
  const conn = db();
  conn.exec("BEGIN IMMEDIATE");
  try {
    const before = conn
      .prepare("SELECT * FROM leads WHERE id=?")
      .get(value.id) as ManagedLead | undefined;
    if (!before) throw new Error("NOT_FOUND");
    if (before.updated_at !== value.expected_updated_at)
      throw new Error("CONFLICT");
    const now = new Date(
      Math.max(Date.now(), Date.parse(before.updated_at) + 1),
    ).toISOString();
    const closed = ["Convertido", "Perdido"].includes(value.status);
    conn
      .prepare(
        "UPDATE leads SET status=?,assignee=?,priority=?,next_action=?,next_action_at=?,lost_reason=?,first_contact_at=?,updated_at=? WHERE id=?",
      )
      .run(
        value.status,
        value.assignee,
        value.priority,
        closed ? "" : value.next_action,
        closed ? null : value.next_action_at,
        value.status === "Perdido" ? value.lost_reason : "",
        before.first_contact_at || (value.contacted ? now : null),
        now,
        value.id,
      );
    const changes: string[] = [];
    if (before.status !== value.status)
      changes.push(`Etapa: ${before.status} → ${value.status}`);
    if (before.assignee !== value.assignee)
      changes.push(`Responsável: ${value.assignee || "Não atribuído"}`);
    if (before.priority !== value.priority)
      changes.push(`Prioridade: ${value.priority}`);
    if (
      before.next_action !== value.next_action ||
      before.next_action_at !== value.next_action_at
    )
      changes.push(
        `Próxima ação: ${closed ? "Encerrada" : value.next_action || "Sem ação"}${!closed && value.next_action_at ? " • " + value.next_action_at : ""}`,
      );
    if (value.contacted && !before.first_contact_at)
      changes.push("Primeiro contato registrado");
    if (value.status === "Perdido")
      changes.push("Motivo: " + value.lost_reason);
    const add = conn.prepare(
      "INSERT INTO lead_activities(id,lead_id,kind,body,actor_id,created_at) VALUES(?,?,?,?,?,?)",
    );
    if (changes.length)
      add.run(
        crypto.randomUUID(),
        value.id,
        "update",
        changes.join("\n"),
        actor,
        now,
      );
    if (value.note)
      add.run(crypto.randomUUID(), value.id, "note", value.note, actor, now);
    conn.exec("COMMIT");
  } catch (error) {
    conn.exec("ROLLBACK");
    throw error;
  }
}
