import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const SHOPPING_LIST_KEY = '@tudocerto_shopping_list';

const ShoppingListContext = createContext(undefined);

function toItem(r) {
  if (!r) return null;
  const photoUris = Array.isArray(r.photo_uris) ? r.photo_uris : [];
  return {
    id: r.id,
    title: r.title || 'Item',
    date: r.date || null,
    checked: r.checked ?? false,
    tipo: r.tipo || 'pessoal',
    photoUris,
    createdAt: r.created_at,
  };
}

export function ShoppingListProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const loadFromSupabase = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setItems(data.map(toItem));
      else setItems([]);
    } catch {
      setItems([]);
    }
  }, [user?.id]);

  const loadFromStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      const data = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (user?.id) loadFromSupabase();
    else loadFromStorage();
  }, [user?.id, loadFromSupabase, loadFromStorage]);

  const addItem = useCallback(
    (item) => {
      const title = (item?.title || '').trim() || 'Item';
      const date = item?.date || null;
      const checked = item?.checked ?? false;
      const tipo = item?.tipo || 'pessoal';
      const photoUris = Array.isArray(item?.photoUris) ? item.photoUris : [];

      if (user?.id) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('shopping_list_items')
              .insert({
                user_id: user.id,
                title,
                date,
                checked,
                tipo,
                photo_uris: photoUris,
              })
              .select('*')
              .single();
            if (!error && data) setItems((prev) => [toItem(data), ...prev]);
          } catch (e) {
            console.warn('Erro ao salvar item da lista no Supabase:', e);
          }
        })();
        return null;
      }

      const n = {
        id: Date.now().toString(),
        title,
        date,
        checked,
        tipo,
        photoUris,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => {
        const next = [n, ...prev];
        AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return n.id;
    },
    [user?.id]
  );

  const updateItem = useCallback(
    (id, data) => {
      if (user?.id) {
        const up = {};
        if (data.title !== undefined) up.title = String(data.title).trim() || 'Item';
        if (data.checked !== undefined) up.checked = data.checked;
        if (data.date !== undefined) up.date = data.date;
        if (data.tipo !== undefined) up.tipo = data.tipo;
        if (data.photoUris !== undefined) up.photo_uris = data.photoUris;

        if (Object.keys(up).length === 0) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    ...data,
                    title: (data.title !== undefined ? data.title : i.title).trim() || 'Item',
                    photoUris: data.photoUris !== undefined ? data.photoUris : (i.photoUris || []),
                  }
                : i
            )
          );
          return;
        }

        supabase
          .from('shopping_list_items')
          .update(up)
          .eq('id', id)
          .then(() => {
            setItems((prev) =>
              prev.map((i) =>
                i.id === id
                  ? {
                      ...i,
                      ...data,
                      title: (data.title !== undefined ? data.title : i.title).trim() || 'Item',
                      photoUris: data.photoUris !== undefined ? data.photoUris : (i.photoUris || []),
                    }
                  : i
              )
            );
          })
          .catch((e) => console.warn('Erro ao atualizar item da lista:', e));
        return;
      }

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
    },
    [user?.id]
  );

  const deleteItem = useCallback(
    (id) => {
      if (user?.id) {
        supabase
          .from('shopping_list_items')
          .delete()
          .eq('id', id)
          .then(() => setItems((prev) => prev.filter((i) => i.id !== id)))
          .catch((e) => console.warn('Erro ao excluir item da lista:', e));
        return;
      }

      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [user?.id]
  );

  const value = { items, addItem, updateItem, deleteItem };

  return (
    <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>
  );
}

export function useShoppingList() {
  const ctx = useContext(ShoppingListContext);
  if (!ctx) throw new Error('useShoppingList must be used within ShoppingListProvider');
  return ctx;
}
