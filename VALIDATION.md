# Verificação da entrega local

- Compilação de produção Next.js e verificação TypeScript aprovadas.
- Onze verificações de integração local aprovadas em `scripts/smoke.mjs`: bloqueio de escrita anônima, login, rascunho oculto, publicação, privacidade do endereço, edição, lead/UTMs, status do lead, desativação, origem, sitemap e limpeza/exclusão (alguns itens agrupados).
- Navegador: fotografias carregadas; home e ficha inspecionadas em desktop e celular; busca de apartamento para compra retornou um resultado; favorito salvo e recuperado na página de favoritos.
- Ficha do imóvel sem transbordamento horizontal observado em 375, 390, 430, 768, 1024, 1440 e 1920 px. Home inspecionada em desktop e mobile; overrides de tela removidos ao final.
- Nenhum WhatsApp visível sem número cadastrado. Portfólio explicitamente demonstrativo.
- Supabase remoto não aplicado e não validado: o projeto informado não aparece na conexão atual. Arquivos SQL e adaptador são preparação para integração, não evidência de uma implantação funcional na nuvem.
- Não há deploy público. A prévia depende do processo local `npm run dev`.
