import { PGlite } from "@electric-sql/pglite";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

// Isolated PostgreSQL engine. Auth/Storage schemas below emulate Supabase's SQL
// contract only; they do not replace testing the real Auth/Storage services.
const db = new PGlite();
const results = [];
const pass = (name) => {
  results.push(name);
  console.log("PASS", name);
};
const admin = "10000000-0000-4000-8000-000000000001";
const viewer = "10000000-0000-4000-8000-000000000002";
const propertyId = "20000000-0000-4000-8000-000000000001";
const leadId = "30000000-0000-4000-8000-000000000001";
async function as(role, id = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`set role ${role}`);
}
try {
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
  `);
  await db.exec(readFileSync("database/schema.sql", "utf8"));
  await db.exec(
    readFileSync(
      "supabase/migrations/20260905013702_admin_workspace.sql",
      "utf8",
    ),
  );
  pass(
    "Estrutura SQL e migração do painel executadas integralmente no PostgreSQL local",
  );
  const tables = await db.query(
    "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='geraldo' and relkind='r' and not relrowsecurity",
  );
  assert.equal(tables.rows.length, 0);
  pass("RLS ativo em todas as tabelas da aplicação");
  await db.query("insert into auth.users values($1),($2)", [admin, viewer]);
  await db.query(
    "insert into geraldo.profiles(id,role) values($1,'admin'),($2,'viewer')",
    [admin, viewer],
  );
  const p = {
    id: propertyId,
    slug: "imovel-teste",
    code: "TEST-001",
    title: "Imóvel de teste",
    description: "Teste",
    short_description: "Teste",
    purpose: "Comprar",
    type: "Casa",
    city: "Natal",
    neighborhood: "Tirol",
    condominium: "",
    state: "RN",
    address: "Rua privada 123",
    map_mode: "approximate",
    price: 800000,
    condo_fee: 500,
    iptu: 1000,
    show_price: true,
    area: 200,
    land_area: 300,
    bedrooms: 3,
    suites: 2,
    bathrooms: 3,
    parking: 2,
    floor: 0,
    year: 2026,
    status: "Disponível",
    active: false,
    featured: true,
    tag: "DESTAQUE",
    sort_order: 0,
    financing: true,
    fgts: false,
    exchange: false,
    video: "",
    tour: "",
    seo_title: "",
    seo_description: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    images: [
      "https://images.unsplash.com/test.jpg",
      "https://images.unsplash.com/test2.jpg",
    ],
    captions: ["Capa", "Sala"],
    features: ["Piscina", "Varanda"],
  };
  const save = () =>
    db.query("select geraldo.save_property($1::jsonb)", [JSON.stringify(p)]);
  await as("authenticated", viewer);
  await assert.rejects(save);
  pass("Usuário sem papel admin não consegue cadastrar imóveis");
  await assert.rejects(() =>
    db.query("update geraldo.profiles set role='admin' where id=$1", [viewer]),
  );
  pass("Usuário não consegue promover a própria permissão");
  await as("authenticated", admin);
  await save();
  assert.equal(
    (await db.query("select * from geraldo.property_images")).rows.length,
    2,
  );
  assert.equal(
    (await db.query("select * from geraldo.property_features")).rows.length,
    2,
  );
  pass(
    "Administrador cadastra imóvel, imagens e diferenciais em transação única",
  );
  await as("anon");
  assert.equal(
    (await db.query("select * from geraldo.properties")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from geraldo.property_images")).rows.length,
    0,
  );
  pass("Visitante não lê rascunhos nem suas imagens");
  await as("authenticated", admin);
  p.active = true;
  await save();
  await as("anon");
  assert.equal(
    (await db.query("select * from geraldo.properties")).rows.length,
    1,
  );
  assert.equal(
    (await db.query("select * from geraldo.property_addresses")).rows.length,
    0,
  );
  pass("Imóvel publicado visível; endereço aproximado permanece privado");
  await assert.rejects(() => db.query("delete from geraldo.properties"));
  pass("Visitante não exclui imóveis");
  await db.query(
    "insert into geraldo.leads(id,name,phone,origin,property_id,utms) values($1,'Contato teste','84900000000','imovel',$2,$3)",
    [leadId, propertyId, JSON.stringify({ utm_campaign: "teste" })],
  );
  await assert.rejects(() => db.query("select * from geraldo.leads"));
  pass("Visitante envia lead mas não lê os contatos armazenados");
  await as("authenticated", viewer);
  assert.equal((await db.query("select * from geraldo.leads")).rows.length, 0);
  assert.equal(
    (
      await db.query(
        "update geraldo.leads set status='Convertido' returning id",
      )
    ).rows.length,
    0,
  );
  pass("Usuário comum não lê nem altera leads");
  await as("authenticated", admin);
  assert.equal(
    (await db.query("select utms from geraldo.leads")).rows[0].utms
      .utm_campaign,
    "teste",
  );
  await db.query(
    "update geraldo.leads set status='Visita agendada' where id=$1",
    [leadId],
  );
  pass("Administrador lê UTMs e atualiza atendimento");
  p.map_mode = "exact";
  await save();
  await as("anon");
  assert.equal(
    (await db.query("select address from geraldo.property_addresses")).rows[0]
      .address,
    p.address,
  );
  pass("Endereço completo só é público quando explicitamente configurado");
  await assert.rejects(() =>
    db.query(
      "insert into storage.objects(bucket_id,name) values('property-images','teste.webp')",
    ),
  );
  await as("authenticated", admin);
  await db.query(
    "insert into storage.objects(bucket_id,name) values('property-images','teste.webp')",
  );
  pass("Escrita no bucket restrita a administradores");
  p.status = "Vendido";
  await save();
  await as("anon");
  assert.equal(
    (await db.query("select * from geraldo.properties")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from geraldo.property_addresses")).rows.length,
    0,
  );
  pass("Imóvel vendido e endereço deixam de aparecer publicamente");
  await as("authenticated", admin);
  await db.query("delete from geraldo.properties where id=$1", [propertyId]);
  assert.equal(
    (await db.query("select * from geraldo.property_images")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from geraldo.property_features")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select property_id from geraldo.leads")).rows[0]
      .property_id,
    null,
  );
  pass("Exclusão remove relações sem apagar o histórico do lead");
  const lead = (
    await db.query("select * from geraldo.leads where id=$1", [leadId])
  ).rows[0];
  const workflow = {
    id: leadId,
    expected_updated_at: lead.updated_at,
    status: "Em atendimento",
    assignee: "Equipe teste",
    priority: "Alta",
    next_action: "Retornar contato",
    next_action_at: new Date(Date.now() + 86400000).toISOString(),
    lost_reason: "",
    note: "Primeiro atendimento realizado",
    contacted: true,
  };
  await db.query("select geraldo.save_lead_workflow($1::jsonb)", [
    JSON.stringify(workflow),
  ]);
  const updated = (
    await db.query("select * from geraldo.leads where id=$1", [leadId])
  ).rows[0];
  assert.equal(updated.assignee, "Equipe teste");
  assert(updated.first_contact_at);
  assert.equal(
    (
      await db.query("select * from geraldo.lead_activities where lead_id=$1", [
        leadId,
      ])
    ).rows.length,
    2,
  );
  pass(
    "Atendimento salva responsável, agenda, primeiro contato e histórico na mesma transação",
  );
  await assert.rejects(() =>
    db.query("select geraldo.save_lead_workflow($1::jsonb)", [
      JSON.stringify(workflow),
    ]),
  );
  pass("Edição concorrente com versão antiga é recusada");
  await as("authenticated", viewer);
  assert.equal(
    (await db.query("select * from geraldo.lead_activities")).rows.length,
    0,
  );
  await assert.rejects(() => db.query("select geraldo.admin_overview()"));
  await assert.rejects(() =>
    db.query("select geraldo.save_lead_workflow($1::jsonb)", [
      JSON.stringify({ ...workflow, expected_updated_at: updated.updated_at }),
    ]),
  );
  pass(
    "Usuário sem permissão não consulta métricas, histórico ou altera o atendimento",
  );
  await as("authenticated", admin);
  const overview = (await db.query("select geraldo.admin_overview() data"))
    .rows[0].data;
  assert.equal(overview.leads, 1);
  assert.equal(overview.stages["Em atendimento"], 1);
  pass("Métricas agregadas refletem os registros reais");
  await db.query(
    "insert into geraldo.content(id,kind,title) values(gen_random_uuid(),'city','Cidade teste')",
  );
  const cityId = (
    await db.query("select id from geraldo.cities where name='Cidade teste'")
  ).rows[0].id;
  await db.query(
    "update geraldo.content set title='Cidade renomeada' where title='Cidade teste'",
  );
  assert.equal(
    (
      await db.query(
        "select id from geraldo.cities where name='Cidade renomeada'",
      )
    ).rows[0].id,
    cityId,
  );
  pass("Renomear cadastro auxiliar preserva o ID canônico");
  await as("anon");
  for (let i = 0; i < 4; i++)
    await db.query(
      "insert into geraldo.leads(name,phone,origin) values('Limite teste','84912345678','contato')",
    );
  await assert.rejects(() =>
    db.query(
      "insert into geraldo.leads(name,phone,origin) values('Limite teste','84912345678','contato')",
    ),
  );
  pass("Limite persistente também protege inserção direta na Data API");
  await as("postgres");
  await db.exec(
    readFileSync(
      "supabase/migrations/20260906224037_public_catalog.sql",
      "utf8",
    ),
  );
  await as("authenticated", admin);
  for (let i = 0; i < 19; i++) {
    await db.query("select geraldo.save_property($1::jsonb)", [
      JSON.stringify({
        ...p,
        id: crypto.randomUUID(),
        slug: `catalog-${i}`,
        code: `CAT-${i}`,
        title: `Mansão São José ${i}`,
        status: "Disponível",
        active: i < 18,
        show_price: i !== 0,
        price: 100 + i,
      }),
    ]);
  }
  await as("anon");
  const catalog = await db.query(
    "select * from geraldo.catalog_search where search_text like '%mansao sao jose%' order by visible_price asc nulls last,created_at desc,id",
  );
  assert.equal(catalog.rows.length, 18);
  assert.equal(catalog.rows.at(-1).visible_price, null);
  assert.equal(catalog.rows[0].visible_price, "101");
  pass(
    "Busca sem acentos exclui rascunhos e coloca preços sob consulta por último",
  );
  const seen = new Set();
  for (let offset = 0; offset < 18; offset += 6) {
    const page = await db.query(
      "select id from geraldo.catalog_search where search_text like '%mansao sao jose%' order by created_at desc,id limit 6 offset $1",
      [offset],
    );
    assert.equal(page.rows.length, 6);
    for (const row of page.rows) {
      assert(!seen.has(row.id));
      seen.add(row.id);
    }
  }
  assert.equal(seen.size, 18);
  pass("Três páginas públicas não repetem nem omitem imóveis com datas iguais");
  const filtered = await db.query(
    "select id from geraldo.catalog_search where search_text like '%mansao sao jose%' and visible_price >= 110 and visible_price <= 115 and city='Natal' and bedrooms >= 3",
  );
  assert.equal(filtered.rows.length, 6);
  pass(
    "Filtros públicos combinados preservam a faixa de preço e a localização",
  );
  mkdirSync("database", { recursive: true });
  writeFileSync(
    "database/TEST-RESULTS.md",
    `# Validação SQL local\n\nExecutado em ${new Date().toISOString()}.\n\n${results.map((x) => "- Aprovado: " + x).join("\n")}\n\n${results.length} verificações aprovadas em PostgreSQL embarcado (PGlite). Auth e Storage foram simulados apenas no nível SQL. Esta execução isolada não altera bancos remotos. Evidências de integração real estão em VALIDATION.md e data/VALIDACAO-PRODUCAO.txt.\n`,
  );
  console.log(`${results.length} verificações aprovadas.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
