import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save, ShieldCheck, GraduationCap, Award, Eye, EyeOff, Target } from 'lucide-react';
import { toast } from 'sonner';
import { api, put } from '../api/client';
import { useSession } from '../hooks/useSession';
import { PageTitle, Card, SectionTitle, ErrorState } from '../components/Common';
import { Button } from '../components/ui/button';
import { initials } from '../utils/cn';
export function Profile() {
  const { user } = useSession(),
    client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [publicProfile, setPublicProfile] = useState(user.public_profile);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError(null);
    try {
      await put('/users/me', { ...f, publicProfile });
      await client.invalidateQueries({ queryKey: ['me'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Profile updated. Your next chapter looks good on you.');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="UNIQUELY YOU"
        title="A little more about your story."
        description="Keep your profile current for advice that meets you where you are."
      />
      <div className="profile-grid">
        <div className="stack">
          <Card className="profile-summary">
            <span className="avatar large">
              {user.photo_url ? <img src={user.photo_url} alt={user.name} /> : initials(user.name)}
            </span>
            <label className="photo-upload btn btn-ghost btn-sm">
              Update photo
              <input
                className="sr-only"
                aria-label="Upload profile photo"
                type="file"
                accept="image/png,image/jpeg"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const body = new FormData();
                  body.append('file', file);
                  try {
                    await api('/users/me/photo', { method: 'POST', body });
                    client.invalidateQueries({ queryKey: ['me'] });
                    toast.success('Photo updated.');
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <h2>{user.name}</h2>
            <span className="pill purple">{user.role.toLowerCase()}</span>
            <p>
              <GraduationCap size={16} />
              {user.college || 'Add your college'}
            </p>
            <p>
              <Target size={16} />
              {user.career_goal || 'Set a career goal'}
            </p>
            <div className="profile-reputation">
              <strong>{user.reputation}</strong>
              <span>community reputation</span>
            </div>
          </Card>
          <Card>
            <SectionTitle title="Your small collection of wins" />
            {user.badges.length ? (
              <div className="badge-grid">
                {user.badges.map((b) => (
                  <div key={b.id} title={b.description}>
                    <Award size={24} />
                    <strong>{b.name}</strong>
                    <small>{b.description}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Share a helpful answer and start earning your first badge.</p>
            )}
          </Card>
        </div>
        <Card>
          <form onSubmit={save} className="stack">
            {!!error && <ErrorState error={error} />}
            <SectionTitle
              title="Personal details"
              subtitle="Only your name appears on community contributions by default."
            />
            <div className="form-grid">
              <label>
                Full name
                <input name="name" defaultValue={user.name} required maxLength={120} />
              </label>
              <label>
                Email
                <input value={user.email} readOnly />
              </label>
              {[
                ['college', 'College', user.college],
                ['course', 'Course', user.course],
                ['branch', 'Branch', user.branch],
                ['studyYear', 'Year of study', user.study_year],
                ['graduationYear', 'Graduation year', user.graduation_year],
                ['careerGoal', 'Career goal', user.career_goal],
              ].map(([name, label, value]) => (
                <label key={name}>
                  {label}
                  <input
                    name={name}
                    defaultValue={value || ''}
                    maxLength={name === 'studyYear' ? 20 : name === 'graduationYear' ? 10 : 100}
                  />
                </label>
              ))}
            </div>
            <label>
              Skills
              <textarea
                name="skills"
                rows={3}
                defaultValue={user.skills || ''}
                maxLength={3000}
                placeholder="Java, React, SQL, problem solving…"
              />
            </label>
            <label>
              Projects
              <textarea
                name="projects"
                rows={4}
                defaultValue={user.projects || ''}
                maxLength={10000}
                placeholder="What have you built? Share your role and technologies used."
              />
            </label>
            <div className="privacy-setting">
              <div>
                {publicProfile ? <Eye size={19} /> : <EyeOff size={19} />}
                <span>
                  <strong>Public profile</strong>
                  <small>
                    Allow signed-in members to view your college, skills, projects, and reputation.
                    Email and resumes stay private.
                  </small>
                </span>
              </div>
              <input
                type="checkbox"
                role="switch"
                aria-label="Make profile public"
                checked={publicProfile}
                onChange={(e) => setPublicProfile(e.target.checked)}
              />
            </div>
            <Button disabled={busy} type="submit">
              <Save size={16} />
              {busy ? 'Saving…' : 'Save my profile'}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
