import React, { createContext, useContext } from 'react';

export const MenuContext = createContext({
  openMenu: () => {},
  closeAndNavigate: () => {},
  openImageGenerator: () => {},
  openAssistant: () => {},
  openManageCards: () => {},
  openMeusGastos: () => {},
  openReceiptScanner: () => {},
  openCalculadoraFull: () => {},
  openMensagensWhatsApp: () => {},
  openCatalogo: () => {},
  openMeusProfissionais: () => {},
  dockControl: () => {},
});

export function useMenu() {
  return useContext(MenuContext);
}
