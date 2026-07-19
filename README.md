# WhatsApp Atendimento

Painel Vue 3 e worker Node.js para registrar contatos e enviar uma mensagem de boas-vindas configurável. O Supabase fornece autenticação e PostgreSQL.

> O worker incluído usa `whatsapp-web.js`, uma integração não oficial que necessita de sessão QR e processo persistente. Para produção crítica, use a Cloud API oficial da Meta (ver `docs/DEPLOY.md`).

## Estrutura

```text
apps/
  dashboard/       # Vue 3 + Vite
  whatsapp-worker/ # Express + whatsapp-web.js
supabase/
  migrations/      # esquema, RLS e Realtime
docs/              # operação, Git e deploy
```

## Início rápido

1. Crie um projeto Supabase e aplique `supabase/migrations/202607180001_initial.sql` no SQL Editor.
2. Configure `apps/whatsapp-worker/.env` a partir de `.env.example` e inicie o worker.
3. Configure `apps/dashboard/.env` e inicie o dashboard.

Os comandos completos e o deploy estão em [docs/DEPLOY.md](docs/DEPLOY.md).
