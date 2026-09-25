# Família — agenda, financeiro e tarefas com Telegram

App familiar (React + Vite + Supabase). Qualquer pessoa da família manda uma mensagem ao bot do Telegram ("comprei pão por R$8", "reunião amanhã às 10h", "levar o carro na revisão") e a IA registra no lugar certo.

## Como é organizado

- `src/` — telas (React, Tailwind, React Router). Fala direto com o Supabase (login + banco), protegido por RLS.
- `supabase/migrations/` — tabelas, segurança por linha e funções (Postgres).
- `supabase/functions/telegram-webhook/` — Edge Function que recebe o Telegram, classifica com a OpenAI e grava.

## Configuração

1. **Banco:** rode `supabase/migrations/20260925000000_init.sql` no SQL Editor do Supabase (ou `supabase db push`).
2. **Família:** no SQL Editor, crie a família (o código de convite é a "senha" do cadastro):
   ```sql
   insert into public.families (name, invite_code) values ('Nome da Família', 'codigo-secreto');
   ```
3. **Auth:** em Authentication > Providers > Email, desative "Confirm email" se não quiser exigir confirmação por e-mail.
4. **Front-end:** copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings > API). Depois `npm install` e `npm run dev`.
5. **Segredos do robô** (Edge Functions > Secrets): `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (opcional: `OPENAI_MODEL`).
6. **Publicar a função:** `supabase functions deploy telegram-webhook --project-ref SEU-PROJETO` (o `config.toml` já desliga a exigência de JWT, que o Telegram não envia).
7. **Webhook do Telegram:** `node scripts/set-telegram-webhook.mjs https://SEU-PROJETO.supabase.co` (com `TELEGRAM_BOT_TOKEN` e `TELEGRAM_WEBHOOK_SECRET` no ambiente).

## Vincular cada pessoa ao bot

Em **Configurações** no app, "Gerar código"; no Telegram, mande ao bot `/vincular CODIGO` (válido por 15 minutos).

## Segurança

Nunca coloque no repositório: `.env.local`, tokens do Telegram, chave da OpenAI, `service_role`. A chave `anon` é pública por design; quem protege os dados é o RLS das tabelas.
