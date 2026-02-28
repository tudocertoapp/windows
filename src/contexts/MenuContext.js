import React, { createContext, useContext } from 'react';

export const MenuContext = createContext({
  openMenu: () => {},
  closeAndNavigate: () => {},
  openImageGenerator: () => {},
  openAssistant: () => {},
  openManageCards: () => {},
});

export function useMenu() {
  return useContext(MenuContext);
}
