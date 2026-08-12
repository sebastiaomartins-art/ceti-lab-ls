# Como publicar este site em outro servidor

Este projeto foi feito por **Sebastião Martins — 3ºA TDS** para o **CETI Landri Sales**.
É um app **TanStack Start** (React + TypeScript) que usa **Supabase** como banco de dados.
O design (tema branco e verde) e as funções (agenda, relatórios, impressão, senha) **não mudam**
— este guia só explica como colocar o mesmo site no ar em outro lugar.

---

## Resumo do que você precisa

1. **Um projeto no Supabase** (banco de dados — grátis em supabase.com)
2. **Este código-fonte** rodando em um servidor
3. **As senhas/variáveis** configuradas no ambiente

> ⚠️ Importante: o site **não funciona sem o banco de dados**. Toda a agenda fica
> guardada no Supabase, então você precisa criar o seu próprio projeto lá.

---

## Passo 1 — Criar o banco de dados (Supabase)

1. Acesse **https://supabase.com** e crie uma conta (pode ser com GitHub/Google).
2. Crie um **novo projeto** (plano Free é suficiente). Anote a senha do banco.
3. No menu lateral, vá em **SQL Editor**.
4. Abra o arquivo `supabase/migrations/20260809023234_3b8d23c4-bfda-4814-8dfc-8ec43f448881.sql`
   que está dentro deste pacote, copie todo o conteúdo e **cole no SQL Editor** e clique em **Run**.
   Isso cria a tabela `agendamentos`.
5. Vá em **Settings → API** e copie:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **Project ID** (o ref, algo como `xxxx`)
   - **anon/publishable key** (começa com `sb_publishable_`)
   - **service_role key** (começa com `sb_secret_`) — ⚠️ mantenha em segredo!

> O plano gratuito do Supabase entra em pausa após ~7 dias sem acesso.
> Como a escola usa todo dia, isso não acontece.

---

## Passo 2 — Configurar as variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha com os seus dados do passo anterior:

```bash
cp .env.example .env
```

Depois edite o `.env` colocando:
- `SUPABASE_URL` → a URL do seu projeto
- `SUPABASE_PUBLISHABLE_KEY` → a chave anon/publishable
- `SUPABASE_SERVICE_ROLE_KEY` → a chave service_role (secreta)
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` → os mesmos valores públicos
- `VITE_SUPABASE_PROJECT_ID` → o Project ID
- `SITE_PASSWORD` → a senha de entrada do site (ex.: `CetiLab2026`)
- `ADMIN_PASSWORD` → a senha para excluir (ex.: `Landri26@`)
- `SESSION_SECRET` → gere uma string aleatória longa com `openssl rand -hex 32`

> 💡 No servidor de produção (Vercel, Cloudflare, etc.) você não usa o arquivo `.env`
> — você cadastra essas mesmas variáveis no painel da plataforma.

---

## Passo 3 — Instalar e rodar localmente (teste)

Você precisa ter o **Node.js 20+** instalado (https://nodejs.org).
Recomenda-se usar o **Bun** (mais rápido) — https://bun.sh.

```bash
# instalar dependências
npm install        # ou: bun install

# rodar em modo desenvolvimento
npm run dev        # ou: bun run dev
```

Abra **http://localhost:3000** — vai pedir a senha do site.

---

## Passo 4 — Publicar na internet (escolha UMA opção)

### Opção A — Cloudflare Pages (recomendado, grátis)

O projeto já vem configurado para o Cloudflare (preset do nitro).

1. Crie conta em **https://dash.cloudflare.com** (sign up em Workers & Pages).
2. Instale o Wrangler CLI: `npm install -g wrangler`
3. Faça login: `wrangler login`
4. Cadastre as variáveis de ambiente como **secrets**:
   ```bash
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_PUBLISHABLE_KEY
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put SITE_PASSWORD
   wrangler secret put ADMIN_PASSWORD
   wrangler secret put SESSION_SECRET
   ```
   (ele vai pedir o valor de cada uma — cole do seu `.env`)
5. Faça o build e deploy:
   ```bash
   npm run build
   npx wrangler deploy
   ```
   (no Cloudflare, as variáveis `VITE_*` precisam estar no momento do build.
   Coloque-as em um arquivo `.dev.vars` ou exporte-as no terminal antes de `npm run build`.)

### Opção B — Vercel

1. Crie conta em **https://vercel.com** e instale a CLI: `npm i -g vercel`
2. No painel da Vercel, crie um projeto e importe o repositório (ou use `vercel` no terminal).
3. Em **Settings → Environment Variables**, cadastre TODAS as variáveis do `.env`
   (incluindo as `VITE_*`).
4. Defina o preset de build. Crie um arquivo `vercel.json` na raiz com:
   ```json
   { "buildCommand": "npm run build", "framework": null }
   ```
   e defina a variável de ambiente `NITRO_PRESET=vercel` antes de buildar.
5. Deploy: `vercel --prod`

### Opção C — Qualquer servidor Node.js

```bash
# defina NITRO_PRESET=node-server no ambiente
export NITRO_PRESET=node-server
npm run build
node .output/server/index.mjs
```
Cadastre todas as variáveis do `.env` no ambiente do servidor.

---

## Estrutura do projeto (resumo)

```
src/
├── routes/
│   ├── __root.tsx       # layout + fontes + SEO
│   ├── index.tsx        # página da agenda (agenda + relatórios + impressão)
│   └── entrar.tsx       # tela de senha de entrada
├── lib/
│   ├── agenda.ts        # horários fixos (seg-sex) e lógica da semana
│   └── agenda.functions.ts  # servidor: entrar, ver, agendar, excluir (com senha)
├── integrations/supabase/  # cliente do banco de dados (gerado, não editar)
└── styles.css           # tema branco e verde + estilos de impressão
supabase/migrations/      # SQL para criar a tabela no banco
```

## Senhas do projeto

| Senha          | Para quê                          | Valor padrão   |
|----------------|-----------------------------------|----------------|
| SITE_PASSWORD  | Entrar no site (toda a escola)    | `CetiLab2026`  |
| ADMIN_PASSWORD | Excluir agendamentos (secretaria) | `Landri26@`    |

Troque esses valores no `.env` sempre que quiser mudar as senhas.

---

Desenvolvido por: **Sebastião Martins — 3ºA TDS** — CETI Landri Sales
