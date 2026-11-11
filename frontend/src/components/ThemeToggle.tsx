import { Moon, Sun } from 'lucide-react';
import { useWorkspaceTheme } from '../hooks/useWorkspacePreferences';

/** The same saved appearance control on public pages and every workspace tool. */
export function ThemeToggle() {
  const { theme, setTheme } = useWorkspaceTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return <button type="button" className="theme-toggle" aria-label={label} title={label}
    onClick={() => setTheme(dark ? 'light' : 'dark')}>
    {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    <span>{dark ? 'Light' : 'Dark'}</span>
  </button>;
}
