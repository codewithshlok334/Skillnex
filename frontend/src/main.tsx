import React, { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { AppLayout } from './layouts/AppLayout';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Resumes } from './pages/Resumes';
import { Builder } from './pages/Builder';
import { Jobs } from './pages/Jobs';
import { Interviews, InterviewRoom } from './pages/Interviews';
import { Community, QuestionDetail } from './pages/Community';
import { Roadmap } from './pages/Roadmap';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { Assistant } from './pages/Assistant';
import { LinkedIn } from './pages/LinkedIn';
import { applyTheme, readTheme } from './utils/graphiteTheme';
import './styles.css';
const CodeLab = lazy(() => import('./pages/CodeLab').then(module => ({ default: module.CodeLab })));
const CodeLabRoom = lazy(() => import('./pages/CodeLab').then(module => ({ default: module.CodeLabRoom })));
applyTheme(readTheme());
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false } },
});
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="boot">
        <h1>Let’s try that again.</h1>
        <p>Something unexpected happened. Your saved work is still there.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload workspace
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth mode="signup" />} />
              <Route path="/forgot-password" element={<Auth mode="forgot" />} />
              <Route path="/reset-password" element={<Auth mode="reset" />} />
              <Route path="/demo" element={<Auth mode="demo" />} />
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="resumes" element={<Resumes />} />
                <Route path="linkedin" element={<LinkedIn />} />
                <Route path="codelab" element={<Suspense fallback={<div role="status">Opening CodeLab…</div>}><CodeLab /></Suspense>} />
                <Route path="codelab/:id" element={<Suspense fallback={<div role="status">Opening your coding workspace…</div>}><CodeLabRoom /></Suspense>} />
                <Route path="builder" element={<Builder />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="interviews" element={<Interviews />} />
                <Route path="interviews/:id" element={<InterviewRoom />} />
                <Route path="community" element={<Community />} />
                <Route path="community/:id" element={<QuestionDetail />} />
                <Route path="roadmap" element={<Roadmap />} />
                <Route path="profile" element={<Profile />} />
                <Route path="admin" element={<Admin />} />
                <Route path="assistant" element={<Assistant />} />
              </Route>
              <Route
                path="*"
                element={
                  <div className="boot">
                    <h1>A little off the beaten path.</h1>
                    <p>We couldn’t find this page.</p>
                    <Link className="btn btn-primary" to="/app">
                      Back to your workspace
                    </Link>
                  </div>
                }
              />
            </Routes>
            <Toaster richColors position="bottom-right" closeButton />
          </BrowserRouter>
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
import './features.css';
import './responsive.css';
import './polish.css';
import './assistant.css';
import './dimension.css';
import './grey-theme.css';
import './professional.css';
import './career-ui.css';
