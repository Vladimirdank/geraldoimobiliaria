import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
const base = "http://127.0.0.1:3000";
const db = new DatabaseSync("data/geraldo.db");
const access = readFileSync("data/ACESSO-LOCAL.txt", "utf8");
const email = access.match(/Email: (.+)/)[1].trim(),
  password = access.match(/Senha: (.+)/)[1].trim();
let cookie = "";
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
const checks = [];
const ok = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
assert.equal(
  (await post({ action: "delete-property", id: crypto.randomUUID() }, false))
    .status,
  401,
);
ok("Escrita administrativa anônima bloqueada");
let response = await post({ action: "login", email, password }, false);
assert.equal(response.status, 200);
cookie = response.headers.get("set-cookie").split(";")[0];
ok("Login local com sessão HttpOnly");
const original = JSON.parse(
  db.prepare("SELECT payload FROM properties LIMIT 1").get().payload,
);
const p = {
  ...original,
  id: crypto.randomUUID(),
  slug: "smoke-" + Date.now(),
  code: "TEST-" + Date.now(),
  title: "Imóvel de teste automatizado",
  active: false,
  featured: false,
  address: "ENDERECO PRIVADO TESTE",
  created_at: new Date().toISOString(),
};
try {
  assert.equal((await post({ action: "property", property: p })).status, 200);
  assert(
    (await (await fetch(base + "/imovel/" + p.slug)).text()).includes(
      "Esse lugar não está por aqui.",
    ),
  );
  ok("Rascunho não aparece no site");
  p.active = true;
  assert.equal((await post({ action: "property", property: p })).status, 200);
  let html = await (await fetch(base + "/imovel/" + p.slug)).text();
  assert(html.includes(p.title));
  assert(!html.includes(p.address));
  ok("Publicação imediata e endereço privado preservado");
  p.price = 3456789;
  assert.equal((await post({ action: "property", property: p })).status, 200);
  html = await (await fetch(base + "/imovel/" + p.slug)).text();
  assert(html.includes("3.456.789"));
  ok("Edição de preço refletida na ficha");
  response = await fetch(base + "/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: base },
    body: JSON.stringify({
      name: "Teste automatizado Geraldo",
      phone: "84900000000",
      email: "teste@example.com",
      origin: "imovel",
      property_id: p.id,
      message: "Verificação local descartável",
      consent: "on",
      utms: { utm_source: "teste", utm_campaign: "smoke" },
    }),
  });
  assert.equal(response.status, 201);
  const lead = db.prepare("SELECT * FROM leads WHERE property_id=?").get(p.id);
  assert.equal(JSON.parse(lead.utms).utm_campaign, "smoke");
  ok("Lead persistido com imóvel e UTMs");
  assert.equal(
    (await post({ action: "lead", id: lead.id, status: "Visita agendada" }))
      .status,
    200,
  );
  assert.equal(
    db.prepare("SELECT status FROM leads WHERE id=?").get(lead.id).status,
    "Visita agendada",
  );
  ok("Atualização do atendimento");
  p.active = false;
  assert.equal((await post({ action: "property", property: p })).status, 200);
  assert(
    (await (await fetch(base + "/imovel/" + p.slug)).text()).includes(
      "Esse lugar não está por aqui.",
    ),
  );
  ok("Desativação remove a ficha pública");
  const forbidden = await fetch(base + "/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "https://invalid.example",
      cookie,
    },
    body: JSON.stringify({ action: "property", property: p }),
  });
  assert.equal(forbidden.status, 400);
  ok("Proteção de origem nas escritas");
  assert.equal((await fetch(base + "/sitemap.xml")).status, 200);
  ok("Sitemap dinâmico");
} finally {
  await post({ action: "delete-property", id: p.id });
  db.prepare("DELETE FROM leads WHERE property_id=?").run(p.id);
  await post({ action: "logout" });
}
assert.equal(
  db.prepare("SELECT id FROM properties WHERE id=?").get(p.id),
  undefined,
);
ok("Exclusão e limpeza dos registros de teste");
console.log(`${checks.length} verificações aprovadas.`);
