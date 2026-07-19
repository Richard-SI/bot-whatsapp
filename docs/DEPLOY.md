# Operação e deploy

## 1. Pré-requisitos

- Node.js 20+, Git e uma conta Supabase.
- GitHub CLI (`gh`) autenticado por `gh auth login`.
- Um projeto criado em [Supabase](https://database.new).

O frontend é uma aplicação estática; o Supabase hospeda banco, Auth, Realtime e Functions, mas não é um host estático de SPA. Portanto, publique o painel em Vercel, Netlify, Cloudflare Pages ou GitHub Pages e mantenha o Supabase como BaaS. O worker não pode ser uma Edge Function: `whatsapp-web.js` usa Chromium, QR e armazenamento de sessão persistente. Use Railway/Render/Fly.io ou troque a implementação pela Cloud API oficial da Meta.

## 2. Banco e autenticação

No painel do Supabase, crie o projeto e, em **Authentication > Providers**, mantenha Email habilitado. Em **Authentication > URL Configuration**, adicione as URLs do painel (por exemplo `http://localhost:5173` e a URL de produção).

Instale a CLI e faça login:

```bash
npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Alternativamente, abra `supabase/migrations/202607180001_initial.sql` no SQL Editor e execute-o. Crie o primeiro usuário em **Authentication > Users > Add user** e promova-o no SQL Editor:

```sql
update public.profiles set is_admin = true where id = 'UUID_DO_USUARIO';
```

As credenciais do navegador são a URL e a **anon/publishable key**; a `service_role` é somente do worker. Nunca a use em `VITE_*` nem faça commit de `.env`.

## 3. Desenvolvimento local

```bash
cp apps/whatsapp-worker/.env.example apps/whatsapp-worker/.env
cp apps/dashboard/.env.example apps/dashboard/.env
# Edite os dois arquivos com URL/chaves reais do projeto Supabase.
npm install
npm run dev:worker
```

Em outro terminal:

```bash
npm run dev:dashboard
```

Abra `http://localhost:5173`, entre com o usuário administrador e, em **Mensagem**, clique em “Ver status / QR”. Também é possível escanear o QR impresso no terminal do worker. No WhatsApp do celular: Dispositivos conectados > Conectar um dispositivo.

## 4. Deploy do banco

Depois de cada migration nova:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

O `config.toml` e migrations devem ficar versionados. A CLI do Supabase faz deploy de migrations e Edge Functions, não do bundle Vue estático.

## 5. Deploy do dashboard (Vercel, exemplo)

No diretório raiz, instale/autentique a CLI e crie o projeto. Na primeira execução, escolha o diretório `apps/dashboard`.

```bash
npm run build
npx vercel login
npx vercel --cwd apps/dashboard
npx vercel --prod --cwd apps/dashboard
```

No painel da Vercel, em **Settings > Environment Variables**, cadastre para Production/Preview:

```text
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_ou_publishable_key
VITE_API_URL=https://URL_PUBLICA_DO_WORKER
```

Faça novo deploy após inserir as variáveis, pois Vite as incorpora no build. Também acrescente a URL Vercel em **Authentication > URL Configuration** no Supabase.

## 6. Deploy do worker (Railway, exemplo)

1. Crie um projeto Railway e escolha **Deploy from GitHub Repo**.
2. Em configurações do serviço, defina **Root Directory** como `apps/whatsapp-worker`; o `railway.toml` usará o Dockerfile.
3. Adicione as variáveis abaixo. `CORS_ORIGIN` deve ser exatamente a URL do dashboard, sem barra ao final.
4. Crie e monte um Volume em `/app/.wwebjs_auth`. Sem ele, um redeploy exigirá novo QR.
5. Gere um domínio público Railway e coloque-o em `VITE_API_URL`. Faça redeploy do dashboard.

```text
SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
CORS_ORIGIN=https://seu-dashboard.vercel.app
WHATSAPP_AUTH_PATH=/app/.wwebjs_auth
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
PORT=3000
```

Após o primeiro deploy, entre no dashboard e carregue o QR. O endpoint `/health` deve indicar `ready` depois da leitura. Proteja o dashboard com usuários administradores; os endpoints do worker validam a sessão Supabase e a flag `profiles.is_admin`.

## 7. Produção recomendada: Cloud API da Meta

`whatsapp-web.js` automatiza o WhatsApp Web e pode sofrer desconexões ou incompatibilidades. Para uso comercial, troque o módulo `src/whatsapp.js` por webhook + envio HTTP da [Cloud API oficial da Meta](https://developers.facebook.com/docs/whatsapp/cloud-api): o webhook recebe as mensagens, chama as mesmas funções em `src/supabase.js` e responde pela API. Nesse desenho, o webhook pode rodar como serviço Node ou Edge Function, sem QR e sem volume.

## GitHub: inicialização e primeiro push

Execute na raiz do projeto. O comando cria um repositório GitHub privado; troque `--private` por `--public` se desejado.

```bash
git init -b main
git add .gitignore README.md package.json apps supabase docs
git commit -m "feat: atendimento automático via WhatsApp"
gh auth login
gh repo create whatsapp-atendimento --private --source=. --remote=origin --push
```

Se o repositório remoto já existir, em vez do último comando:

```bash
git remote add origin https://github.com/SEU_USUARIO/whatsapp-atendimento.git
git push -u origin main
```
