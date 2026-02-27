import React, { createContext, useContext, useState } from 'react';

const CadastroContext = createContext(undefined);

export function CadastroProvider({ children }) {
  const [section, setSection] = useState('clientes');
  const [modalOpen, setModalOpen] = useState(null);

  const openCadastro = (type) => {
    setSection(type);
    setModalOpen(type);
  };

  const openCadastroTab = (tabName, type) => {
    setSection(type);
    return tabName;
  };

  return (
    <CadastroContext.Provider
      value={{
        section,
        setSection,
        modalOpen,
        setModalOpen,
        openCadastro,
        openCadastroTab,
      }}
    >
      {children}
    </CadastroContext.Provider>
  );
}

export function useCadastro() {
  const ctx = useContext(CadastroContext);
  if (!ctx) return { section: 'clientes', setSection: () => {}, modalOpen: null, setModalOpen: () => {}, openCadastro: () => {}, openCadastroTab: (tab, type) => tab };
  return ctx;
}
