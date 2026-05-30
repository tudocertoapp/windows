# Configuração do Supabase

## 1. Executar o schema

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc)
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase-schema.sql`
4. Clique em **Run** para criar as tabelas e políticas RLS
5. Para **anotações** e **lista de compras** do usuário, execute também `supabase-notes-shopping.sql`

## 2. Autenticação

### Email/senha
Já configurado no Supabase por padrão.

### Google
1. No [Supabase Dashboard](https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc/auth/providers), vá em **Authentication > Providers**
2. Habilite o **Google**
3. Configure o **Client ID** e **Client Secret** do [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
4. Em **Authentication > URL Configuration**:
   - **Site URL:** use `https://tudocerto-web.vercel.app` para produção (ou `http://localhost:8081` só para dev)
   - **Redirect URLs** – adicione **todos** os URLs que você usa:
     - `https://tudocerto-web.vercel.app` (produção na Vercel – **obrigatório para login web**)
     - `https://tudocerto-web.vercel.app/**`
     - `https://*.vercel.app` (preview deployments)
     - `http://localhost:8081` (Expo web – dev local)
     - `http://localhost:5173` (Vite ou outra porta)
     - `tudocerto://**` (para Development Build Android/iOS)
     - `https://*.exp.direct/**` (para Expo tunnel)
     - `exp://**` (para Expo local)
5. No Google Cloud Console, adicione em **Authorized redirect URIs**:
   - `https://azvfiuvggppnulfepwbc.supabase.co/auth/v1/callback`

**Importante (Expo Go + tunnel):** Se o login com Google não retornar ao app, use um **Development Build**:
```bash
npx expo prebuild
npx expo run:android
```

## 3. Dados sensíveis

O app lê Supabase de `.env` via `src/lib/supabaseConfig.js` (fallback no código se faltar).

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha. **Replique as mesmas variáveis na Vercel** (Settings → Environment Variables).

### App (`.env`)
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — cliente Supabase no app
- `EXPO_PUBLIC_SITE_URL` / `EXPO_PUBLIC_STRIPE_API_URL` — checkout Stripe e OCR

### Servidor (Vercel + `.env` local)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — webhook grava assinaturas
- `STRIPE_SECRET_KEY` — **sk_live_** ou **sk_test_** (não use **rk_** Restricted)
- `STRIPE_WEBHOOK_SECRET` — **whsec_...** do endpoint `/api/stripe/webhook`

**Nunca commite a DATABASE_URL ou a service_role key no app** – use apenas a anon key no cliente.
