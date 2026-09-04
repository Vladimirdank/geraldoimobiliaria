# Integração Supabase

O projeto solicitado, **Cecilia Menezes - Site**, não apareceu na conexão disponível. Nenhum banco remoto foi alterado. A aplicação local usa SQLite, com autenticação de desenvolvimento no servidor e dados persistentes.

O arquivo `schema.sql` é uma definição de bootstrap ainda não aplicada. Usa o schema dedicado `geraldo` para evitar colisões com tabelas de outros sites. Quando o projeto correto estiver acessível:

1. Inspecionar o banco existente e aplicar a definição como migração pelo fluxo Supabase.
2. Expor somente `geraldo` nas configurações da Data API; manter `geraldo_private` fora da lista.
3. Configurar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local` e no ambiente de hospedagem.
4. Criar o administrador pelo Supabase Auth e inserir seu UUID em `geraldo.profiles` com role `admin` por uma operação administrativa. Nenhum cadastro público promove usuários.
5. Configurar URL do site e URLs de redirecionamento `/auth/confirm` e `/admin/reset`. No template Recovery usar `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` no domínio correto.
6. Cadastrar os dados comerciais e imóveis reais. O seed local é exclusivo de desenvolvimento.
7. Testar RLS com visitante, usuário sem perfil de administrador e administrador; revisar os advisors antes de publicar.

As fotos são armazenadas no bucket público `property-images`. É necessário publicar somente fotografias autorizadas. Endereços ficam em tabela separada e só são retornados publicamente quando a configuração do imóvel é `exact`.

O cadastro de leads público permite somente INSERT com campos limitados; leitura e atualização são administrativas. Para produção, adicionar proteção antiabuso persistente/CAPTCHA no ponto de entrada; o limitador HTTP local é por processo e não substitui um limitador distribuído.

## Validação local

A estrutura foi executada integralmente em PostgreSQL embarcado e passou em 15 verificações de relacionamentos, transações e RLS. Execute `npm run test:database` para reproduzir. Consulte `MODEL.md` para o modelo e `TEST-RESULTS.md` para o resultado. Isso não substitui os testes de integração no projeto Supabase de destino.
