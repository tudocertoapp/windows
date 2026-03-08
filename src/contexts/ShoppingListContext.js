import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHOPPING_LIST_KEY = '@tudocerto_shopping_list';

const ShoppingListContext = createContext(undefined);

export function ShoppingListProvider({ children }) {
  const [items, setItems] = useState([]);

  const loadItems = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      const data = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const saveItems = useCallback(async (next) => {
    setItems(next);
    try {
      await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Erro ao salvar lista de compras:', e);
    }
  }, []);

  const addItem = useCallback((item) => {
    const n = {
      id: Date.now().toString(),
      title: (item?.title || '').trim() || 'Item',
      date: item?.date || null,
      checked: item?.checked ?? false,
      tipo: item?.tipo || 'pessoal',
      photoUris: Array.isArray(item?.photoUris) ? item.photoUris : [],
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => {
      const next = [n, ...prev];
      AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return n.id;
  }, []);

  const updateItem = useCallback((id, data) => {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === id
          ? {
              ...i,
              ...data,
              title: (data.title !== undefined ? data.title : i.title).trim() || 'Item',
              photoUris: data.photoUris !== undefined ? data.photoUris : (i.photoUris || []),
            }
          : i
      );
      AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const deleteItem = useCallback((id) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = { items, addItem, updateItem, deleteItem };

  return <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>;
}

export function useShoppingList() {
  const ctx = useContext(ShoppingListContext);
  if (!ctx) throw new Error('useShoppingList must be used within ShoppingListProvider');
  return ctx;
}
