/**
 * Processo principal Electron (Windows/macOS/Linux).
 * Produção: carrega export estático Expo em dist/index.html.
 * Desenvolvimento: ELECTRON_DEV=1 + app web em http://127.0.0.1:8081 (npm run web).
 */
const { app, BrowserWindow, shell, session, systemPreferences, Menu, nativeImage, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const fs = require('fs');

const isDev = process.env.ELECTRON_DEV === '1' || process.env.ELECTRON_DEV === 'true';
let mainWindow = null;
/** Janela atual para o diálogo de update (evita listeners/interval duplicados no macOS). */
let updatePromptWindow = null;
let autoUpdateHandlersRegistered = false;

function setupAutoUpdate(win) {
  updatePromptWindow = win;
  if (!app.isPackaged || isDev) return;

  if (!autoUpdateHandlersRegistered) {
    autoUpdateHandlersRegistered = true;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    // Garante o feed GitHub (mesmo `build.publish` do package.json no build).
    try {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'tudocertoapp',
        repo: 'windows',
      });
    } catch (_) {}

    autoUpdater.on('error', (err) => {
      console.error('[Updater] erro:', err?.message || err);
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[Updater] atualização disponível:', info?.version || '(sem versão)');
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[Updater] sem atualizações');
    });

    autoUpdater.on('update-downloaded', async (info) => {
      const w = updatePromptWindow;
      if (!w || w.isDestroyed()) return;
      try {
        const result = await dialog.showMessageBox(w, {
          type: 'info',
          buttons: ['Reiniciar agora', 'Depois'],
          defaultId: 0,
          cancelId: 1,
          title: 'Atualização pronta',
          message: `Uma nova versão (${info?.version || 'nova'}) foi baixada.`,
          detail: 'Deseja reiniciar agora para aplicar a atualização?',
        });
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      } catch (e) {
        console.error('[Updater] falha ao mostrar prompt:', e?.message || e);
      }
    });

    const check = () => {
      console.log('[Updater] versão instalada:', app.getVersion(), '| feed: github.com/tudocertoapp/windows');
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[Updater] checkForUpdates falhou:', err?.message || err);
      });
    };
    // Pequeno atraso para não competir com a primeira renderização da janela.
    setTimeout(check, 5000);
    // Verificação periódica (app aberto por muito tempo ainda recebe updates).
    setInterval(check, 8 * 60 * 60 * 1000);
  }
}

function appIconPath() {
  const ico = path.join(__dirname, 'icon.ico');
  const png = path.join(__dirname, 'icon.png');
  if (process.platform === 'win32' && fs.existsSync(ico)) return ico;
  if (fs.existsSync(png)) return png;
  return fs.existsSync(ico) ? ico : undefined;
}

function windowIcon() {
  const p = appIconPath();
  if (!p) return undefined;
  try {
    const img = nativeImage.createFromPath(p);
    return img.isEmpty() ? undefined : img;
  } catch (_) {
    return undefined;
  }
}

/** Pastas dist em produção: asar + asar.unpacked (só assets desempacotados → index.html fica no asar). */
function getDistRoots() {
  const asarDist = path.join(__dirname, '..', 'dist');
  if (!app.isPackaged) return [asarDist];
  const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist');
  return [unpacked, asarDist];
}

function parseSafeRelSegments(urlPath) {
  const trimmed = (urlPath || '/').replace(/\\/g, '/').replace(/^\/+/, '');
  const rel = trimmed || 'index.html';
  const segments = rel.split('/').filter(Boolean);
  if (segments.some((s) => s === '..')) return null;
  return segments;
}

function isFileInsideRoot(absFile, rootDir) {
  const abs = path.resolve(absFile);
  const base = path.resolve(rootDir);
  if (process.platform === 'win32') {
    const a = abs.toLowerCase();
    const b = base.toLowerCase();
    return a === b || a.startsWith(b + path.sep);
  }
  return abs === base || abs.startsWith(base + path.sep);
}

function resolveDistFile(segments) {
  for (const root of getDistRoots()) {
    const abs = path.resolve(path.join(root, ...segments));
    if (!isFileInsideRoot(abs, root)) continue;
    try {
      const st = fs.statSync(abs);
      if (st.isFile()) return abs;
    } catch (_) {}
  }
  return null;
}

function assertDistIndexPresent() {
  const roots = getDistRoots();
  const ok = roots.some((r) => {
    try {
      return fs.existsSync(path.join(r, 'index.html'));
    } catch (_) {
      return false;
    }
  });
  if (!ok) {
    throw new Error('dist/index.html não encontrado. Execute: npm run web:build');
  }
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.ttf':
      return 'font/ttf';
    case '.otf':
      return 'font/otf';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.mp3':
      return 'audio/mpeg';
    case '.mp4':
      return 'video/mp4';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Produção: servimos o dist/ via HTTP local.
 * Motivo: o Expo Web (metro) gera URIs absolutas "/assets/..." no bundle.
 * Em file:// isso quebra; em http://localhost funciona.
 */
function startDistServer() {
  assertDistIndexPresent();

  const server = http.createServer((req, res) => {
    try {
      const rawUrl = req.url || '/';
      let urlPath = rawUrl.split('?')[0] || '/';
      try {
        urlPath = decodeURIComponent(urlPath);
      } catch (_) {}
      const segments = parseSafeRelSegments(urlPath);
      if (!segments) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const absResolved = resolveDistFile(segments);
      if (!absResolved) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      // Content-Length evita Transfer-Encoding: chunked; sem isto o Chromium/Electron costuma falhar @font-face (.ttf).
      let size;
      try {
        size = fs.statSync(absResolved).size;
      } catch (_) {
        res.writeHead(500);
        res.end('Internal error');
        return;
      }

      res.setHeader('Content-Type', contentTypeFor(absResolved));
      res.setHeader('Content-Length', size);
      res.setHeader('Cache-Control', 'no-cache');
      // CORS em tudo: o Expo Web faz <link rel="preload" as="font" crossorigin> e @font-face;
      // sem ACAO o Chromium pode falhar o preload e os ícones ficam em "quadrado vazio".
      res.setHeader('Access-Control-Allow-Origin', '*');
      const extLower = path.extname(absResolved).toLowerCase();
      if (['.ttf', '.otf', '.woff', '.woff2'].includes(extLower)) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      }
      fs.createReadStream(absResolved).pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end('Internal error');
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 560,
    show: false,
    backgroundColor: '#111827',
    icon: windowIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Sandbox pode impedir carregamento fiável de fontes TTF (Ionicons) no Windows empacotado.
      sandbox: !app.isPackaged,
      // Empacotado: mesma origem loopback + @font-face (Ionicons); webSecurity off evita bloqueios de fonte no Chromium.
      webSecurity: !app.isPackaged,
    },
  });

  // Remove menu "File / Edit / View..." (Windows/Linux). No macOS, também remove o menu global.
  win.setMenu(null);
  win.setMenuBarVisibility(false);

  win.once('ready-to-show', () => {
    win.show();
    if (process.platform === 'win32') {
      try {
        win.moveTop();
        win.focus();
      } catch (_) {}
    }
  });

  if (isDev) {
    const url = process.env.ELECTRON_START_URL || 'http://127.0.0.1:8081';
    win.loadURL(url).catch((err) => {
      console.error('[Electron] Falha ao abrir', url, err.message);
      console.error('Inicie o servidor web: npm run web');
    });
  } else {
    startDistServer()
      .then(({ url }) => win.loadURL(url))
      .catch((err) => {
        console.error('[Electron] Falha ao iniciar servidor do dist:', err.message);
      });
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  return win;
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    try {
      app.setAppUserModelId('com.tudocerto.desktop');
    } catch (_) {}
  }

  // Remover menu padrão do Electron.
  try {
    Menu.setApplicationMenu(null);
  } catch (_) {}

  const ses = session.defaultSession;
  if (ses) {
    const allowMicPermissions = new Set(['media', 'microphone', 'audioCapture']);

    // Permite captura de áudio no app empacotado (.exe) e no dev.
    ses.setPermissionCheckHandler((_webContents, permission) => {
      if (allowMicPermissions.has(permission)) return true;
      return false;
    });

    ses.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (allowMicPermissions.has(permission)) {
        callback(true);
        return;
      }
      callback(false);
    });
  }

  if (process.platform === 'darwin' && systemPreferences?.askForMediaAccess) {
    systemPreferences.askForMediaAccess('microphone').catch(() => {});
  }

  mainWindow = createWindow();
  setupAutoUpdate(mainWindow);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      setupAutoUpdate(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
