import { useEffect, useState } from 'react';
import { applyTheme, readTheme } from '../utils/graphiteTheme';
import type { Theme } from '../utils/graphiteTheme';

const editorKey = 'skillnex-codelab-editor';
const editorEvent = 'skillnex-editor-preferences';
export type EditorPreferences = { language: 'java' | 'cpp' | 'python'; fontSize: number; tabSize: 2 | 4; lineWrap: boolean };
export const defaultEditorPreferences: EditorPreferences = { language: 'python', fontSize: 14, tabSize: 4, lineWrap: false };
let temporaryPreferences = defaultEditorPreferences;

function readEditorPreferences(): EditorPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(editorKey) || 'null');
    if (!value || typeof value !== 'object') return temporaryPreferences;
    return {
      language: ['java', 'cpp', 'python'].includes(value.language) ? value.language : 'python',
      fontSize: [12, 14, 16, 18, 20].includes(value.fontSize) ? value.fontSize : 14,
      tabSize: value.tabSize === 2 ? 2 : 4,
      lineWrap: value.lineWrap === true,
    };
  } catch { return temporaryPreferences; }
}

export function useEditorPreferences() {
  const [preferences, setPreferences] = useState(readEditorPreferences);
  useEffect(() => {
    const refresh = () => setPreferences(readEditorPreferences());
    const fromStorage = (event: StorageEvent) => { if (event.key === editorKey || event.key === null) refresh(); };
    window.addEventListener(editorEvent, refresh);
    window.addEventListener('storage', fromStorage);
    return () => { window.removeEventListener(editorEvent, refresh); window.removeEventListener('storage', fromStorage); };
  }, []);
  function updatePreferences(patch: Partial<EditorPreferences>) {
    const next = { ...readEditorPreferences(), ...patch };
    temporaryPreferences = next;
    let persisted = true;
    try { localStorage.setItem(editorKey, JSON.stringify(next)); } catch { persisted = false; }
    window.dispatchEvent(new Event(editorEvent));
    return persisted;
  }
  return { preferences, updatePreferences };
}

export function useWorkspaceTheme() {
  const [theme, updateTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'light' ? 'light' : readTheme());
  useEffect(() => {
    const refresh = () => updateTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    const fromStorage = (event: StorageEvent) => { if (event.key === 'careerx-graphite-theme' || event.key === null) applyTheme(readTheme()); };
    window.addEventListener('skillnex-theme-change', refresh);
    window.addEventListener('storage', fromStorage);
    return () => { window.removeEventListener('skillnex-theme-change', refresh); window.removeEventListener('storage', fromStorage); };
  }, []);
  return { theme, setTheme: (value: Theme) => applyTheme(value) };
}
