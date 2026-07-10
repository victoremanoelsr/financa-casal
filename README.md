# Finanças a Dois

Sistema web para controle financeiro compartilhado de um casal. O projeto foi desenvolvido com Next.js, TypeScript e Supabase, com layout responsivo para celular e computador.

## O que já está pronto

- Login e cadastro por e-mail e senha.
- Família financeira compartilhada entre duas contas.
- Código de convite para conectar o casal.
- Painel com entradas, despesas, saldo e contas pendentes.
- Cadastro e exclusão de entradas e saídas.
- Controle de contas a pagar, vencimentos e status pago/pendente.
- Cadastro de cartões, limites, fechamento e vencimento.
- Compras parceladas e cálculo da parcela ativa na fatura estimada do mês.
- Orçamento mensal por categoria.
- Metas financeiras e depósitos nas metas.
- Relatórios por categoria e responsável.
- RLS (Row Level Security) no banco para separar os dados de cada família.
- Modo demonstração local para testar a interface sem configurar o Supabase.
- Layout responsivo.

## Estrutura do projeto

```text
financas-a-dois/
├── app/
│   ├── auth/callback/route.ts
│   ├── dashboard/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── finance-app.tsx
│   └── login-screen.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── proxy.ts
│   │   └── server.ts
│   ├── demo-data.ts
│   ├── types.ts
│   └── use-finance.ts
├── supabase/
│   └── schema.sql
├── .env.example
├── proxy.ts
├── package.json
└── README.md
```

# 1. Testar no computador sem banco

O projeto funciona em modo demonstração quando as variáveis do Supabase não existem.

```bash
npm install
npm run dev
```

Depois, abra:

```text
http://localhost:3000
```

Na tela inicial, qualquer e-mail e senha válidos no formulário levam ao painel demonstrativo, pois o login real só é ativado quando o Supabase está configurado.

# 2. Criar o banco no Supabase

1. Crie um projeto no Supabase.
2. Abra o `SQL Editor`.
3. Abra o arquivo `supabase/schema.sql` deste projeto.
4. Copie todo o conteúdo do arquivo.
5. Cole no SQL Editor e execute.

O SQL cria:

- famílias financeiras;
- perfis;
- membros da família;
- movimentações;
- contas;
- cartões;
- compras no cartão;
- orçamentos;
- metas;
- gatilho de criação automática da família;
- função para entrar na família por código;
- políticas de segurança RLS;
- índices para consultas frequentes.

# 3. Configurar as variáveis de ambiente

Na raiz do projeto, crie um arquivo `.env.local` baseado em `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_AQUI
```

Você encontra esses dados nas configurações de API do projeto Supabase.

Depois reinicie o servidor:

```bash
npm run dev
```

# 4. Configurar autenticação do Supabase

No painel do Supabase, configure as URLs de autenticação para o domínio do projeto.

Durante desenvolvimento:

```text
http://localhost:3000/auth/callback
```

Depois da publicação, adicione também:

```text
https://SEU-DOMINIO.vercel.app/auth/callback
```

# 5. Enviar para o GitHub

Crie um repositório vazio no GitHub e, dentro da pasta do projeto, execute:

```bash
git init
git add .
git commit -m "Sistema Finanças a Dois"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

O arquivo `.gitignore` já impede o envio de `node_modules`, `.next` e chaves locais.

# 6. Publicar na Vercel

1. Entre na Vercel.
2. Escolha `Add New Project`.
3. Importe o repositório do GitHub.
4. Em `Environment Variables`, adicione:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

5. Clique em `Deploy`.

Depois da primeira publicação, copie o endereço final da Vercel e adicione a URL de callback no Supabase, conforme a etapa 4.

# Como conectar as duas pessoas do casal

1. A primeira pessoa cria a conta.
2. O sistema cria automaticamente uma família financeira e um código de convite.
3. A segunda pessoa cria a própria conta.
4. No menu `Configurações`, ela digita o código da primeira família.
5. A conta dela passa a visualizar e editar os mesmos dados financeiros do casal.

# Segurança

O projeto usa políticas de Row Level Security no Supabase. Cada tabela financeira verifica se o usuário autenticado pertence à família associada ao registro antes de permitir leitura, criação, alteração ou exclusão.

Mesmo assim, antes de usar o sistema para dados financeiros reais, mantenha as dependências atualizadas, use senhas fortes e revise as configurações de autenticação do seu projeto Supabase.

# Comandos úteis

```bash
npm run dev
npm run lint
npm run build
npm start
```

O projeto desta entrega foi validado com `npm run lint` e `npm run build`.
