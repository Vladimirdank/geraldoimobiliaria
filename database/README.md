# Integração Supabase

As migrações em `supabase/migrations` foram aplicadas ao projeto **Imobiliaria-geraldo** (`habiqagnbbwpefwjmyyp`) em 05/09/2026. `schema.sql` preserva o bootstrap; a migração admin_workspace acrescenta o fluxo de atendimento.

A aplicação utiliza Supabase quando as variáveis públicas estão configuradas. SQLite permanece disponível para desenvolvimento sem essas variáveis. O schema `geraldo` está exposto à Data API; `geraldo_private` permanece privado. RLS protege os dados administrativos. O administrador é vinculado ao Supabase Auth por `profiles`.

O catálogo inicial contém seis imóveis identificados como demonstração. Substitua por dados comerciais reais. As fotos usam o bucket público `property-images`. Endereços ficam separados e só são públicos quando configurados como exact.

Os leads públicos permitem inserção limitada. Um gatilho persistente limita submissões por telefone; leitura, histórico e atualização exigem administrador. CAPTCHA e proteção distribuída adicional permanecem no roadmap.

## Validação

`npm run test:database` executa 21 verificações PostgreSQL isoladas. A integração também foi validada com o Supabase real: autenticação, paginação, publicação, leads, histórico, concorrência, agenda e upload, removendo os registros temporários. Consulte `../VALIDATION.md`.

## Operação pendente

Configurar SMTP e homologar recuperação por e-mail. O template Recovery deve encaminhar para `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` no domínio publicado. A troca de senha autenticada está disponível no painel. Backups e restauração ainda precisam ser homologados.
