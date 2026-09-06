# Validação SQL local

Executado em 2026-09-06T22:41:50.103Z.

- Aprovado: Estrutura SQL e migração do painel executadas integralmente no PostgreSQL local
- Aprovado: RLS ativo em todas as tabelas da aplicação
- Aprovado: Usuário sem papel admin não consegue cadastrar imóveis
- Aprovado: Usuário não consegue promover a própria permissão
- Aprovado: Administrador cadastra imóvel, imagens e diferenciais em transação única
- Aprovado: Visitante não lê rascunhos nem suas imagens
- Aprovado: Imóvel publicado visível; endereço aproximado permanece privado
- Aprovado: Visitante não exclui imóveis
- Aprovado: Visitante envia lead mas não lê os contatos armazenados
- Aprovado: Usuário comum não lê nem altera leads
- Aprovado: Administrador lê UTMs e atualiza atendimento
- Aprovado: Endereço completo só é público quando explicitamente configurado
- Aprovado: Escrita no bucket restrita a administradores
- Aprovado: Imóvel vendido e endereço deixam de aparecer publicamente
- Aprovado: Exclusão remove relações sem apagar o histórico do lead
- Aprovado: Atendimento salva responsável, agenda, primeiro contato e histórico na mesma transação
- Aprovado: Edição concorrente com versão antiga é recusada
- Aprovado: Usuário sem permissão não consulta métricas, histórico ou altera o atendimento
- Aprovado: Métricas agregadas refletem os registros reais
- Aprovado: Renomear cadastro auxiliar preserva o ID canônico
- Aprovado: Limite persistente também protege inserção direta na Data API
- Aprovado: Busca sem acentos exclui rascunhos e coloca preços sob consulta por último
- Aprovado: Três páginas públicas não repetem nem omitem imóveis com datas iguais
- Aprovado: Filtros públicos combinados preservam a faixa de preço e a localização

24 verificações aprovadas em PostgreSQL embarcado (PGlite). Auth e Storage foram simulados apenas no nível SQL. Esta execução isolada não altera bancos remotos. Evidências de integração real estão em VALIDATION.md e data/VALIDACAO-PRODUCAO.txt.
