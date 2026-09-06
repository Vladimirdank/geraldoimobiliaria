# Validação da evolução do painel — 05/09/2026

- Build Next.js e TypeScript aprovados.
- 21 verificações PostgreSQL isoladas: transações, RLS, privacidade de endereço, histórico de atendimento, proteção contra edição concorrente, métricas agregadas, sincronização de nomes e limite persistente de leads.
- 11 verificações de integração SQLite aprovadas antes da troca do workspace para Supabase.
- Integração real Supabase via aplicação local aprovada: acesso anônimo recusado; login administrativo; paginação de 13 imóveis em duas páginas sem repetição; publicação sem fotos bloqueada; formulário grava lead e consentimento; responsável, primeiro contato, histórico e agenda persistidos; edição desatualizada retorna 409; upload convertido para WebP e acessível no Storage; seis seções do painel respondem 200.
- Dados temporários de validação e imagem de teste removidos ao final.
- Supabase: migrações initial_portal e admin_workspace aplicadas ao projeto habiqagnbbwpefwjmyyp; schema geraldo exposto à Data API; geraldo_private não exposto.
- Administrador criado pelo formulário oficial Supabase sem envio de convite; papel admin atribuído no banco. Credencial guardada apenas em data/ACESSO-PRODUCAO.txt.
- Site URL e redirecionamentos da autenticação configurados. Recuperação por e-mail não foi disparada nem homologada.
- Advisor de segurança consultado: informação de RLS sem política na tabela privada de contadores é intencional (nega acesso direto). Nenhum erro reportado nessa consulta.

Validação de publicação e inspeção visual finais são acrescentadas ao concluir o deploy. Testes de restauração, carga e integrações externas não foram executados e permanecem no roadmap.

Inspeção visual: visão geral e catálogo conferidos em desktop; catálogo conferido em viewport 390x844 sem transbordamento da página, com tabela em área própria de rolagem. Build final aprovado.

06/09/2026: 24 verificações SQL aprovadas, incluindo acentos, ocultação de rascunhos, ordenação com preço sob consulta, três páginas sem repetição e filtros combinados. Migração public_catalog aplicada ao Supabase.
