import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
mkdirSync("data", { recursive: true });
const db = new DatabaseSync("data/geraldo.db");
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS properties(id TEXT PRIMARY KEY,slug TEXT UNIQUE,code TEXT UNIQUE,payload TEXT NOT NULL,sort_order INTEGER DEFAULT 0,created_at TEXT);
CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,email TEXT UNIQUE,password_hash TEXT NOT NULL,salt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,name TEXT,phone TEXT,email TEXT,property_id TEXT,origin TEXT,message TEXT,status TEXT,utms TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,kind TEXT,title TEXT,body TEXT,extra TEXT,sort_order INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS site_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER,reset_at INTEGER);`);
const photos = [
  "photo-1600607687920-4e2a09cf159d",
  "photo-1600210492486-724fe5c67fb0",
  "photo-1600607687939-ce8a6c25118c",
  "photo-1600566753086-00f18fb6b3ea",
  "photo-1600047509807-ba8f99d2cdde",
  "photo-1600607688969-a5bfcd646154",
];
const photo = (i: number) =>
  `https://images.unsplash.com/${photos[i % photos.length]}?auto=format&fit=crop&w=1600&q=85`;
const existing = db.prepare("SELECT count(*) as n FROM properties").get() as {
  n: number;
};
if (!existing.n) {
  [
    [
      "Casa Jardim das Dunas",
      "casa-jardim-das-dunas",
      "Casa",
      "Capim Macio",
      "Natal",
      1890000,
      320,
      4,
      4,
      "EXCLUSIVO",
    ],
    [
      "Apartamento Horizonte",
      "apartamento-horizonte",
      "Apartamento",
      "Ponta Negra",
      "Natal",
      1250000,
      168,
      3,
      3,
      "DESTAQUE",
    ],
    [
      "Casa Reserva do Parque",
      "casa-reserva-do-parque",
      "Casa",
      "Nova Parnamirim",
      "Parnamirim",
      1580000,
      280,
      4,
      3,
      "NOVO",
    ],
    [
      "Residência Luz do Sol",
      "residencia-luz-do-sol",
      "Condomínio",
      "Pium",
      "Parnamirim",
      2490000,
      410,
      4,
      4,
      "EXCLUSIVO",
    ],
    [
      "Apartamento Essencial",
      "apartamento-essencial",
      "Apartamento",
      "Tirol",
      "Natal",
      4800,
      118,
      3,
      2,
      "OPORTUNIDADE",
    ],
    [
      "Terreno Bosque Sereno",
      "terreno-bosque-sereno",
      "Terreno",
      "Cotovelo",
      "Parnamirim",
      420000,
      450,
      0,
      0,
      "LANÇAMENTO",
    ],
  ].forEach((r, i) => {
    const p = {
      id: randomUUID(),
      title: r[0],
      slug: r[1],
      code: `GI-00${i + 1}`,
      type: r[2],
      neighborhood: r[3],
      city: r[4],
      price: r[5],
      area: r[6],
      bedrooms: r[7],
      suites: r[8],
      tag: r[9],
      description:
        "Espaços que convidam a ficar. Uma propriedade com ambientes integrados, luz natural e uma relação especial entre o interior e a paisagem.\n\nA área social foi pensada para receber com conforto, enquanto os ambientes privativos oferecem tranquilidade no dia a dia.\n\nEste é um imóvel demonstrativo para apresentação do site. Fotografias ilustrativas, sem vínculo com uma oferta real.",
      short_description:
        "Arquitetura contemporânea, luz natural e espaço para viver bem.",
      purpose: i === 4 ? "Alugar" : "Comprar",
      state: "RN",
      condominium: "",
      address: "",
      map_mode: "approximate",
      condo_fee: 650,
      iptu: 1800,
      show_price: true,
      land_area: Number(r[6]) + 100,
      bathrooms: Number(r[7]) + 1,
      parking: i === 5 ? 0 : 3,
      floor: 0,
      year: 2025,
      status: "Disponível",
      active: true,
      featured: i < 3,
      sort_order: i,
      images: [
        photo(i),
        photo(i + 1),
        photo(i + 2),
        photo(i + 3),
        photo(i + 4),
      ],
      captions: [],
      features: ["Luz natural", "Área gourmet", "Jardim", "Varanda"],
      financing: true,
      fgts: false,
      exchange: false,
      video: "",
      tour: "",
      seo_title: "",
      seo_description: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.prepare("INSERT INTO properties VALUES(?,?,?,?,?,?)").run(
      p.id,
      p.slug,
      p.code,
      JSON.stringify(p),
      i,
      p.created_at,
    );
  });
}
const settings = {
  brand: "Geraldo",
  whatsapp: "",
  creci: "",
  instagram: "",
  email: "",
  hero_image: photo(4),
  hero_title: "Seu próximo capítulo\ncomeça em casa.",
  hero_subtitle:
    "Imóveis selecionados. Conexões verdadeiras.\nEncontre um lugar que combine com a sua história.",
  about_title: "Um olhar atento.\nUma escolha que faz sentido.",
  about_body:
    "Acreditamos que encontrar um imóvel é entender o que realmente importa para você. Por isso, cada atendimento começa com uma conversa e cada seleção tem um propósito.",
  region: "Natal e região",
  accent: "#b94f24",
  demo: "true",
  gtm: "",
  ga4: "",
  meta_pixel: "",
};
for (const [k, v] of Object.entries(settings))
  db.prepare("INSERT OR IGNORE INTO site_settings VALUES(?,?)").run(k, v);
if (!(db.prepare("SELECT count(*) as n FROM content").get() as any).n) {
  [
    [
      "faq",
      "Como agendar uma visita?",
      "Escolha um imóvel e envie uma solicitação de atendimento. Nossa equipe combina com você o melhor dia e horário.",
      "",
    ],
    [
      "faq",
      "Como anunciar meu imóvel?",
      "Preencha o formulário de apresentação do imóvel. Entraremos em contato para conhecer a propriedade e conversar sobre os próximos passos.",
      "",
    ],
    [
      "faq",
      "Vocês trabalham com imóveis usados?",
      "Nossa curadoria inclui diferentes tipos de imóveis. Consulte o catálogo e conte o que está procurando.",
      "",
    ],
    [
      "faq",
      "Como consultar financiamento e documentação?",
      "Solicite atendimento para receber orientações específicas sobre o imóvel. Condições de crédito e uso do FGTS dependem da análise da instituição financeira.",
      "",
    ],
    ...[
      "Casa",
      "Apartamento",
      "Condomínio",
      "Terreno",
      "Lote",
      "Comercial",
    ].map((x) => ["type", x, "", ""]),
    ...["Natal", "Parnamirim"].map((x) => ["city", x, "", ""]),
    ...[
      "Ponta Negra",
      "Capim Macio",
      "Tirol",
      "Nova Parnamirim",
      "Pium",
      "Cotovelo",
    ].map((x) => ["neighborhood", x, "", ""]),
    ...[
      "Piscina",
      "Área gourmet",
      "Jardim",
      "Varanda",
      "Luz natural",
      "Energia solar",
      "Academia",
      "Portaria 24h",
      "Vista para o mar",
    ].map((x) => ["feature", x, "", ""]),
  ].forEach((r, i) =>
    db
      .prepare("INSERT INTO content VALUES(?,?,?,?,?,?)")
      .run(randomUUID(), r[0], r[1], r[2], r[3], i),
  );
}
if (!(db.prepare("SELECT count(*) as n FROM profiles").get() as any).n) {
  const email = process.env.LOCAL_ADMIN_EMAIL || "admin@geraldo.local";
  const password =
    process.env.LOCAL_ADMIN_PASSWORD || randomBytes(18).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  db.prepare("INSERT INTO profiles VALUES(?,?,?,?)").run(
    randomUUID(),
    email,
    scryptSync(password, salt, 64).toString("hex"),
    salt,
  );
  writeFileSync(
    "data/ACESSO-LOCAL.txt",
    `Acesso local de desenvolvimento\nEmail: ${email}\nSenha: ${password}\n\nhttp://localhost:3000/admin/login\nNão publicar este arquivo.\n`,
  );
  console.log(
    "Credenciais locais gravadas em data/ACESSO-LOCAL.txt (ignorado pelo Git).",
  );
}
console.log(
  "Banco local pronto. Seed idempotente; registros existentes preservados.",
);
