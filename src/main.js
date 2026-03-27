const { app, BrowserWindow, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Tudo Certo - Agenda e Finanças',
    icon: path.join(__dirname, '../build/icon.png'), // Cross-platform fallback fallback
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Load the web app
  mainWindow.loadURL('https://tudocerto-web.vercel.app').catch((err) => {
    console.error('Failed to load url:', err);
    // Load local offline page if connection fails
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  // Integrates seamless updates check
  // Uses GitHub releases due to configurations in package.json
  autoUpdater.checkForUpdatesAndNotify();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Atualização disponível',
    message: 'Uma nova versão do aplicativo está disponível. O download será iniciado em segundo plano.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Atualização pronta',
    message: 'A atualização foi baixada e está pronta para ser instalada. O aplicativo será reiniciado para aplicar as mudanças de versão.',
    buttons: ['Reiniciar e Instalar']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Erro de atualização do aplicativo:', err);
});
