# Tudo Certo — aplicação de secretária (Electron)

Empacota o **export web** do Expo (`dist/`) numa janela de secretária no Windows (e opcionalmente macOS/Linux).

## Pré-requisitos

- Node.js 20+
- Windows: para gerar o instalador `.exe`, execute os comandos **no Windows** (ou CI Windows).

## Ícone 256×256

O Windows usa `electron/icon-256.png` (256×256) para a janela e para o `electron-builder`.

```bash
npm run electron:icon
```

Isto redimensiona `assets/icon.png` (ou `adaptive-icon.png` / `logo.png`) com `sharp`. Se não houver fonte, coloque manualmente um PNG 256×256 em `electron/icon-256.png`.

## Desenvolvimento

1. Terminal A: `npm run web` (Metro + web em http://127.0.0.1:8081).
2. Terminal B:

```bash
set ELECTRON_DEV=1
npx electron electron/main.js
```

No PowerShell: `$env:ELECTRON_DEV=1; npx electron electron/main.js`

Ou num só comando (com dependências instaladas):

```bash
npm run electron:dev:all
```

## Build de produção (Windows)

1. Gera ícone e export estático:

```bash
npm run electron:icon
npm run web:build
```

2. Empacota instalador NSIS:

```bash
npm run electron:pack:win
```

O resultado fica em `release/` (por exemplo `Tudo Certo Setup x.x.x.exe`). A pasta `release/` está no `.gitignore`.

### Notas

- **Supabase / OAuth:** em `dist`, as URLs são relativas; login Google e redirects devem incluir `http://localhost` em desenvolvimento e o domínio real em produção (Supabase → Authentication → URL Configuration).
- O **package.json** principal do projeto continua a apontar para o Expo (`AppEntry.js`). O Electron é arrancado com `electron electron/main.js`; o `electron-builder` injeta `main: electron/main.js` só no pacote gerado.
- Se o antivirus bloquear o `.exe` não assinado, é esperado em builds locais; assinatura de código é um passo à parte (certificado EV, etc.).
