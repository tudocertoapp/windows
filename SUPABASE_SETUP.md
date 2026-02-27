# Configuração do Supabase

## 1. Executar o schema

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc)
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase-schema.sql`
4. Clique em **Run** para criar as tabelas e políticas RLS

## 2. Autenticação

### Email/senha
Já configurado no Supabase por padrão.

### Google
1. No [Supabase Dashboard](https://supabase.com/dashboard/project/azvfiuvggppnulfepwbc/auth/providers), vá em **Authentication > Providers**
2. Habilite o **Google**
3. Configure o **Client ID** e **Client Secret** do [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
4. Em **Authentication > URL Configuration**, adicione os redirect URLs:
   - `tudocerto://**` (para Development Build)
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

As credenciais (URL e anon key) estão em `src/lib/supabase.js`.

Para produção, use variáveis de ambiente:
- Crie um arquivo `.env` com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Atualize `src/lib/supabase.js` para ler de `process.env.EXPO_PUBLIC_*` ou `Constants.expoConfig?.extra`

**Nunca commite a DATABASE_URL ou a service_role key no app** – use apenas a anon key no cliente.
