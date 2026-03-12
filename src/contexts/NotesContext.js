import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NOTES_KEY = '@tudocerto_notes';

const NotesContext = createContext(undefined);

function toNote(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title || 'Sem título',
    content: r.content || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function NotesProvider({ children }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);

  const loadFromSupabase = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!error && data) setNotes(data.map(toNote));
      else setNotes([]);
    } catch {
      setNotes([]);
    }
  }, [user?.id]);

  const loadFromStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTES_KEY);
      const data = raw ? JSON.parse(raw) : [];
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    if (user?.id) loadFromSupabase();
    else loadFromStorage();
  }, [user?.id, loadFromSupabase, loadFromStorage]);

  const addNote = useCallback(
    (note) => {
      const title = (note?.title || '').trim() || 'Sem título';
      const content = (note?.content || '').trim() || '';

      if (user?.id) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('notes')
              .insert({
                user_id: user.id,
                title,
                content,
              })
              .select('*')
              .single();
            if (!error && data) setNotes((prev) => [toNote(data), ...prev]);
          } catch (e) {
            console.warn('Erro ao salvar anotação no Supabase:', e);
          }
        })();
        return null;
      }

      const n = {
        id: Date.now().toString(),
        title,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes((prev) => {
        const next = [n, ...prev];
        AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return n.id;
    },
    [user?.id]
  );

  const updateNote = useCallback(
    (id, data) => {
      const title = (data.title !== undefined ? data.title : '').trim() || 'Sem título';
      const content = data.content !== undefined ? data.content : '';

      if (user?.id) {
        supabase
          .from('notes')
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq('id', id)
          .then(() => {
            setNotes((prev) =>
              prev.map((n) =>
                n.id === id
                  ? { ...n, title, content, updatedAt: new Date().toISOString() }
                  : n
              )
            );
          })
          .catch((e) => console.warn('Erro ao atualizar anotação:', e));
        return;
      }

      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === id
            ? {
                ...n,
                ...data,
                title: (data.title !== undefined ? data.title : n.title).trim() || 'Sem título',
                content: data.content !== undefined ? data.content : n.content,
                updatedAt: new Date().toISOString(),
              }
            : n
        );
        AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [user?.id]
  );

  const deleteNote = useCallback(
    (id) => {
      if (user?.id) {
        supabase
          .from('notes')
          .delete()
          .eq('id', id)
          .then(() => setNotes((prev) => prev.filter((n) => n.id !== id)))
          .catch((e) => console.warn('Erro ao excluir anotação:', e));
        return;
      }

      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [user?.id]
  );

  const value = { notes, addNote, updateNote, deleteNote };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}
