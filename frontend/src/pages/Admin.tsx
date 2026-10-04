import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Flag, Users, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, post } from '../api/client';
import type { Data } from '../types';
import { useSession } from '../hooks/useSession';
import { PageTitle, Card, SectionTitle, Loading, ErrorState, Empty } from '../components/Common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
export function Admin() {
  const { user } = useSession(),
    client = useQueryClient();
  const [page, setPage] = useState(0),
    [category, setCategory] = useState(''),
    [confirm, setConfirm] = useState<{
      title: string;
      path: string;
      body?: unknown;
      method?: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('Overview');
  const stats = useQuery({
      queryKey: ['admin-stats'],
      queryFn: () => api<Data>('/admin/analytics'),
      enabled: user.role === 'ADMIN',
    }),
    users = useQuery({
      queryKey: ['admin-users', page],
      queryFn: () => api<Data>('/admin/users?page=' + page),
      enabled: user.role === 'ADMIN',
    }),
    reports = useQuery({
      queryKey: ['admin-reports'],
      queryFn: () => api<Data[]>('/admin/reports'),
      enabled: user.role === 'ADMIN',
    }),
    categories = useQuery({
      queryKey: ['categories'],
      queryFn: () => api<Data[]>('/community/categories'),
    });
  if (user.role !== 'ADMIN') return <Navigate to="/app" replace />;
  async function act(path: string, body?: unknown, method = 'POST') {
    setBusy(true);
    try {
      await api(path, { method, body: body ? JSON.stringify(body) : undefined });
      client.invalidateQueries();
      setConfirm(null);
      toast.success('Change saved.');
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="KEEPING THE COMMUNITY HEALTHY"
        title="The bigger picture."
        description="Review activity, support your community, and make considered moderation decisions."
      />
      <div className="tabs">
        {['Overview', 'People', 'Reports', 'Categories'].map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Overview' &&
        (stats.isLoading ? (
          <Loading />
        ) : stats.error ? (
          <ErrorState error={stats.error} />
        ) : (
          <div className="admin-stats">
            {Object.entries(stats.data || {}).map(([key, value]) => (
              <Card key={key}>
                <span className="mini-icon purple">
                  <ShieldCheck size={20} />
                </span>
                <h3>{key.replace(/([A-Z])/g, ' $1')}</h3>
                <strong>{String(value)}</strong>
                <small>
                  {key === 'activeUsers'
                    ? 'Signed in within the last 30 days'
                    : key === 'aiCalls'
                      ? 'Successful and failed requests'
                      : ''}
                </small>
              </Card>
            ))}
          </div>
        ))}
      {tab === 'People' && (
        <Card>
          <SectionTitle
            title="People in your workspace"
            subtitle="Verify faculty only after checking their institutional affiliation."
          />
          {users.error ? (
            <ErrorState error={users.error} />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.items.map((u: Data) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <small>{u.email}</small>
                      </td>
                      <td>
                        <span className="pill">{u.role}</span>
                      </td>
                      <td>{u.banned ? 'Banned' : 'Active'}</td>
                      <td>
                        <div className="button-row">
                          {u.role === 'STUDENT' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setConfirm({
                                  title: 'Verify ' + u.name + ' as faculty?',
                                  path: '/admin/users/' + u.id + '/faculty',
                                })
                              }
                            >
                              Verify faculty
                            </Button>
                          )}
                          {u.role !== 'ADMIN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setConfirm({
                                  title: (u.banned ? 'Restore access for ' : 'Ban ') + u.name + '?',
                                  path: '/admin/users/' + u.id + '/ban',
                                })
                              }
                            >
                              {u.banned ? 'Unban' : 'Ban'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="pagination">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>Page {page + 1}</span>
            <Button
              size="sm"
              variant="secondary"
              disabled={(page + 1) * 20 >= (users.data?.total || 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </Card>
      )}
      {tab === 'Reports' && (
        <div className="stack">
          {reports.error ? (
            <ErrorState error={reports.error} />
          ) : reports.data?.length ? (
            reports.data.map((r) => (
              <Card key={r.id}>
                <div className="section-title">
                  <h3>
                    <Flag size={17} /> {r.target_type} report
                  </h3>
                  <span className="pill">{r.status}</span>
                </div>
                <p>{r.reason}</p>
                <div className="moderation-preview">
                  <strong>Reported content</strong>
                  <p>{r.content}</p>
                </div>
                <small className="muted">
                  Reported by {r.name} · Content ID: {r.target_id}
                </small>
                {r.status === 'OPEN' && (
                  <div className="button-row">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        act('/admin/reports/' + r.id + '/resolve', { action: 'dismiss' })
                      }
                    >
                      Dismiss report
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setConfirm({
                          title: 'Remove reported content?',
                          path: '/admin/reports/' + r.id + '/resolve',
                          body: { action: 'remove' },
                        })
                      }
                    >
                      Remove content
                    </Button>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <Empty
                title="A quiet moderation queue."
                description="Community reports will appear here for your review."
              />
            </Card>
          )}
        </div>
      )}
      {tab === 'Categories' && (
        <Card>
          <h2>Make room for good questions.</h2>
          <form
            className="comment-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await act('/admin/categories', { text: category })) setCategory('');
            }}
          >
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              maxLength={60}
              placeholder="New category name"
              aria-label="New category"
            />
            <Button disabled={busy} type="submit">
              <Plus size={15} />
              Add category
            </Button>
          </form>
          <div className="category-admin-list">
            {categories.data?.map((c) => (
              <div key={c.name}>
                <span>{c.name}</span>
                <button
                  className="icon-button"
                  aria-label={'Delete ' + c.name}
                  onClick={() =>
                    setConfirm({
                      title: 'Delete ' + c.name + '?',
                      path: '/admin/categories/' + encodeURIComponent(c.name),
                      method: 'DELETE',
                    })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <p className="small muted">Categories used by existing questions cannot be removed.</p>
        </Card>
      )}
      <Dialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title || 'Confirm change'}
        description="This changes the live workspace. Check the selected person or content before continuing."
      >
        <div className="button-row">
          <Button
            disabled={busy}
            onClick={() => confirm && act(confirm.path, confirm.body, confirm.method)}
          >
            Confirm change
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Go back
          </Button>
        </div>
      </Dialog>
    </>
  );
}
