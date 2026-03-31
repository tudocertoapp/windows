/**
 * Processo principal Electron (Windows/macOS/Linux).
 * Produção: carrega export estático Expo em dist/index.html.
 * Desenvolvimento: ELECTRON_DEV=1 + app web em http://127.0.0.1:8081 (npm run web).
 */
const { app, BrowserWindow, shell, session, systemPreferences } = require('electron');
const path = require('path');

const isDev = process.env.ELECTRON_DEV === '1' || process.env.ELECTRON_DEV === 'true';

const iconPath = path.join(__dirname, 'icon-256.png');

function distIndexPath() {
  return path.join(__dirname, '..', 'dist', 'index.html');
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    const url = process.env.ELECTRON_START_URL || 'http://127.0.0.1:8081';
    win.loadURL(url).catch((err) => {
      console.error('[Electron] Falha ao abrir', url, err.message);
      console.error('Inicie o servidor web: npm run web');
    });
  } else {
    win.loadFile(distIndexPath()).catch((err) => {
      console.error('[Electron] dist/index.html não encontrado. Execute: npm run web:build', err.message);
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
