# Geraldo Imobiliária

## Referência e direção

A referência principal solicitada é caiofernandes.com.br: menu institucional, empreendimentos, venda, locação, busca rápida e avançada, destaques, ficha de imóvel, favoritos, captação e contato. A Geraldo preserva esses caminhos com identidade independente: verde floresta, marfim, serifas editoriais, espaços amplos e fotografia arquitetônica. Nenhum texto, marca ou imagem da referência será reutilizado.

## Sitemap

`/`, `/imoveis` (filtros na URL), `/imovel/[slug]`, `/favoritos`, `/contato`, `/privacidade`, `/termos`, `/admin/login`, `/admin`.

## Componentes

Layout: Header, Footer. Imóveis: PropertyCard, SearchForm, PropertyGallery, FavoriteButton. Conversão: LeadForm. Administração: AdminDashboard, PropertyEditor, ContentEditor. Serviços: repository, authentication, tracking. Páginas usam serviços; dados demonstrativos ficam somente no seed.

## Dados e execução

Modelo relacional com properties, property_images, property_features, features, property_types, cities, neighborhoods, condominiums, profiles, sessions, leads, testimonials, faqs e site_settings. UUIDs e timestamps. O desenvolvimento local usa SQLite persistido em disco; seed explícito, separado da interface. Um adaptador Supabase e esquema SQL serão preparados para PostgreSQL/Auth/Storage; conexão de produção depende da identificação do projeto. O modo local não será disponibilizado como autenticação de produção.

## Fluxos

Visitante filtra catálogo, consulta ficha, favorita localmente e envia formulário; API valida e persiste lead e UTMs. Administrador autentica no servidor, gerencia imóveis/fotos/status/ordem e conteúdo; o catálogo consulta o mesmo banco. Escritas exigem sessão administrativa e validação de origem. Fotos passam por compressão no servidor.

## Publicação

Dados, fotografias e depoimentos demonstrativos são identificados; telefone, CRECI e credenciais reais não são inventados. Produção exige configuração de Supabase, dados comerciais, domínio e revisão do conteúdo. Tracking somente após consentimento.
