/**
 * Processo principal Electron (Windows/macOS/Linux).
 * Produção: carrega export estático Expo em dist/index.html.
 * Desenvolvimento: ELECTRON_DEV=1 + app web em http://127.0.0.1:8081 (npm run web).
 */
const { app, BrowserWindow, shell, session, systemPreferences, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const isDev = process.env.ELECTRON_DEV === '1' || process.env.ELECTRON_DEV === 'true';

const iconPath = path.join(__dirname, 'icon.png');

function distIndexPath() {
  return path.join(__dirname, '..', 'dist', 'index.html');
}

function distDir() {
  return path.join(__dirname, '..', 'dist');
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
  const root = distDir();
  if (!fs.existsSync(root)) {
    throw new Error('dist/ não encontrado. Execute: npm run web:build');
  }

  const server = http.createServer((req, res) => {
    try {
      const rawUrl = req.url || '/';
      const urlPath = decodeURIComponent(rawUrl.split('?')[0] || '/');
      const rel = urlPath === '/' ? 'index.html' : urlPath;
      // Importante no Windows: remover "/" inicial evita path absoluto fora de dist.
      const safeRel = path.posix.normalize(
        rel.replace(/^\/+/, '').replace(/\\/g, '/').replace(/\/{2,}/g, '/')
      );

      const abs = path.join(root, safeRel);
      const rootResolved = path.resolve(root);
      const absResolved = path.resolve(abs);
      const relToRoot = path.relative(rootResolved, absResolved);
      if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(absResolved) || fs.statSync(absResolved).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      res.setHeader('Content-Type', contentTypeFor(absResolved));
      res.setHeader('Cache-Control', 'no-cache');
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
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  });

  // Remove menu "File / Edit / View..." (Windows/Linux). No macOS, também remove o menu global.
  win.setMenu(null);
  win.setMenuBarVisibility(false);

  win.once('ready-to-show', () => win.show());

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
}

app.whenReady().then(() => {
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

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
