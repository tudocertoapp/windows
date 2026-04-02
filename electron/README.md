# Tudo Certo — aplicação de secretária (Electron)

Empacota o **export web** do Expo (`dist/`) numa janela de secretária no Windows (e opcionalmente macOS/Linux).

## Pré-requisitos

- Node.js 20+
- Windows: para gerar o instalador `.exe`, execute os comandos **no Windows** (ou CI Windows).

## Ícones (janela + instalador Windows)

- **`electron/icon-256.png`** — ícone da janela (`BrowserWindow`).
- **`electron/icon.ico`** — **obrigatório** para o `.exe` e para o instalador NSIS. Se faltar ou estiver corrompido, o Windows mostra o ícone genérico do Electron.

```bash
npm run electron:icon
```

O script gera **sempre** os dois ficheiros (multi-resolução no `.ico`). Usa, por ordem: `assets/icon.png`, `adaptive-icon.png`, `logo.png`, `favicon.png`, `logo-pages.png`, `splash.png`. Sem nenhum deles, cria um placeholder verde (substitua por `assets/icon.png` para a marca real).

`npm run electron:pack:win` já corre `electron:icon` antes do build.

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
