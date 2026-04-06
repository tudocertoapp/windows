# Tudo Certo - Agenda e Finanças

Monorepo único: **Expo (web + iOS/Android)** e **Electron (Windows/desktop)**. Este repositório (`tudocertoapp/windows`) concentra o código que antes estava em projetos separados.

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
.github/workflows/  # Build Windows no GitHub Actions
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

O instalador sai em `release/`. No CI, o workflow `.github/workflows/build.yml` usa o script `build:win` (alias de `electron:pack:win`).

## Gráficos

Na tela **Gráficos** você encontra resumo do mês, receitas vs despesas, evolução do saldo, pizza por categoria e barras por categoria.

## Windows: erro "node:sea"

Em algumas versões do Node/Expo no Windows pode aparecer erro ao criar a pasta `.expo/metro/externals/node:sea`. O `postinstall` chama `patch-package`; patches em `patches/` são aplicados após `npm install`.

## Download na landing (snippet)

O arquivo `frontend-download-snippet.js` na raiz pode ser usado no site hospedado na Vercel para oferecer o instalador correto por sistema operacional (releases do GitHub).
