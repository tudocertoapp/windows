# Tudo Certo - Agenda e Finanças

**Um único repositório GitHub (`tudocertoapp/windows`)** para as três superfícies:

| Superfície | Como |
|------------|------|
| **Web** | Mesmo código: `npm run web` / `npm run web:build`. Na **Vercel**, liga o projeto a **este repositório** (raiz; usa `vercel.json` e pasta `dist` no build). |
| **Mobile (iOS/Android)** | **Expo** + **EAS** (`eas.json`): `npx expo start`, `eas build` — repositório Git = este. |
| **Desktop (Windows .exe)** | **Electron** (`electron/` + `electron-builder`). O CI em `.github/workflows/build.yml` gera o instalador e publica a release com tag **`latest`** neste repo (feed do `electron-updater`). |

### Backup em App-Nativo-1.0

O repositório **`tudocertoapp/App-Nativo-1.0`** é **espelho** do `main` (código idêntico; não é o canónico para Vercel/EAS se usares só `windows`).

1. No GitHub **`tudocertoapp/windows`** → **Settings → Secrets and variables → Actions**, cria **`APP_NATIVO_MIRROR_TOKEN`**: um PAT com permissão de **push** em `tudocertoapp/App-Nativo-1.0`.
2. O workflow **Espelho backup — App-Nativo-1.0** (`.github/workflows/mirror-app-nativo.yml`) corre em cada push a `main` **apenas** no repo `windows` e faz `git push` para `App-Nativo-1.0/main`.
3. Em clone local podes manter os dois remotos, por exemplo: `origin` → `windows`, `backup` → `App-Nativo-1.0`.

## Estrutura do projeto

```
src/
  constants/     # Cores de categorias, etc.
  contexts/      # ThemeContext, FinanceContext, MenuContext
  components/    # UI compartilhada
  screens/       # Dashboard, Agenda, Dinheiro, etc.
  navigation/    # AppNavigator
  utils/
electron/        # Shell desktop (Electron)
api/             # Funções serverless (ex.: Stripe) para Vercel
.github/workflows/  # CI web + desktop; espelho opcional para App-Nativo-1.0
vercel.json      # Build e rewrites para deploy web na Vercel
eas.json         # Perfis EAS para builds de loja / preview
```

## Rodar o app (mobile / web)

```bash
npm install
npx expo start
```

Use o **Expo Go** no celular (mesma rede Wi‑Fi) e escaneie o QR code. Para web: `npm run web`.

## Build desktop (Windows)

Localmente, após exportar o bundle web:

```bash
npm run electron:pack:win
```

O instalador sai em `release/`. No CI (branch `main` ou execução manual), o workflow usa `build:win` e cria/atualiza a release **`latest`** com `.exe`, `latest.yml` e `.blockmap`.

## Gráficos

Na tela **Gráficos** você encontra resumo do mês, receitas vs despesas, evolução do saldo, pizza por categoria e barras por categoria.

## Windows: erro "node:sea"

Em algumas versões do Node/Expo no Windows pode aparecer erro ao criar a pasta `.expo/metro/externals/node:sea`. O `postinstall` chama `patch-package`; patches em `patches/` são aplicados após `npm install`.

## Download na landing (snippet)

O arquivo `frontend-download-snippet.js` na raiz pode ser usado no site hospedado na Vercel para oferecer o instalador correto por sistema operacional (releases do GitHub).
