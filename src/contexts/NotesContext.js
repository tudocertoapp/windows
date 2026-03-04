import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_KEY = '@tudocerto_notes';

const NotesContext = createContext(undefined);

export function NotesProvider({ children }) {
  const [notes, setNotes] = useState([]);

  const loadNotes = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTES_KEY);
      const data = raw ? JSON.parse(raw) : [];
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const saveNotes = useCallback(async (next) => {
    setNotes(next);
    try {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Erro ao salvar anotações:', e);
    }
  }, []);

  const addNote = useCallback((note) => {
    const n = {
      id: Date.now().toString(),
      title: (note?.title || '').trim() || 'Sem título',
      content: (note?.content || '').trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => {
      const next = [n, ...prev];
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return n.id;
  }, []);

  const updateNote = useCallback((id, data) => {
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
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = { notes, addNote, updateNote, deleteNote };

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}
