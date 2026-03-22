# Relatório de Refatoração – Tudo Certo Web + Mobile

## Objetivo

Adicionar suporte web (Expo Web) com deploy na Vercel, mantendo compatibilidade total com Android (.aab) e iOS (.ipa).

---

## Scripts Configurados

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia o dev server (todas as plataformas) |
| `npm run web` | Inicia o dev server web (`expo start --web`) |
| `npm run web:build` | Gera build web para produção (`expo export --platform web`) |
| `npm run android` | Build Android |
| `npm run ios` | Build iOS |

---

## Estrutura Criada

### Pastas

- **`src/shared/`** – Índice para código compartilhado (screens, components, contexts, utils em `src/` são compartilhados)
- **`src/mobile/`** – Placeholder para futuros módulos mobile-only
- **`src/web/`** – Placeholder para futuros módulos web-only

### Fallbacks web (extensão `.web.js` / `.web.tsx`)

O Metro resolve automaticamente por plataforma. Na web, são usados:

| Arquivo | Descrição |
|---------|-----------|
| `src/utils/biometricAuth.web.js` | Biometria não disponível na web; retorna `true` (sem bloqueio) |
| `src/utils/sounds.web.js` | Haptics não disponíveis; funções no-op |
| `src/utils/reminders.web.js` | Notificações push; funções no-op |
| `src/utils/contacts.web.js` | Contatos; retorna `hasContacts: false` e listas vazias |
| `src/utils/readImageAsBase64.web.js` | Converte URI (blob/data) para base64 via Fetch/FileReader |
| `src/utils/profilePhotoCache.web.js` | Cache de foto via AsyncStorage (sem FileSystem) |
| `src/utils/voiceStub.web.js` | Stub para Voice/speech (evita erro de bundle) |
| `src/contexts/ReminderContext.web.js` | Provider sem lógica de notificações |
| `src/components/VoiceListener.web.js` | Componente vazio (reconhecimento indisponível) |
| `src/components/VoiceInput.web.tsx` | Mensagem “disponível no app mobile” |
| `src/components/VoiceRecorder.web.tsx` | Mensagem “disponível no app mobile” |
| `src/services/googleVisionOCR.web.js` | OCR com conversão de imagem via Fetch/FileReader |
| `src/lib/supabase.web.js` | Cliente Supabase com `detectSessionInUrl: true` para OAuth web |

---

## Arquivos Modificados (não movidos)

| Arquivo | Alteração |
|---------|-----------|
| `package.json` | Script `web:build` adicionado |
| `app.config.js` | Configuração web mantida |
| `metro.config.js` | Resolver para stubs web de `@react-native-voice` e `expo-speech-recognition` |
| `vercel.json` | Configuração de build e rewrites SPA |
| `App.js` | Wrapper responsivo para web (maxWidth 520px, centralizado) |
| `src/components/ClienteModal.js` | Uso de `readImageAsBase64` em vez de FileSystem; suporte a `blob:` |
| `src/components/PessoaModal.js` | Uso de `readImageAsBase64` e `contacts` utils; botão Contatos oculto na web |

---

## Arquivos Criados

### Utilitários e fallbacks

- `src/utils/readImageAsBase64.js` (native)
- `src/utils/readImageAsBase64.web.js`
- `src/utils/contacts.js` (native)
- `src/utils/contacts.web.js`
- `src/utils/voiceStub.web.js`
- Demais arquivos `.web.js` e `.web.tsx` listados acima

### Estrutura multiplataforma

- `src/shared/index.js`
- `src/mobile/index.js`
- `src/web/index.js`

### Deploy

- `vercel.json`

---

## Deploy na Vercel

1. Conectar o repositório à Vercel.
2. Configuração padrão (via `vercel.json`):
   - **Build Command:** `npm install && npm run web:build`
   - **Output Directory:** `dist`
   - **Rewrites:** SPA (todas as rotas → `index.html`)

---

## Bibliotecas Incompatíveis com Web (e tratamento)

| Biblioteca | Tratamento |
|------------|------------|
| `expo-local-authentication` | `biometricAuth.web.js` retorna `true` (sem verificação) |
| `expo-speech-recognition` | Stub em `metro.config.js` + `VoiceListener.web.js` |
| `@react-native-voice/voice` | Stub em `metro.config.js` + `VoiceInput.web.tsx`, `VoiceRecorder.web.tsx` |
| `expo-notifications` | `reminders.web.js` e `ReminderContext.web.js` (no-op) |
| `expo-contacts` | `contacts.web.js` (listas vazias, botão oculto) |
| `expo-file-system` | `readImageAsBase64.web.js` e `googleVisionOCR.web.js` |
| `expo-haptics` | `sounds.web.js` (no-op) |
| `expo-media-library` | `MotivationalImageScreen` usa `Platform.OS` para Share (sem MediaLibrary na web) |

---

## Riscos e Limitações

1. **Receipt Scanner (OCR):** Na web depende de `expo-image-picker` e Google Vision; fluxo pode variar em relação ao mobile.
2. **Impressão/PDF:** `expo-print` e `expo-sharing` podem ter comportamento diferente na web.
3. **Câmera:** `launchCameraAsync` não disponível na web; fluxo precisa ser só galeria ou upload.
4. **expo-navigation-bar:** Usado apenas em Android; sem impacto na web.
5. **BlurView:** `expo-blur` pode ter fallback visual na web.

---

## Comandos de Validação

```bash
npx expo start              # Dev server (todas as plataformas)
npx expo start --web        # Dev server web
npx expo export --platform web   # Build web (saída em dist/)
```

---

## Checklist

- [x] `npx expo start` funciona
- [x] `npx expo start --web` funciona
- [x] `npm run web:build` gera saída em `dist/`
- [x] `vercel.json` configurado
- [x] Fallbacks para APIs nativas
- [x] Layout responsivo na web (centralizado, maxWidth 520px)
- [x] Supabase com OAuth web (`detectSessionInUrl`)
- [ ] Builds Android (.aab) e iOS (.ipa) precisam ser testados pelo desenvolvedor
