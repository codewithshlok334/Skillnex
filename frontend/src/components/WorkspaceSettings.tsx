import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, UserRound, ShieldCheck, LogOut, Code2, ArrowUpRight } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { useSession } from '../hooks/useSession';
import { defaultEditorPreferences, useEditorPreferences, useWorkspaceTheme } from '../hooks/useWorkspacePreferences';
import type { EditorPreferences } from '../hooks/useWorkspacePreferences';
import '../workspace-settings.css';

export function WorkspaceSettings({ open, onOpenChange, logout, loggingOut }: {
  open: boolean; onOpenChange: (open: boolean) => void; logout: () => Promise<void>; loggingOut: boolean;
}) {
  const { user } = useSession();
  const { theme, setTheme } = useWorkspaceTheme();
  const { preferences, updatePreferences } = useEditorPreferences();
  const [section, setSection] = useState<'appearance' | 'editor' | 'account'>('appearance');
  const [saved, setSaved] = useState('');
  function update(patch: Partial<EditorPreferences>) {
    setSaved(updatePreferences(patch) ? 'Saved on this browser.' : 'Applied for this session. Browser storage is unavailable.');
  }
  return <Dialog open={open} onOpenChange={onOpenChange} title="Settings" description="Make SkillNex work the way you like.">
    <div className="workspace-settings">
      <nav aria-label="Settings sections" className="ws-tabs">
        <button aria-pressed={section === 'appearance'} onClick={() => setSection('appearance')}><Sun size={16} />Appearance</button>
        <button aria-pressed={section === 'editor'} onClick={() => setSection('editor')}><Code2 size={16} />Editor</button>
        <button aria-pressed={section === 'account'} onClick={() => setSection('account')}><UserRound size={16} />Account</button>
      </nav>
      {section === 'appearance' && <section aria-label="Appearance settings"><h3>Choose your look</h3><p>Changes apply across SkillNex, including the coding editor.</p>
        <div className="ws-themes"><button aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><span className="ws-theme-preview ws-dark"><i /><i /><i /></span><Moon size={16} /><strong>Dark mode</strong>{theme === 'dark' && <small>Selected</small>}</button><button aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><span className="ws-theme-preview ws-light"><i /><i /><i /></span><Sun size={16} /><strong>Light mode</strong>{theme === 'light' && <small>Selected</small>}</button></div>
        <p className="ws-note">Your theme is remembered on this browser when local storage is available.</p>
      </section>}
      {section === 'editor' && <section aria-label="Editor settings"><h3>Your coding workspace</h3><p>These preferences stay on this browser. They do not change your saved code.</p><div className="ws-fields">
        <label>Default language<select value={preferences.language} onChange={e => update({ language: e.target.value as EditorPreferences['language'] })}><option value="java">Java</option><option value="cpp">C++</option><option value="python">Python</option></select><small>Used when opening your next problem.</small></label>
        <label>Font size<select value={preferences.fontSize} onChange={e => update({ fontSize: Number(e.target.value) })}>{[12, 14, 16, 18, 20].map(size => <option key={size} value={size}>{size} px</option>)}</select></label>
        <label>Tab spacing<select value={preferences.tabSize} onChange={e => update({ tabSize: Number(e.target.value) as 2 | 4 })}><option value={2}>2 spaces</option><option value={4}>4 spaces</option></select><small>Applies to new indentation; existing lines stay unchanged.</small></label>
        <label className="ws-switch"><span>Wrap long lines<small>Show long code lines without horizontal scrolling.</small></span><input type="checkbox" role="switch" checked={preferences.lineWrap} onChange={e => update({ lineWrap: e.target.checked })} /></label>
      </div><div className="ws-editor-actions"><Button size="sm" variant="secondary" onClick={() => update(defaultEditorPreferences)}>Restore editor defaults</Button><span role="status">{saved}</span></div></section>}
      {section === 'account' && <section aria-label="Account settings"><h3>Your account</h3><div className="ws-account"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><span>{user.email}</span><small>Signed in · {user.role.toLowerCase()} account</small></div></div>
        <div className="ws-account-links"><Link to="/app/profile" onClick={() => onOpenChange(false)}><UserRound size={18} /><span><strong>Profile & privacy</strong><small>Edit your details, skills, photo and profile visibility.</small></span><ArrowUpRight size={16} /></Link><Link to="/forgot-password" onClick={() => onOpenChange(false)}><ShieldCheck size={18} /><span><strong>Reset password</strong><small>Use the existing password recovery process.</small></span><ArrowUpRight size={16} /></Link></div>
        <div className="ws-signout"><p>Want to use a different account? Log out, then sign in with that account.</p><Button variant="secondary" disabled={loggingOut} onClick={() => void logout()}><LogOut size={16} />{loggingOut ? 'Logging out…' : 'Log out'}</Button></div>
      </section>}
    </div>
  </Dialog>;
}
