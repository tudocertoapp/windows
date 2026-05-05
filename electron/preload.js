/**
 * Expõe flags do processo principal ao bundle web (contextIsolation).
 * Evita usar #pdv na URL no .exe (não abrir segunda janela / endereço tipo browser).
 */
const { contextBridge } = require('electron');

const launchPdvOnly = process.argv.includes('--pdv');

contextBridge.exposeInMainWorld('__TUDO_CERTO_DESKTOP__', {
  launchPdvOnly,
});
