# Geraldo Imobiliária

Plataforma imobiliária com Next.js 16, React 19, TypeScript, Lucide e banco persistente. Identidade editorial em verde floresta e marfim, com fotografias grandes, tipografia serifada e navegação responsiva. Referência conceitual: caiofernandes.com.br, sem reutilização de identidade, textos ou imagens.

## Executar localmente

Requer Node 22.13+ (SQLite nativo experimental).

```sh
npm ci
npm run seed
npm run dev
```

- Site: http://127.0.0.1:3000
- Administração: http://127.0.0.1:3000/admin/login
- Credenciais locais aleatórias: `data/ACESSO-LOCAL.txt`, ignorado pelo Git.
- Banco: `data/geraldo.db`; fotografias enviadas: `public/uploads/`. Faça backup de ambos.
- O seed preserva dados existentes e não é executado automaticamente no build.
- Sem número de WhatsApp, o site usa formulários de atendimento. Configure posteriormente pelo painel.

## Implementado e verificado localmente

Catálogo e filtros na URL, ordenação, carregar mais, favoritos no navegador, fichas com galeria ampliável, privacidade de endereço, semelhantes, metadata dinâmica, sitemap e robots. Home com seleção editorial, categorias, cidades, institucional, captação e FAQ. Depoimentos e Instagram aparecem após o cadastro de conteúdo real.

Painel com autenticação no servidor, CRUD de imóveis, duplicação, publicação, disponibilidade, destaques, ordem, upload com conversão WebP, capa, legenda, reordenação por arraste/setas, conteúdo, categorias, localizações, configurações, status de leads e CSV. Leads guardam imóvel, origem e UTMs; nenhuma mensagem é enviada automaticamente a terceiros.

GTM, GA4 e Meta Pixel configuráveis, condicionados ao consentimento. Google Ads pode ser configurado pelo GTM. As métricas de audiência dependem das ferramentas configuradas; o painel não inventa contagens de visualização.

## Validação

```sh
npm run typecheck
npm run build
node scripts/smoke.mjs
```

O smoke test exige o servidor local ativo e usa registros temporários identificados, removidos ao final. Verifica autorização, login, rascunho/publicação, atualização de preço, privacidade do endereço, lead com UTMs, status, desativação, origem de requisições, sitemap e exclusão.

## Supabase e produção

O projeto indicado pelo usuário, “Cecilia Menezes - Site”, não está acessível no conector atual. Nenhuma alteração remota foi feita. O adaptador de PostgreSQL/Auth/Storage e a definição de banco estão em `database/`; consulte `database/README.md`. A integração remota e RLS ainda exigem aplicação e teste no projeto correto.

SQLite é o modo de desenvolvimento. Em produção, a aplicação exige Supabase por padrão. A opção `ALLOW_LOCAL_PRODUCTION` é exclusivamente para um servidor Node persistente deliberadamente administrado; não use SQLite em hospedagem serverless com disco efêmero.

Antes da publicação comercial: inserir catálogo e fotos reais, cadastrar CRECI e canais de contato, definir domínio em `NEXT_PUBLIC_SITE_URL`, revisar textos legais e configurar proteção antiabuso distribuída e retenção de dados. Não há uma implantação pública nesta entrega.

## Limites atuais

- Descrições aceitam parágrafos, subtítulos com ## e listas com -; não executam HTML enviado pelo administrador.
- O formulário de proprietários possui campos de cidade, bairro, tipo e valor; os dados são consolidados na mensagem do lead.
- Localizações e categorias podem ser gerenciadas; o modo local mantém seus nomes nos imóveis existentes, portanto renomear uma categoria não altera imóveis já cadastrados.
- Fotografias demonstrativas externas são do Unsplash e não representam os imóveis ou localidades anunciados.
- Recuperação por e-mail só opera após configurar Supabase e seu provedor de e-mail; no modo local, use `scripts/reset-local-password.ts` com as variáveis indicadas.
- Otimização AVIF, analytics próprios, compartilhamento dedicado por rede e integrações de CRM são extensões futuras; Web Share e cópia de link já funcionam.

## Estrutura

`src/app`: rotas e APIs. `src/components`: interface pública e administração. `src/services/repository.ts`: acesso aos dados. `src/lib`: autenticação, validação, formatação e clientes de banco. `scripts`: seed, testes e manutenção local. `database`: definição Supabase ainda não aplicada.
