import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { NavLink, Outlet, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FileText,
  PenLine,
  ScanLine,
  Mic,
  MessagesSquare,
  Route,
  Settings,
  ShieldCheck,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ArrowUpRight,
  Menu,
  X,
  LogOut,
  Command,
  Sparkles,
  CheckCheck,
  Linkedin,
  Code2,
  ArrowLeft,
} from 'lucide-react';
import { api, post, ApiError } from '../api/client';
import { SessionContext, useConfig } from '../hooks/useSession';
import type { User, Data } from '../types';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Loading, ErrorState } from '../components/Common';
import { initials } from '../utils/cn';
import { AssistantWidget } from '../components/AssistantWidget';
import { useWorkspaceTheme } from '../hooks/useWorkspacePreferences';
import { WorkspaceSettings } from '../components/WorkspaceSettings';
import '../logout.css';
export function Logo() {
  return (
    <span className="brand skillnex-brand" aria-label="SkillNex">
      <img className="skillnex-mark" src="/brand/skillnex-mark.png" alt="" width="44" height="44" />
      <span className="skillnex-wordmark">Skill<span>Nex</span></span>
    </span>
  );
}
const nav = [
  { label: 'AI assistant', path: '/app/assistant', icon: Sparkles, badge: 'NEW' },
  { label: 'Overview', path: '/app', icon: LayoutDashboard, end: true },
  { label: 'Resume analyzer', path: '/app/resumes', icon: FileText },
  { label: 'LinkedIn review', path: '/app/linkedin', icon: Linkedin, badge: 'NEW' },
  { label: 'Resume builder', path: '/app/builder', icon: PenLine, badge: 'FREE' },
  { label: 'Job match', path: '/app/jobs', icon: ScanLine },
  { label: 'Mock interviews', path: '/app/interviews', icon: Mic },
  { label: 'CodeLab', path: '/app/codelab', icon: Code2, badge: 'NEW' },
  { label: 'Community', path: '/app/community', icon: MessagesSquare },
  { label: 'Career roadmap', path: '/app/roadmap', icon: Route },
];
export function AppLayout() {
  const logoutPending = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const config = useConfig();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('/users/me'),
    retry: false,
  });
  const notices = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Data[]>('/notifications'),
    enabled: !!me.data,
    refetchInterval: 60000,
  });
  const [mobile, setMobile] = useState(false),
    [notifications, setNotifications] = useState(false),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState(''),
    [settings, setSettings] = useState(false);
  const { theme, setTheme } = useWorkspaceTheme();
  const dark = theme === 'dark';
  const client = useQueryClient(),
    navigate = useNavigate(),
    location = useLocation();
  async function logout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLoggingOut(true);
    try {
      const pendingSaves: Promise<boolean>[] = [];
      window.dispatchEvent(new CustomEvent('skillnex-save-before-logout', { detail: pendingSaves }));
      if ((await Promise.all(pendingSaves)).some(saved => !saved)) {
        toast.error('Your code could not be saved yet. Save your draft before logging out.');
        return;
      }
      await post('/auth/logout');
      client.clear();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(
        'Could not log out. ' + (error instanceof Error ? error.message : 'Please try again.'),
      );
    } finally {
      logoutPending.current = false;
      setLoggingOut(false);
    }
  }
  const logoutButton = (className = '') => (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={'logout-button ' + className}
      onClick={logout}
      disabled={loggingOut}
      aria-busy={loggingOut}
    >
      <LogOut size={16} aria-hidden="true" />
      {loggingOut ? 'Logging out…' : 'Log out'}
    </Button>
  );
  useEffect(() => { setMobile(false); setSettings(false); }, [location.pathname]);
  useEffect(() => {
    function listener(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    }
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  if (me.error instanceof ApiError && me.error.status === 401)
    return <Navigate to="/login" replace />;
  if (me.isLoading || config.isLoading)
    return (
      <div className="boot">
        <Logo />
        <Loading />
      </div>
    );
  if (me.error || config.error || !me.data || !config.data)
    return (
      <div className="boot">
        <ErrorState
          error={me.error || config.error}
          retry={() => {
            me.refetch();
            config.refetch();
          }}
        />
        {logoutButton()}
      </div>
    );
  const user = me.data;
  const inCodeLab = /^\/app\/codelab(?:\/|$)/.test(location.pathname);
  const active = nav.find((n) =>
    n.end ? location.pathname === n.path : location.pathname.startsWith(n.path),
  );
  const unread = notices.data?.filter((n) => !n.read_at).length || 0;
  return (
    <SessionContext.Provider value={{ user, config: config.data }}>
      <div className={'app-shell' + (inCodeLab ? ' codelab-section' : '') + (/^\/app\/codelab\/\d+\/?$/.test(location.pathname) ? ' codelab-shell' : '')}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {mobile && !inCodeLab && (
          <button
            className="sidebar-backdrop"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          />
        )}
        {!inCodeLab && <aside className={'sidebar ' + (mobile ? 'open' : '')}>
          <Link to="/app" className="logo-link">
            <Logo />
          </Link>
          <button
            className="icon-button mobile-close"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X size={19} />
          </button>
          <div className="workspace">
            <span className="workspace-icon">N</span>
            <div>
              <strong>My workspace</strong>
              <small>Your next chapter</small>
            </div>
            <ChevronDown size={15} />
          </div>
          <div className="nav-label">WORKSPACE</div>
          <nav>
            {nav.map((n) => (
              <NavLink
                key={n.path}
                to={n.path}
                end={n.end}
                className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}
              >
                <n.icon size={19} />
                <span>{n.label}</span>
                {n.badge && <em>{n.badge}</em>}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-coach">
              <span className="coach-star">
                <Sparkles size={18} />
              </span>
              <strong>A little progress, every day.</strong>
              <p>Your future self will thank you.</p>
              <Link to="/app/roadmap">
                Find your next step
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <NavLink className="nav-item" to="/app/profile">
              <Settings size={19} />
              Settings & profile
            </NavLink>
            {user.role === 'ADMIN' && (
              <NavLink className="nav-item" to="/app/admin">
                <ShieldCheck size={19} />
                Admin workspace
              </NavLink>
            )}
            <div className="sidebar-user">
              <Link to="/app/profile" className="avatar">
                {user.photo_url ? (
                  <img src={user.photo_url} alt={user.name} />
                ) : (
                  initials(user.name)
                )}
              </Link>
              <div>
                <strong>{user.name}</strong>
                <small>
                  {user.role === 'STUDENT'
                    ? 'Student account'
                    : user.role.toLowerCase() + ' account'}
                </small>
              </div>
            </div>
            {logoutButton('sidebar-logout')}
          </div>
        </aside>}
        <div className="app-body" inert={(!inCodeLab && mobile) || undefined}>
          <header className="topbar">
            {inCodeLab ? <Link to="/app" className="codelab-back"><ArrowLeft size={16} /><span>Back to SkillNex</span></Link> : <div className="breadcrumb">
              <button
                className="icon-button mobile-menu"
                onClick={() => setMobile(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <span>Workspace</span>
              <span className="slash">/</span>
              <strong>{active?.label || 'Profile & settings'}</strong>
            </div>}
            <div className="topbar-actions">
              {logoutButton('topbar-logout')}
              <Link
                to="/app/assistant"
                className="assistant-top-link"
                aria-label="Open AI assistant"
              >
                <Sparkles size={18} />
                <span>AI assistant</span>
              </Link>
              <button
                className="search-trigger"
                onClick={() => setSearch(true)}
                aria-label="Search workspace"
              >
                <Search size={16} />
                <span>Search anything…</span>
                <kbd>⌘ K</kbd>
              </button>
              <button
                className="icon-button"
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => setTheme(dark ? 'light' : 'dark')}
              >
                {dark ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              <button className="topbar-settings" aria-label="Open settings" onClick={() => setSettings(true)}><Settings size={17} /><span>Settings</span></button>
              <button
                className="icon-button notification-trigger"
                aria-label="Notifications"
                onClick={() => setNotifications(true)}
              >
                <Bell size={19} />
                {unread > 0 && <i />}
              </button>
              <Link className="avatar small" to="/app/profile">
                {user.photo_url ? (
                  <img src={user.photo_url} alt={user.name} />
                ) : (
                  initials(user.name)
                )}
              </Link>
            </div>
          </header>
          {config.data.demo && (
            <div className="demo-strip">
              <span>
                <i /> Demo workspace <b>·</b> Sample career data. Your changes are saved
                locally.
              </span>
              <span>
                All core tools are free <Sparkles size={12} />
              </span>
            </div>
          )}
          <main id="main" className="main-content">
            <Outlet />
          </main>
          <footer className="app-footer">
            <span>Craft Your Resume. Crack Your Interview</span>
            <span>
              <span className="status-dot" />{' '}
              {config.data.aiAvailable ? 'AI connected' : 'AI provider not connected'}
              <span className="footer-separator">·</span>SkillNex © {new Date().getFullYear()}
            </span>
          </footer>
          {!/^\/app\/interviews\/[^/]+\/?$/.test(location.pathname) && <AssistantWidget />}
        </div>
      </div>
      <WorkspaceSettings open={settings} onOpenChange={setSettings} logout={logout} loggingOut={loggingOut} />
      <Dialog
        open={search}
        onOpenChange={setSearch}
        title="Find your next step"
        description="Jump to a tool or search your campus community."
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(false);
            navigate('/app/community?q=' + encodeURIComponent(query));
          }}
        >
          <div className="input-icon">
            <Search size={18} />
            <input
              autoFocus
              placeholder="Search questions, concepts, or skills…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit">
            Search community
            <ArrowUpRight size={16} />
          </Button>
        </form>
        <div className="quick-links">
          {nav
            .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
            .map((n) => (
              <Link to={n.path} key={n.path} onClick={() => setSearch(false)}>
                <n.icon size={17} />
                {n.label}
                <ArrowUpRight size={15} />
              </Link>
            ))}
        </div>
      </Dialog>
      <Dialog
        open={notifications}
        onOpenChange={setNotifications}
        title="Your updates"
        description="A little momentum, delivered."
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await post('/notifications/read');
            client.invalidateQueries({ queryKey: ['notifications'] });
          }}
        >
          <CheckCheck size={16} />
          Mark all read
        </Button>
        <div className="notification-list">
          {notices.data?.length ? (
            notices.data.map((n) => (
              <Link
                to={n.link}
                key={n.id}
                onClick={() => setNotifications(false)}
                className={n.read_at ? '' : 'unread'}
              >
                <span className="mini-icon purple">
                  <Bell size={16} />
                </span>
                <div>
                  <strong>{n.message}</strong>
                  <small>{n.kind.toLowerCase().replace('_', ' ')}</small>
                </div>
              </Link>
            ))
          ) : (
            <p className="muted">You’re all caught up. New updates will appear here.</p>
          )}
        </div>
      </Dialog>
    </SessionContext.Provider>
  );
}
