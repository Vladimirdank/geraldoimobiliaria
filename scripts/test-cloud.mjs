import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
const env = Object.fromEntries(
  readFileSync("data/cloud-public.env", "utf8")
    .trim()
    .split(/\r?\n/)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const access = readFileSync("data/ACESSO-PRODUCAO.txt", "utf8");
const email = access.match(/Email: (.+)/)[1].trim(),
  password = access.match(/Senha temporária: (.+)/)[1].trim();
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const client = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { db: { schema: "geraldo" }, auth: { persistSession: false } },
);
const { error: authError } = await client.auth.signInWithPassword({
  email,
  password,
});
assert.ifError(authError);
let cookie = "";
const ids = [];
let leadId, objectName;
const post = (body, auth = true) =>
  fetch(base + "/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: base,
      ...(auth ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
const get = async (query) => {
  const r = await fetch(base + "/api/admin/workspace?" + query, {
    headers: { cookie },
  });
  assert.equal(r.status, 200);
  return r.json();
};
const marker = "WORKSPACE-" + Date.now();
try {
  assert.equal((await fetch(base + "/api/admin/workspace")).status, 401);
  console.log("PASS Dados do painel recusam acesso anônimo");
  const r = await post({ action: "login", email, password }, false);
  assert.equal(r.status, 200);
  cookie = r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  assert(cookie);
  console.log("PASS Login Supabase via aplicação");
  const original = JSON.parse(readFileSync("data/cloud-catalog.json", "utf8"))
    .properties[0];
  for (let i = 0; i < 13; i++) {
    const p = {
      ...original,
      id: crypto.randomUUID(),
      code: marker + "-" + i,
      slug: marker.toLowerCase() + "-" + i,
      title: marker + " " + i,
      active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    ids.push(p.id);
    const { error } = await client.rpc("save_property", { document: p });
    assert.ifError(error);
  }
  const first = await get("tab=properties&q=" + marker),
    second = await get("tab=properties&q=" + marker + "&page=2");
  assert.equal(first.total, 13);
  assert.equal(first.properties.length, 12);
  assert.equal(second.properties.length, 1);
  assert(!first.properties.some((p) => p.id === second.properties[0].id));
  console.log("PASS Paginação real de imóveis sem repetição");
  assert.equal(
    (
      await post({
        action: "property",
        property: { ...first.properties[0], active: true, images: [] },
      })
    ).status,
    422,
  );
  console.log("PASS Publicação incompleta é bloqueada");
  const submission = await fetch(base + "/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: base },
    body: JSON.stringify({
      name: marker,
      phone: "849" + String(Date.now()).slice(-8),
      email: "",
      origin: "contato",
      message: "Registro temporário de validação",
      consent: "on",
      utms: { utm_campaign: "workspace-validation" },
    }),
  });
  assert.equal(submission.status, 201);
  const { data: leads, error: le } = await client
    .from("leads")
    .select("*")
    .eq("name", marker);
  assert.ifError(le);
  assert.equal(leads.length, 1);
  leadId = leads[0].id;
  assert(leads[0].consent_at);
  console.log(
    "PASS Formulário salva lead e evidência de consentimento no Supabase",
  );
  const detail = await get("lead=" + leadId);
  const workflow = {
    id: leadId,
    expected_updated_at: detail.lead.updated_at,
    status: "Em atendimento",
    assignee: "Validação automatizada",
    priority: "Alta",
    next_action: "Retornar ligação de teste",
    next_action_at: new Date(Date.now() + 86400000).toISOString(),
    lost_reason: "",
    note: "Observação de validação",
    contacted: true,
  };
  const saved = await post({ action: "lead-workflow", workflow });
  assert.equal(saved.status, 200, await saved.text());
  const after = await get("lead=" + leadId);
  assert.equal(after.lead.assignee, workflow.assignee);
  assert(after.lead.first_contact_at);
  assert.equal(after.activities.length, 2);
  assert.equal((await post({ action: "lead-workflow", workflow })).status, 409);
  console.log("PASS Responsável, histórico e proteção contra sobrescrita");
  const agenda = await get("tab=agenda&q=" + marker);
  assert.equal(agenda.total, 1);
  assert.equal(agenda.leads[0].id, leadId);
  console.log("PASS Próxima ação aparece na agenda");
  const png = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#b94f24" },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set("file", new File([png], "validation.png", { type: "image/png" }));
  const uploaded = await fetch(base + "/api/upload", {
    method: "POST",
    headers: { origin: base, cookie },
    body: form,
  });
  const upload = await uploaded.json();
  assert.equal(uploaded.status, 200, JSON.stringify(upload));
  objectName = upload.url.split("/").pop();
  assert.equal((await fetch(upload.url)).status, 200);
  console.log("PASS Upload autenticado, conversão WebP e Storage público");
  for (const tab of [
    "overview",
    "properties",
    "leads",
    "agenda",
    "content",
    "settings",
  ]) {
    const r = await fetch(base + "/admin?tab=" + tab, { headers: { cookie } });
    assert.equal(r.status, 200);
    assert(!(await r.text()).includes("NEXT_HTTP_ERROR_FALLBACK"));
  }
  console.log("PASS Todas as seções do painel respondem");
} finally {
  if (objectName) {
    const { error } = await client.storage
      .from("property-images")
      .remove([objectName]);
    assert.ifError(error);
  }
  if (leadId) {
    const { error } = await client.from("leads").delete().eq("id", leadId);
    assert.ifError(error);
  }
  if (ids.length) {
    const { error } = await client.from("properties").delete().in("id", ids);
    assert.ifError(error);
  }
  await client.auth.signOut({ scope: "local" });
  console.log("Registros de validação removidos.");
}
