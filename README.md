# Geraldo Imobiliária

Portal com catálogo público e painel de gestão em Next.js, React, TypeScript e Supabase. Paleta branca e bege com laranja queimado.

## Acesso

- Site: https://geraldo-imobiliaria.vercel.app
- Painel: https://geraldo-imobiliaria.vercel.app/admin
- Credenciais da operação: arquivo local `data/ACESSO-PRODUCAO.txt`, ignorado pelo Git. Troca de senha em Configurações.

## Desenvolvimento

```sh
npm ci
npm run dev
```

Copie `.env.example` para `.env.local` e configure o projeto. Sem variáveis Supabase, execute `npm run seed` uma vez para usar SQLite local. O seed não é executado no build e não sobrescreve os dados existentes. Não use SQLite na Vercel.

## Painel

Visão geral com métricas reais; catálogo paginado com lista/cartões, busca e filtros; editor com checklist de publicação e fotos otimizadas; atendimentos com responsável, prioridade, observações, histórico e proteção contra sobrescrita; agenda de próximas ações; conteúdo e configurações; CSV da página atual.

O catálogo demonstrativo foi transferido ao Supabase e continua identificado como demonstração. WhatsApp permanece opcional e oculto sem número. O painel não inventa contatos nem métricas.

## Banco e verificações

Migrações em `supabase/migrations`. Banco de destino: Imobiliaria-geraldo, `habiqagnbbwpefwjmyyp`. Schema exposto `geraldo`; schema privado `geraldo_private`.

```sh
npm run typecheck
npm run test:database
npm run build
```

`scripts/test-cloud.mjs` é uma validação manual autorizada do ambiente configurado: lê arquivos locais ignorados, cria registros temporários e os remove ao final. Não é executado automaticamente no CI nem deve apontar para outro projeto por engano. `scripts/smoke.mjs` é exclusivo do modo SQLite local.

Veja `ARCHITECTURE.md` para fluxos e limites, `VALIDATION.md` para evidências e `ROADMAP.md` para as etapas restantes. Recuperação de senha por e-mail ainda depende de configuração e validação do provedor; a troca autenticada funciona pelo painel.
