# Finança Familiar

Sistema financeiro familiar Web/PWA construído com Next.js, TypeScript e Supabase.

## Estado atual

- Interface completa e responsiva em modo de demonstração.
- Login, cadastro em quatro etapas e recuperação segura de acesso.
- Dashboard, Financeiro, Contas, Cartões, Comércios, Assinaturas, Despesas Fixas, Metas, Relatórios e Configurações.
- Formulários interativos para validar os fluxos antes da conexão com dados reais.
- PWA com manifest, ícone, service worker e página offline segura.
- Migration inicial do Supabase com arquitetura multifamília e RLS.
- APIs de cadastro/login preparadas para username + senha.
- Testes unitários de CPF, normalização, parcelas e vencimentos.
- Teste SQL obrigatório de isolamento entre duas famílias.

Os dados visíveis na interface são fictícios e removíveis. A gravação permanente será ativada depois que o projeto Supabase for conectado.

## Requisitos

- Node.js 22 ou superior.
- pnpm 11 ou superior.
- Projeto Supabase para persistência real.

## Desenvolvimento local

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000`.

## Verificações

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Os testes SQL de RLS ficam em `supabase/tests`. Eles deverão ser executados com Supabase local/Docker ou contra um projeto de desenvolvimento descartável, nunca diretamente no banco de produção.

## Configuração do Supabase

1. Copie `.env.example` para `.env.local`.
2. Preencha a URL e publishable key do projeto.
3. Preencha `SUPABASE_SECRET_KEY` somente no backend.
4. Gere `PII_HASH_KEY` com pelo menos 32 caracteres aleatórios.
5. Aplique as migrations em um projeto de desenvolvimento.
6. Execute os testes de isolamento e os advisors do Supabase.
7. Somente depois configure as mesmas variáveis na Vercel.

O CPF em texto puro não é persistido. O backend mantém apenas HMAC para identificação e os quatro últimos dígitos para referência.

## Recuperação de acesso

O fluxo visual é:

1. Nome completo e CPF.
2. Confirmação por código enviado ao contato cadastrado.
3. Escolha entre mudar username ou senha.
4. Substituição do dado antigo.
5. Retorno ao login após dois segundos.

O envio real do código depende da escolha/configuração de um provedor de e-mail ou WhatsApp. Nome e CPF sozinhos nunca autorizam a alteração.

## Deploy na Vercel

O projeto já gera build de produção. Depois de criar/conectar o projeto Vercel:

1. Cadastre as variáveis do `.env.example`.
2. Defina `NEXT_PUBLIC_SITE_URL` com o domínio de produção.
3. Cadastre a mesma URL nas configurações de Auth do Supabase.
4. Faça o deploy de preview.
5. Teste login, cookies, RLS e instalação da PWA antes de promover para produção.

## Segurança

- Chaves secretas nunca usam o prefixo `NEXT_PUBLIC_`.
- Rotas autenticadas usam sessão Supabase em cookies.
- O username é globalmente único e resolvido apenas no backend.
- Tabelas financeiras possuem `family_id` e policies por associação ativa.
- Views usam `security_invoker`.
- Não há policies de `DELETE`; registros históricos devem ser arquivados ou cancelados.
- Migrations futuras devem ser incrementais e não destrutivas.
