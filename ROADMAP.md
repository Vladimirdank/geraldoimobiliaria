# Roadmap do portal Geraldo Imobiliária

Análise em 04/09/2026. Base: código atual, esquema SQL, documentação local e resultado do deploy observado nesta conversa. O diagnóstico inicial é histórico; as seções de evolução ao final registram as entregas já implementadas e verificadas.

## Direção do produto

Transformar a base atual em um portal que publique um catálogo confiável, ajude o visitante a encontrar imóveis e entregue oportunidades rastreáveis à equipe comercial. Preservar a identidade aprovada: branco predominante, bege e laranja queimado.

Premissa: uma imobiliária, uma marca e equipe interna. Marketplace com múltiplas imobiliárias, cobrança de anunciantes e aplicativo nativo ficam fora da primeira versão. Se o negócio exigir isso, será necessário rever isolamento de dados, permissões e operação antes de construir essas funções.

## Diagnóstico

Há uma base funcional local: catálogo, filtros, ficha, galeria, favoritos no navegador, formulários, administração, autenticação, edição de conteúdo e esquema relacional preparado. Não é necessário refazer a interface inteira.

O commit 7b8c301 está no GitHub e o projeto Vercel tem integração Git e build concluído. A última verificação HTTP retornou 500. O código exige banco de produção, mas as variáveis Supabase estavam ausentes na última consulta. É uma causa compatível com o erro observado; logs de runtime devem confirmar a cadeia exata na primeira tarefa.

O SQL ainda não foi aplicado ao projeto remoto indicado, “Cecilia Menezes - Site”. Os testes PostgreSQL locais não comprovam Auth, PostgREST e Storage funcionando juntos em produção. Os documentos README, ARCHITECTURE e VALIDATION também precisam ser atualizados: ainda descrevem a paleta verde ou ausência de deploy.

### Achados e consequências

| Prioridade | Evidência no código | Consequência | Encaminhamento |
| --- | --- | --- | --- |
| P0 | `src/lib/db.ts`, `src/lib/supabase.ts`, `src/app/layout.tsx` | Sem configuração de nuvem, até o layout depende do SQLite bloqueado em produção | Conectar o projeto correto, aplicar migrações, validar variáveis e logs; não liberar SQLite na Vercel |
| P0 | `src/app/api/upload/route.ts` aceita 12 MB | Upload via Function pode falhar antes de chegar à validação: Vercel limita o corpo a 4,5 MB | Upload direto autenticado ao Storage, com validação e processamento controlados; alternativamente, reduzir temporariamente o limite efetivo |
| P0 | `src/lib/auth.ts` usa Map em memória; SQL permite INSERT público em leads | Limites não são compartilhados entre instâncias; envio direto à Data API contorna o limitador do site | Definir um único caminho de ingestão protegido e retirar INSERT público direto caso a API seja a fronteira escolhida |
| P0 | `properties()` usa `select('*', relações)`; RLS controla linhas, não preço | `show_price=false` oculta a apresentação, mas não impede leitura do preço pela API pública | Definir se preço é confidencial; se for, projeção pública com preço nulo e dados privados separados, sem acesso direto à coluna original |
| P1 | `content` armazena tipos/cidades; RPC cria também tabelas normalizadas por nome | Renomear categorias no painel pode divergir dos imóveis e filtros | Uma fonte de verdade por entidade e edição por ID |
| P1 | Bairros e condomínios têm nome globalmente único, sem vínculo geográfico | Bairros homônimos de cidades diferentes conflitam; filtros admitem combinações incoerentes | Cidade vinculada a UF, bairro vinculado à cidade, condomínio vinculado à localização |
| P1 | Catálogo filtra e ordena arrays após `properties()`; ficha busca o catálogo para encontrar um slug | Custo cresce com todos os imóveis, pode esbarrar em limite de retorno da API e produzir resultados incompletos | Filtro, contagem, ordenação e paginação no banco; consulta única por slug |
| P1 | `count` é limitado a 100 no catálogo | Carregar mais deixa de avançar após o teto | Paginação real, sem teto silencioso, com ordenação estável |
| P1 | Página admin carrega todos os imóveis, leads, conteúdos e configurações | Lentidão e transferência desnecessária de dados comerciais | Consultas por seção, paginação e filtros no servidor |
| P1 | Lead guarda status, mas não responsável, atividade ou prazo | Não se sabe quem atende, quando houve retorno ou onde a oportunidade parou | Responsável, histórico, tarefas e visitas, no portal ou CRM integrado |
| P1 | Consentimento validado no formulário, não persistido como evidência estruturada | Não há versão do texto nem data específica da escolha | Registrar finalidade, versão e momento, com minimização de dados |
| P1 | Fotos em bucket público; exclusão remove relações, não arquivos | Arquivos órfãos custam armazenamento; URL de foto não depende do status do anúncio | Definir publicação de mídia, caminho dos objetos e limpeza segura; documentos sempre privados |
| P1 | Tracking usa eventos customizados, inicialização global e consentimento local | Eventos podem se perder no carregamento ou duplicar com GTM; scripts podem carregar no admin com consentimento prévio | Testar navegação SPA, primeira visita e consentimento; impedir tracking administrativo; uma estratégia de tags |
| P1 | URLs SEO têm fallback localhost | Sitemap, canonical e dados estruturados podem apontar para ambiente errado | Configuração obrigatória do domínio, tratamento de previews e auditoria das URLs |
| P2 | Não há `.github` com workflow de testes; SQL é bootstrap | Deploy pode passar no build e falhar na primeira requisição; evolução do banco sem trilha de migrações | CI com testes relevantes, smoke remoto e migrações versionadas |

P0: bloqueia uso comercial seguro. P1: necessário para operação consistente. P2: evolução e escala. Achados de exposição descrevem o comportamento do esquema preparado, não um vazamento remoto comprovado.

## Roadmap por entregas

Estimativas abaixo são faixas de esforço de uma pessoa técnica, em dias úteis, para planejamento. Não são prazo contratado. Acesso, decisões, conteúdo e homologação comercial podem ampliar o calendário. As fases têm dependências e não devem ser somadas como promessa automática.

### Fase 0 — Produção funcional e controlada · P0 · 3–5 dias

1. Confirmar o ID e acesso ao Supabase correto; inspecionar estruturas existentes e preservar outros sites. Não substituir a lista de schemas expostos: acrescentar somente o necessário.
2. Transformar o bootstrap em migração inicial versionada. Aplicar schema `geraldo`, políticas, função transacional e Storage, mantendo `geraldo_private` fora da Data API.
3. Separar desenvolvimento/homologação e produção, com dados de teste fora do ambiente comercial. Configurar URL, chave pública e URL do site por ambiente; segredos somente no servidor quando necessários.
4. Criar administrador, configurar recuperação de senha e redirecionamentos; testar login, expiração, logout e recuperação completa.
5. Corrigir ingestão de leads e upload. Se usar credencial privilegiada no servidor, restringir a operação por validação explícita e nunca enviá-la ao navegador; RLS continua necessário para os demais caminhos.
6. Resolver a semântica de preço oculto e garantir que campos privados não sejam retornados por nenhuma API pública.
7. Adicionar diagnóstico de configuração, erros observáveis, endpoint de saúde sem segredos e uma página de indisponibilidade útil. O formulário nunca confirma recebimento sem gravação.
8. Configurar backup e executar restauração de teste do banco e das mídias necessárias. Registrar procedimento de recuperação e rollback compatível com migrações.

**Pronta quando:** home, catálogo e ficha respondem 200; visitante não lê leads nem altera catálogo; usuário sem papel admin é recusado; admin cadastra e publica um imóvel e envia foto no tamanho suportado; lead persiste e aparece no painel; recuperação de senha funciona; caminhos diretos de API respeitam as mesmas restrições; rollback e restauração têm evidência.

**Dependências:** acesso ao Supabase e ao domínio, conta administrativa e provedor de e-mail. Não requer WhatsApp: manter os formulários, conforme solicitado.

### Fase 1 — Catálogo administrável e confiável · P1 · 5–8 dias

1. Unificar categorias e localizações por IDs. Criar migração com relatório de correspondências, duplicidades e nomes sem resolução; validar contagens antes e depois.
2. Implementar busca no banco, com normalização de acentos, código exato, faixa de preço, finalidade e filtros dependentes. Preços sob consulta ficam fora da ordenação numérica ou têm regra explícita.
3. Paginar catálogo e admin, com desempate por ID/data. Consultar ficha por slug; definir índices a partir das consultas e planos de execução, sem indexar todos os campos indiscriminadamente.
4. Separar estado editorial (rascunho/publicado/arquivado) de disponibilidade comercial. Bloquear publicação incompleta, exigindo campos e imagens definidos pela operação.
5. Definir precisão de dinheiro e áreas, inteiros para cômodos, periodicidade de aluguel/condomínio/IPTU e diferença entre desconhecido e zero. Hoje alguns validadores aceitam números fracionários onde o banco espera inteiro.
6. Incluir atualização de disponibilidade, histórico de preços e alerta de anúncio desatualizado; alteração de slug cria redirecionamento.
7. Melhorar gestão de mídia: capa e legenda por objeto, progresso, recuperação de falha, limite total por anúncio e limpeza de órfãos com carência e checagem de referências.
8. Importar catálogo real com prévia, validação e relatório de erros; fotos locais precisam ser transferidas, não apenas copiar URLs `/uploads/`.

**Pronta quando:** renomear um bairro preserva os vínculos; bairros homônimos de cidades diferentes coexistem; filtros nunca omitem resultados por limite implícito; publicação inválida é recusada; preço e status atualizados aparecem no site; URLs antigas redirecionam; catálogo de teste com 1.000 anúncios permite verificar paginação e latência, sem alegar que esse seja o volume real da imobiliária.

### Fase 2 — Atendimento comercial rastreável · P1 · 5–8 dias

Decidir antes de implementar: o portal mantém um funil simples ou entrega a operação a um CRM existente? Recomendação: se a equipe já trabalha em um CRM, usá-lo como registro principal de atendimento e manter no portal o histórico de entrega e vínculo com o imóvel.

1. Captura com identificador único, normalização de contato, deduplicação sem perder interesses diferentes e idempotência para reenvio da mesma solicitação.
2. Responsável, status, prioridade, data de primeiro retorno, próxima atividade e motivo de perda. Histórico de mudança de etapa imutável para usuários comuns.
3. Visitas com imóvel, cliente, corretor, horário, estado e observações; começar com solicitação de horário, sem prometer disponibilidade automática.
4. Captação de proprietário como processo próprio: dados estruturados do imóvel, triagem, avaliação e autorização de anúncio. Dados de contato e documentos em área privada.
5. Se integrar CRM, usar fila de entrega, identificador externo, retentativas, erros visíveis e reprocessamento sem duplicação. Nunca perder o lead por indisponibilidade do CRM.
6. Definir notificações internas, canal e destinatários com a operação antes de ativar envios. Registrar consentimentos e implementar procedimento de exportação, correção e exclusão de dados.

**Pronta quando:** cada oportunidade tem responsável e próxima ação; retornos e visitas têm histórico; uma falha simulada do CRM é recuperada sem duplicação; um lead pode ser encontrado e atendido mesmo sem WhatsApp; relatório de conversão usa etapas reais, não estimativas.

### Fase 3 — Experiência premium e aquisição mensurável · P1/P2 · 4–7 dias

1. Consolidar tokens de branco, bege e laranja, estados de foco/erro/sucesso e componentes reutilizáveis. Refinar formulários e navegação mobile com teclado e leitor de tela.
2. Testar com 3–5 pessoas tarefas concretas: encontrar imóvel dentro do orçamento, entender custos, favoritar, enviar interesse e anunciar imóvel. Registrar dificuldades observadas, não somente opinião estética.
3. Melhorar retorno de busca sem resultados, filtros ativos, remoção individual, clareza de custos e localização aproximada. Manter favoritos sem login obrigatório.
4. Substituir conteúdo demonstrativo por anúncios e fotografias autorizados; cadastrar identidade comercial, CRECI, contato e textos revisados. Revisão jurídica dos textos e procedimentos por responsável apropriado; este roadmap não certifica adequação legal.
5. Domínio definitivo, sitemap válido, canonical, OG com imagem e regras para URLs filtradas, imóveis indisponíveis e previews. Páginas de bairros só quando houver conteúdo útil e estoque suficiente.
6. Definir um dicionário de eventos: busca, resultado vazio, ficha, favorito, início/envio de formulário e visita agendada. Testar consentimento, recusa e alteração posterior; excluir admin e evitar dados pessoais nas ferramentas de audiência.
7. Medir performance e otimizar imagens, fontes e consultas. Aplicar cache somente a dados públicos, com invalidação após edição; nunca compartilhar cache de leads ou sessão.

**Pronta quando:** tarefas principais funcionam no celular e por teclado; não há URL localhost em páginas públicas; eventos não duplicam nem incluem dados pessoais; imagens têm dimensões adequadas; metas de campo no percentil 75: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Sem tráfego suficiente, usar laboratório como diagnóstico e aguardar dados de campo para afirmar cumprimento.

### Fase 4 — Governança e evolução contínua · P2 · primeiro ciclo de 3–5 dias

1. CI: tipos, build, testes de banco e testes de fluxo; homologação antes de promover a produção. Smoke HTTP após cada deploy, incluindo uma rota dependente do banco.
2. Logs estruturados sem dados pessoais desnecessários, alertas de erro 5xx e falhas de leads/upload, acompanhamento de armazenamento e custo.
3. Perfis admin/editor/comercial com matriz de permissões e trilha de auditoria. Separar acesso ao conteúdo de acesso a contatos comerciais.
4. Política de backup, retenção, descarte e revisão periódica de acesso. Definir objetivos de recuperação com o negócio e testar restauração, incluindo mídia.
5. Documentação de operação: cadastrar imóvel, publicar, receber lead, resolver falha de integração e reverter versão.

**Pronta quando:** mudança pode ser testada, implantada, observada e revertida por procedimento documentado; edição sensível possui autor/data; contas recebem somente acesso necessário; falha de captura é detectável antes de depender da reclamação de um cliente.

Instrumentação mínima, CI e backup começam na fase 0; esta fase aprofunda a governança, não posterga controles essenciais.

## Estrutura de dados a evoluir

| Entidade | Mudança proposta | Momento |
| --- | --- | --- |
| cities / neighborhoods / condominiums | Hierarquia geográfica, chaves compostas adequadas e IDs como referência | Fase 1 |
| properties | Estado editorial, responsável, última verificação e regra clara de custos | Fase 1 |
| property_images | Caminho do objeto, dimensões, tamanho e estado de processamento | Fases 0–1 |
| property_price_history / property_status_history | Histórico com autor, data e valores anterior/novo | Fase 1 |
| redirects | URL antiga e destino, evitando loops | Fase 1 |
| contacts / leads | Separar pessoa e interesse quando necessário; preservar identificação do envio | Fase 2 |
| lead_activities / lead_assignments / visits | Atendimento e agenda, somente se não duplicarem o CRM escolhido | Fase 2 |
| owner_submissions | Captação estruturada com dados privados | Fase 2 |
| consent_records | Versão, finalidade e momento da escolha | Fases 0–2 |
| integration_outbox | Entregas ao CRM, tentativas, status e idempotência | Fase 2 |
| audit_log / profiles | Trilha de mudanças e papéis operacionais | Fases 0–4 |

Não criar todas as tabelas de uma vez. Cada migração deve acompanhar um fluxo real, permissões e teste correspondente. Evitar converter o site inteiro para outro framework ou introduzir microsserviços nesta etapa.

## Backlog inicial executável

| Ordem | Entrega | Responsável principal | Dependência |
| --- | --- | --- | --- |
| 1 | Confirmar runtime/logs e acesso ao Supabase escolhido | Desenvolvimento + responsável pelas contas | Acesso |
| 2 | Migração inicial, ambientes, configuração e administrador | Desenvolvimento | 1 |
| 3 | Fluxo remoto completo: login → imóvel → foto → publicação → lead | Desenvolvimento + operação | 2 |
| 4 | Corrigir upload, exposição de campos privados e ingestão antiabuso | Desenvolvimento | 2; antes de tráfego comercial |
| 5 | Unificar categorias/localizações e migrar vínculos | Desenvolvimento | 2 |
| 6 | Consultas paginadas e ficha por slug | Desenvolvimento | 5 |
| 7 | Catálogo real e validação de publicação | Operação + desenvolvimento | 3–6 |
| 8 | Escolher CRM ou funil interno e definir responsável por leads | Comercial + produto | Pode decidir durante 1–7 |
| 9 | Implementar atendimento e métricas de funil | Desenvolvimento + comercial | 8 |
| 10 | Revisão mobile, conteúdo, SEO, tracking e lançamento comercial | Produto + operação + desenvolvimento | 4, 7 e responsável pelo atendimento definido |

## Indicadores de sucesso

Estabelecer a linha de base após instrumentar; não há dados atuais suficientes para prometer aumento de conversão.

| Indicador | Definição / uso |
| --- | --- |
| Sucesso de captura | Envios válidos persistidos ÷ tentativas válidas; acompanhar falhas separadamente |
| Conversão ficha → lead | Sessões elegíveis com interesse enviado ÷ sessões elegíveis com ficha vista; explicitar cobertura de consentimento |
| Tempo de primeiro atendimento | Intervalo entre criação e primeiro contato real; mediana e p90, respeitando horário comercial |
| Leads sem responsável / vencidos | Identificar perda operacional diária |
| Visitas e conversão comercial | Leads com visita realizada e negócio concluído por coorte; evitar misturar períodos de aquisição e fechamento |
| Saúde do catálogo | Anúncios completos, imagens válidas e disponibilidade verificada dentro da cadência definida |
| Busca sem resultados | Proporção e filtros mais frequentes, para revisar estoque e experiência |
| Saúde técnica | Taxa 5xx, falhas de upload, latência, Core Web Vitals e custo por volume real |

## Decisões do negócio necessárias

- Acesso ao projeto Supabase indicado e domínio final.
- Volume aproximado de imóveis e frequência de atualização, para calibrar importação e testes.
- Quem publica, quem atende e quem aprova mudanças de preço.
- CRM já utilizado ou necessidade de funil interno.
- Venda, locação e lançamentos: quais têm operação ativa? Hoje lançamento é uma etiqueta; empreendimento com plantas/unidades/estoque precisa de modelo próprio se for requisito comercial.
- Se “preço sob consulta” significa dado confidencial ou apenas opção de apresentação.
- Materiais reais, autorizações de imagem, canais de atendimento e identidade comercial. WhatsApp permanece opcional até ser fornecido.

## Adiar até existir demanda comprovada

Comparador avançado, alertas personalizados, conta de visitante, portal do proprietário, mapa como navegação principal, chatbot com IA, app nativo e marketplace. Empreendimentos/unidades, feeds para portais externos e importação recorrente de CRM podem subir de prioridade se já forem centrais à operação. Integrações precisam de contrato de dados e controle de falhas; não devem ser acrescentadas apenas como botões na interface.

## Referências técnicas consultadas

- [Limites das Vercel Functions](https://vercel.com/docs/functions/limitations): limite de corpo de 4,5 MB fundamenta a revisão do upload.
- [Segurança da API Supabase](https://supabase.com/docs/guides/api/securing-your-api): grants, schemas e RLS precisam cobrir o acesso direto à Data API.
- [Chaves da API Supabase](https://supabase.com/docs/guides/getting-started/api-keys): chave pública não é uma barreira de autorização; segredos ficam em componentes confiáveis do servidor.
- [Web Vitals](https://web.dev/articles/vitals): metas e avaliação em campo no percentil 75.

Recomendação de execução: começar pelas fases 0 e 1, validar a operação com catálogo real e definir o processo de atendimento antes de ampliar aquisição ou adicionar novas áreas ao portal.

## Evolução executada em 05/09/2026

- [x] Projeto Supabase identificado e conectado: Imobiliaria-geraldo (habiqagnbbwpefwjmyyp).
- [x] Migrações versionadas e aplicadas; administrador criado; API, Auth e Storage testados juntos.
- [x] Painel redesenhado em branco/bege/laranja, navegação por seção e dados sob demanda.
- [x] Paginação real de imóveis e contatos administrativos; métricas agregadas.
- [x] Responsável, prioridade, próxima ação, primeiro contato, motivo de perda, histórico e proteção contra sobrescrita.
- [x] Agenda de próximas ações, exportação da página atual, conteúdo e configurações.
- [x] Checklist e validação de publicação; preparação de fotos abaixo do limite da Vercel.
- [x] Renomeação sincronizada de cadastros auxiliares e recusa de exclusão de itens em uso.
- [x] Consentimento registrado e limite persistente de leads no banco, inclusive acesso direto.
- [x] Pipeline CI básico e endpoint de saúde.
- [ ] Paginação do catálogo público, projeção de preços confidenciais e hierarquia geográfica completa.
- [ ] Papéis editor/comercial, CRM externo, calendário de visitas com disponibilidade e captação estruturada.
- [ ] SMTP/recuperação por e-mail, backup com restauração testada, limpeza de mídia e homologação isolada.
- [ ] Auditoria ampla de eventos/consentimento, SEO e Core Web Vitals em campo.

As fases originais abaixo/acima são o plano completo; esta atualização registra o escopo entregue, sem marcar todo o roadmap como concluído. Consulte ARCHITECTURE.md e VALIDATION.md para o comportamento atual.

## Evolução executada em 06/09/2026 — catálogo público

- [x] Filtros, contagem, ordenação e páginas de seis imóveis executados no banco, sem teto de 100 resultados.
- [x] Busca sem acentos, filtros removíveis individualmente e navegação que preserva a pesquisa.
- [x] Ficha consultada diretamente por slug; sugestões limitadas à mesma cidade e finalidade.
- [x] Preços sob consulta ficam no fim da ordenação e fora das faixas numéricas.
- [x] Projeção de busca com security_invoker, preservando RLS; 24 verificações SQL isoladas aprovadas.

Esta entrega não resolve a confidencialidade do preço na tabela original. Home, favoritos e sitemap ainda usam a consulta anterior; hierarquia geográfica, sigilo de preço na API, SMTP e recuperação continuam pendentes.

- [ ] Habilitar proteção contra senhas vazadas no Supabase Auth (aviso do advisor em 06/09/2026).
