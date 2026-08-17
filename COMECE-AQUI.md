# Agenda do Laboratório — CETI Landri Sales

Guia simples para colocar o site em um servidor **grátis**.
Tempo: ~20 minutos. Não precisa saber programar, só seguir a ordem.

---

## O que você vai criar (tudo grátis)

1. Uma conta no **Supabase** → é o banco de dados (guarda os agendamentos).
2. Uma conta na **Cloudflare** → é o servidor (deixa o site no ar).

---

## PASSO 1 — Instalar o Node.js (só uma vez, no seu computador)

Baixe e instale: https://nodejs.org (versão "LTS", botão da esquerda).

Depois abra o **Prompt de Comando** (Windows) ou **Terminal** (Mac) e digite:

```
node -v
```

Se aparecer um número (ex.: `v22.x.x`), está tudo certo.

---

## PASSO 2 — Criar o banco de dados (Supabase)

1. Entre em https://supabase.com e clique em **Start your project** (login com Google ou GitHub).
2. Clique em **New project**.
   - Name: `agenda-laboratorio`
   - Database Password: crie uma senha e **guarde num papel**
   - Region: `South America (São Paulo)`
   - Clique em **Create new project** e espere ~2 minutos.
3. No menu da esquerda clique em **SQL Editor** → **New query**.
4. Abra o arquivo `supabase/migrations/` (o arquivo `.sql` que está na pasta do projeto),
   copie TODO o conteúdo, cole na tela do Supabase e clique em **Run**.
   Deve aparecer "Success".
5. Agora clique na engrenagem **Project Settings** → **API Keys** / **Data API**.
   Anote estes 3 valores:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **publishable / anon key** → começa com `sb_publishable_...`
   - **service_role / secret key** → começa com `sb_secret_...` (⚠️ NUNCA mostre para ninguém)

---

## PASSO 3 — Preparar o projeto no seu computador

1. Descompacte o arquivo `.zip` numa pasta, ex.: `C:\agenda`.
2. Abra o Prompt de Comando e entre na pasta:

```
cd C:\agenda
npm install
```

3. Na pasta tem um arquivo chamado `.env.example`.
   Faça uma **cópia** dele e renomeie a cópia para `.env`.
   Abra o `.env` no Bloco de Notas e preencha:

```
SUPABASE_URL="https://abcdefgh.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

VITE_SUPABASE_URL="https://abcdefgh.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_PROJECT_ID="abcdefgh"

SITE_PASSWORD="CetiLab2026"
ADMIN_PASSWORD="Landri26@"
SESSION_SECRET="troque-isto-por-uma-frase-bem-longa-e-aleatoria-1234567890abcdef"
```

> `SITE_PASSWORD` = senha que a escola digita para entrar.
> `ADMIN_PASSWORD` = senha para **excluir** agendamento (só a secretaria).
> `SESSION_SECRET` = invente uma frase bem longa e sem sentido.

4. Teste no seu computador:

```
npm run dev
```

Abra http://localhost:8080 no navegador. Se o site abrir e funcionar, pode publicar.
Para parar, aperte `Ctrl + C`.

---

## PASSO 4 — Publicar de graça na Cloudflare

1. Crie a conta grátis em https://dash.cloudflare.com/sign-up
2. No Prompt de Comando, dentro da pasta do projeto:

```
npm run build
npx wrangler deploy
```

Na primeira vez ele abre o navegador pedindo para autorizar — clique em **Allow**.

3. No fim aparece o endereço do site, algo como:
   `https://agenda-laboratorio.SEU-USUARIO.workers.dev`

4. **Agora cadastre as senhas no servidor** (elas não vão junto com o `.env`):

```
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SITE_PASSWORD
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
```

A cada comando ele pergunta o valor — cole o valor e aperte Enter.

5. Rode `npx wrangler deploy` mais uma vez. Pronto, site no ar. 🎉

---

## Alternativa: Vercel (se preferir clicar em vez de digitar)

1. Suba a pasta do projeto para o GitHub (https://github.com/new → "uploading an existing file").
2. Entre em https://vercel.com com o GitHub → **Add New → Project** → escolha o repositório.
3. Em **Environment Variables**, adicione uma a uma todas as linhas do seu `.env`
   e mais esta: `NITRO_PRESET` = `vercel`.
4. Clique em **Deploy**.

---

## Para atualizar o site depois

Mudou algo no código? Só rodar de novo:

```
npm run build
npx wrangler deploy
```

---

## Dúvidas comuns

**O site pode ficar no ar para sempre?**
Sim. Cloudflare e Supabase têm planos grátis suficientes para uma escola.
O Supabase gratuito pausa o banco depois de ~7 dias **sem nenhum acesso** —
como a escola usa toda semana, isso não acontece.

**Como troco a senha da escola?**
`npx wrangler secret put SITE_PASSWORD` e digite a nova. Depois `npx wrangler deploy`.

**Perdi os agendamentos?**
Não. Eles ficam no Supabase, não no computador.

---

Desenvolvido por: **Sebastião Martins — 3ºA TDS**
