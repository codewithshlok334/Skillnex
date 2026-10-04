import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Linkedin, ShieldCheck, Upload, Sparkles, ArrowUpRight, Trash2, Unplug, Copy, Check, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { api, post } from '../api/client';
import { Card, PageTitle, ErrorState, Loading, AILabel } from '../components/Common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { normalizeLinkedInProfileUrl } from '../utils/linkedinProfileUrl';
import '../linkedin.css';

type Connection = { configured: boolean; connected: boolean; analysisProvider: string; profile: null | { display_name: string; connected_at: string } };
type Review = {
  sourceType?: 'resume' | 'profile_text'; sourceName?: string;
  summary: string;
  sections: { name: string; status: 'provided' | 'not_provided'; evidence: string; feedback: string; suggestedText: string }[];
  keywordsToConsider: string[]; actionPlan: string[];
};
type Result = { id?: string; report: Review; profileUrl: string; targetRole: string; saved: boolean };
type Saved = { id: string; profile_url: string; target_role: string; created_at: string };
type Resume = { id: string; name: string; created_at: string };

export function LinkedIn() {
  const cache = useQueryClient();
  const connection = useQuery({ queryKey: ['linkedin-connection'], queryFn: () => api<Connection>('/linkedin/status') });
  const reports = useQuery({ queryKey: ['linkedin-reports'], queryFn: () => api<Saved[]>('/linkedin/reports') });
  const resumes = useQuery({ queryKey: ['resumes'], queryFn: () => api<Resume[]>('/resumes') });
  const [params, setParams] = useSearchParams();
  const callback = params.get('connection');
  const [notice, setNotice] = useState('');
  const [profileUrl, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [targetRole, setRole] = useState('');
  const [content, setContent] = useState('');
  const [selectedResume, setSelectedResume] = useState('');
  const [resumeSource, setResumeSource] = useState<{ id: string; name: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [saveReport, setSaveReport] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsHint, setDetailsHint] = useState(false);
  const [connectionConsent, setConnectionConsent] = useState(false);
  const [modal, setModal] = useState<'connect' | 'disconnect' | 'clear' | Saved | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<unknown>();
  const file = useRef<HTMLInputElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const roleInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const actionPending = useRef(false);

  useEffect(() => {
    if (!callback) return;
    setNotice(callback === 'connected' ? 'LinkedIn connected. Basic profile imported; add your professional profile content below for analysis.' :
      callback === 'cancelled' ? 'LinkedIn connection was cancelled. You can still use a PDF or pasted text.' :
      'LinkedIn could not connect. Use the same signed-in browser and try again, or continue with profile text.');
    void cache.invalidateQueries({ queryKey: ['linkedin-connection'] });
    setParams({}, { replace: true });
  }, [callback, cache, setParams]);

  function edit(action: () => void) { action(); setConsent(false); }
  async function run(label: string, action: () => Promise<void>) {
    if (actionPending.current) return;
    actionPending.current = true; setBusy(label); setError(undefined); setNotice('');
    try { await action(); } catch (err) { setError(err); }
    finally { actionPending.current = false; setBusy(''); }
  }
  async function extract(selected: File) {
    if (selected.size > 5 * 1024 * 1024 || !selected.name.toLowerCase().endsWith('.pdf')) {
      setError(new Error('Choose a PDF smaller than 5 MB.')); return;
    }
    await run('Reading your PDF…', async () => {
      const data = new FormData(); data.append('file', selected);
      const extracted = await api<{ text: string }>('/linkedin/extract', { method: 'POST', body: data });
      setContent(extracted.text); setConsent(false); setResumeSource(null); setSelectedResume('');
      setNotice('PDF text is ready to review. Nothing has been sent to AI. Remove anything you do not want analysed.');
    });
  }
  async function loadResume() {
    if (!selectedResume) return;
    await run('Loading your resume preview…', async () => {
      const preview = await api<{ id: string; name: string; text: string }>('/linkedin/resume-preview/' + selectedResume);
      setContent(preview.text); setResumeSource({ id: preview.id, name: preview.name });
      setConsent(false); setDetailsOpen(true); setDetailsHint(false);
      setNotice('Your saved resume is ready to review. Nothing has been sent to AI. Edit the preview and remove private details before continuing.');
      requestAnimationFrame(() => roleInput.current?.focus());
    });
  }
  async function analyse(event: React.FormEvent) {
    event.preventDefault();
    const normalizedUrl = profileUrl.trim() ? normalizeLinkedInProfileUrl(profileUrl) : '';
    if (normalizedUrl === null || (!normalizedUrl && !resumeSource)) {
      setUrlError('Enter a profile link like linkedin.com/in/your-name. No https:// needed.');
      urlInput.current?.focus();
      return;
    }
    setUrlError(''); setUrl(normalizedUrl);
    if (!detailsOpen) {
      setDetailsOpen(true); setDetailsHint(true);
      requestAnimationFrame(() => roleInput.current?.focus());
      return;
    }
    if (!consent || content.trim().length < 80) return;
    await run(resumeSource ? 'Writing LinkedIn suggestions from your resume…' : 'Reviewing your profile…', async () => {
      const reviewed = await post<Result>('/linkedin/analyze', { profileUrl: normalizedUrl, targetRole, content, consent, saveReport, resumeId: resumeSource?.id });
      setResult(reviewed);
      if (reviewed.saved) await cache.invalidateQueries({ queryKey: ['linkedin-reports'] });
      requestAnimationFrame(() => resultHeading.current?.focus());
    });
  }
  async function confirm() {
    const selected = modal;
    await run(selected === 'connect' ? 'Opening LinkedIn…' : 'Updating your data…', async () => {
      if (selected === 'connect') {
        if (!connectionConsent) return;
        const response = await post<{ authorizationUrl: string }>('/linkedin/connect', { consent: true });
        const url = new URL(response.authorizationUrl);
        if (url.origin !== 'https://www.linkedin.com' || url.pathname !== '/oauth/v2/authorization') throw new Error('Invalid LinkedIn connection URL.');
        window.location.assign(url.href); return;
      }
      if (selected === 'disconnect') {
        await api('/linkedin/connection', { method: 'DELETE' });
        await cache.invalidateQueries({ queryKey: ['linkedin-connection'] });
        setNotice('LinkedIn snapshot removed from SkillNex. To also withdraw LinkedIn authorisation, remove SkillNex from your LinkedIn permitted services.');
      } else if (selected === 'clear') {
        setResumeSource(null); setSelectedResume('');
        setDetailsOpen(false); setDetailsHint(false); setUrlError('');
        setContent(''); setUrl(''); setRole(''); setConsent(false); setSaveReport(false); setResult(null); setNotice('Draft and on-screen review cleared. Saved reports are separate.');
      } else if (selected && typeof selected === 'object') {
        await api('/linkedin/reports/' + selected.id, { method: 'DELETE' });
        if (result?.id === selected.id) setResult(null);
        await cache.invalidateQueries({ queryKey: ['linkedin-reports'] });
        toast.success('Saved report deleted.');
      }
      setModal(null);
    });
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success('Suggestion copied.'); }
    catch { toast.error('Could not copy. Select the suggestion and copy it manually.'); }
  }

  return <div className="linkedin-page">
    <PageTitle eyebrow="YOUR PROFESSIONAL STORY" title="Make your LinkedIn profile work harder."
      description="Turn your saved resume into LinkedIn headlines, an About draft and practical next steps." />
    {notice && <div className="li-notice" role="status"><ShieldCheck size={19} /><p>{notice}</p></div>}
    {error ? <ErrorState error={error} /> : null}
    {connection.error ? <ErrorState error={connection.error} retry={() => connection.refetch()} /> : null}
    <div className="li-layout">
      <div className="li-main">
        {(connection.data?.configured || connection.data?.connected) && <Card className="li-connection li-secondary-connection">
          <details>
          <summary>LinkedIn connection <span className="muted">Optional · Basic profile only</span></summary>
          <div className="li-connection-content">
          <div className="li-card-heading"><span className="li-icon"><Linkedin size={23} /></span><div><h2>Connect your LinkedIn</h2><p className="muted">Optional · Basic profile only</p></div></div>
          {connection.isLoading ? <p role="status">Checking connection…</p> : connection.error ? <ErrorState error={connection.error} retry={() => connection.refetch()} /> : <>
            {connection.data?.connected ? <div className="li-connected"><Check size={18} /><div><strong>{connection.data.profile?.display_name}</strong><p className="muted">Connected on {new Date(connection.data.profile!.connected_at).toLocaleDateString()}</p></div>
              <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => setModal('disconnect')}><Unplug size={15} />Disconnect</Button></div> :
              <p>Sign in on LinkedIn itself. SkillNex never asks for your LinkedIn password. This connection imports your name, not your full work history.</p>}
            {!connection.data?.configured && <p className="li-setup-note">LinkedIn connection is being set up. You can analyse your profile now using a PDF or pasted text below.</p>}
            {!connection.data?.connected && <Button variant="secondary" disabled={!!busy || !connection.data?.configured} onClick={() => { setConnectionConsent(false); setModal('connect'); }}><Linkedin size={17} />Connect with LinkedIn<ArrowUpRight size={16} /></Button>}
          </>}
          </div>
          </details>
        </Card>}
        <Card>
          <form onSubmit={analyse} className="li-form">
            <div className="li-card-heading"><span className="li-icon"><Linkedin size={23} /></span><div><h2>Build your LinkedIn from your resume</h2><p className="muted">Use a resume you already saved in SkillNex. No LinkedIn connection needed.</p></div></div>
            {resumes.isLoading ? <p role="status">Loading your saved resumes…</p> : resumes.error ? <ErrorState error={resumes.error} retry={() => resumes.refetch()} /> : resumes.data?.length ? <>
              <label htmlFor="li-resume">Choose your saved resume<select id="li-resume" value={selectedResume} disabled={!!busy} onChange={e => { setSelectedResume(e.target.value); setConsent(false); }}><option value="">Select a resume</option>{resumes.data.map(resume => <option key={resume.id} value={resume.id}>{resume.name} · {new Date(resume.created_at).toLocaleDateString()}</option>)}</select></label>
              <Button type="button" className="li-start-analysis" disabled={!!busy || !selectedResume} onClick={() => void loadResume()}><FileText size={17} />Use selected resume</Button>
            </> : <div className="li-setup-note"><p>No saved resumes yet. Upload or build one in SkillNex, then come back here.</p><Link className="text-link" to="/app/resumes">Go to my resumes<ArrowUpRight size={16} /></Link></div>}
            <p className="small muted li-link-note">Suggestions use the resume preview you approve. Your LinkedIn profile is not fetched or changed.</p>
            <button type="button" className="li-details-toggle" aria-expanded={detailsOpen} aria-controls="li-profile-details" disabled={!!busy} onClick={() => setDetailsOpen(open => !open)}><span>{detailsOpen ? 'Hide preview and options' : resumeSource ? 'Show resume preview' : 'Or add LinkedIn profile text / PDF'}</span><span aria-hidden="true">{detailsOpen ? '−' : '+'}</span></button>
            {detailsOpen && <div id="li-profile-details" className="li-form">
            {resumeSource ? <div className="li-source-note"><FileText size={19} /><div><strong>Source: Resume · {resumeSource.name}</strong><p className="small muted">Edit this preview freely. Changes here do not change your saved resume.</p></div></div> : detailsHint && <p className="li-setup-note" role="status">Add profile text or a PDF for review. No LinkedIn profile has been fetched.</p>}
            <label htmlFor="li-role">Target role<input ref={roleInput} id="li-role" required maxLength={160} value={targetRole} disabled={!!busy} onChange={e => edit(() => setRole(e.target.value))} placeholder="e.g. Full Stack Developer" /></label>
            <label htmlFor="li-url">LinkedIn profile link {resumeSource && '(optional)'}<input ref={urlInput} id="li-url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} required={!resumeSource} maxLength={500} value={profileUrl} aria-invalid={!!urlError} aria-describedby={urlError ? 'li-url-error li-url-help' : 'li-url-help'} disabled={!!busy} onChange={e => { setUrlError(''); edit(() => setUrl(e.target.value)); }} onBlur={() => { const normalized = normalizeLinkedInProfileUrl(profileUrl); if (normalized) setUrl(normalized); }} placeholder="linkedin.com/in/your-name" /></label>
            <p id="li-url-help" className="small muted li-link-note">For your reference only. No https:// needed; this link is not sent to AI.</p>
            {urlError && <p id="li-url-error" role="alert">{urlError}</p>}
            {!resumeSource && <>
            <div className="li-upload-row"><input ref={file} className="sr-only" type="file" accept=".pdf,application/pdf" aria-label="Upload LinkedIn profile PDF" disabled={!!busy} onChange={e => { const selected=e.target.files?.[0]; if (selected) void extract(selected); e.target.value=''; }} />
              <Button type="button" variant="secondary" disabled={!!busy} onClick={() => file.current?.click()}><Upload size={16} />Import profile PDF</Button><span className="muted">Up to 5 MB · text-based PDF</span></div>
            <p className="small muted">Importing a PDF replaces the text below. The file is read on the server for preview, not saved or sent to AI.</p>
            </>}
            <label htmlFor="li-content">{resumeSource ? 'Review your resume preview' : 'Review your profile text'}<textarea id="li-content" required minLength={80} maxLength={60000} rows={6} value={content} disabled={!!busy} onChange={e => edit(() => setContent(e.target.value))} placeholder="Paste your headline, About, experience and skills here, or import a profile PDF above." /></label>
            <div className="li-text-meta"><span>{content.length.toLocaleString()} / 60,000 characters</span><span>At least 80 characters</span></div>
            <div className="li-consent">
              <div className="li-card-heading"><ShieldCheck size={19} /><h3>You choose what to share</h3></div>
              <p>Only the text above and your target role are sent to {connection.data?.analysisProvider || 'the configured AI provider'}. Remove contact details or anything private first. LinkedIn connection data and your profile URL are not sent.</p>
              <label className="li-check"><input type="checkbox" checked={consent} disabled={!!busy} onChange={e => setConsent(e.target.checked)} /><span>I have the right to use this content and agree to send this preview and target role to the AI provider for analysis.</span></label>
              <label className="li-check"><input type="checkbox" checked={saveReport} disabled={!!busy} onChange={e => setSaveReport(e.target.checked)} /><span>Save the report privately to my SkillNex account. It includes excerpts and suggestions; I can delete it later.</span></label>
              <p className="small muted">Saving this report is optional. We do not store another copy of this preview. Your existing saved resume stays in your account. The AI provider processes submitted text under its own data policies.</p>
            </div>
            <div className="li-actions"><Button type="submit" disabled={!!busy || !connection.data || !consent || content.trim().length < 80 || !targetRole.trim() || (!resumeSource && !profileUrl.trim()) || (!!resumeSource && selectedResume !== resumeSource.id)}><Sparkles size={17} />{resumeSource ? 'Generate LinkedIn suggestions' : 'Analyse profile text'}</Button>
              <Button type="button" variant="ghost" disabled={!!busy || (!content && !profileUrl && !result)} onClick={() => setModal('clear')}>Clear draft</Button></div>
            {resumeSource && selectedResume !== resumeSource.id && <p className="small muted" role="status">Press “Use selected resume” to load your new selection before generating suggestions.</p>}
            </div>}
          </form>
        </Card>
      </div>
      <aside className="li-sidebar">
        <Card><div className="li-card-heading"><ShieldCheck size={20} /><h2>Private by default</h2></div><ul className="li-privacy-list"><li>No LinkedIn passwords collected.</li><li>No access to your messages or contacts.</li><li>No automatic publishing or profile edits.</li><li>Only save a report if you choose to.</li></ul><p className="small muted">LinkedIn sign-in does not grant full profile access. This review uses the content you supply; sections absent from an export are marked “Not provided”.</p></Card>
        <Card><div className="li-card-heading"><FileText size={20} /><h2>Saved reviews</h2></div>
          {reports.isLoading ? <p role="status">Loading saved reviews…</p> : reports.error ? <ErrorState error={reports.error} retry={() => reports.refetch()} /> : !reports.data?.length ? <p className="muted">No saved reviews yet. Your review can stay on this page without being saved.</p> : <>
            <p className="small muted">Your latest 100 reviews. Visible only to your account.</p>
            <ul className="li-saved-list">{reports.data.map(report => <li key={report.id}><button disabled={!!busy} onClick={() => void run('Opening report…', async () => { setResult(await api<Result>('/linkedin/reports/' + report.id)); requestAnimationFrame(() => resultHeading.current?.focus()); })}><strong>{report.target_role}</strong><span>{new Date(report.created_at).toLocaleDateString()}</span></button><Button variant="ghost" size="icon" aria-label={'Delete review for ' + report.target_role} disabled={!!busy} onClick={() => setModal(report)}><Trash2 size={16} /></Button></li>)}</ul>
          </>}
        </Card>
      </aside>
    </div>
    {busy && <Loading text={busy} />}
    {result && <section className="li-result" aria-label="LinkedIn analysis report">
      <div className="li-report-header"><div><div className="eyebrow">{result.report.sourceType === 'resume' ? 'LINKEDIN DRAFTS FROM YOUR RESUME' : 'YOUR PROFILE TEXT REVIEW'}</div><h2 ref={resultHeading} tabIndex={-1}>{result.targetRole}</h2><p>{result.saved ? 'Saved privately to your account' : 'Not saved · This review disappears when you leave this page'}</p></div>{result.profileUrl && <a href={result.profileUrl} target="_blank" rel="noopener noreferrer" className="text-link">Open profile<ArrowUpRight size={16} /></a>}</div>
      <Card><AILabel />{result.report.sourceType === 'resume' && <p className="li-setup-note"><strong>Source: Resume · {result.report.sourceName}</strong><br />Based on your approved resume preview. Your actual LinkedIn profile was not fetched or evaluated.</p>}<p className="li-summary">{result.report.summary}</p><p className="small muted">Based only on the supplied content. This is not a LinkedIn rating or a prediction of recruiter interest.</p></Card>
      <div className="li-review-grid">{result.report.sections.map(section => <Card key={section.name}><div className="li-card-heading"><h3>{section.name}</h3><span className={'li-status ' + (section.status === 'provided' ? 'provided' : '')}>{section.status === 'provided' ? result.report.sourceType === 'resume' ? 'Resume evidence' : 'Reviewed' : 'Not provided'}</span></div>
        {section.evidence && <blockquote>{section.evidence}</blockquote>}<p>{section.feedback}</p>{section.suggestedText && <div className="li-suggestion"><div className="li-card-heading"><strong>Suggested wording</strong><Button variant="ghost" size="sm" onClick={() => void copy(section.suggestedText)} aria-label={'Copy ' + section.name + ' suggestion'}><Copy size={15} />Copy</Button></div><p>{section.suggestedText}</p><small>Check every detail before adding this to LinkedIn.</small></div>}</Card>)}</div>
      <Card><h3>Your next steps</h3><ol className="li-action-list">{result.report.actionPlan.map((action,i) => <li key={i}>{action}</li>)}</ol>{result.report.keywordsToConsider.length > 0 && <><h3>Role keywords to consider</h3><p className="small muted">Use only the keywords supported by your actual skills and experience.</p><div className="li-keywords">{result.report.keywordsToConsider.map((word,i) => <span key={i}>{word}</span>)}</div></>}</Card>
    </section>}
    <Dialog open={modal !== null} onOpenChange={open => { if (!open && !busy) setModal(null); }} title={modal === 'connect' ? 'Connect securely with LinkedIn' : modal === 'disconnect' ? 'Disconnect LinkedIn?' : modal === 'clear' ? 'Clear this draft?' : 'Delete this saved report?'}>
      {modal === 'connect' ? <><p>You will leave SkillNex to sign in on LinkedIn. With your permission, we retain your LinkedIn name and account identifier. Access tokens are used once on the server and are not stored.</p><p>This does not import About, experience or skills. Analysis has a separate approval step.</p>{content && <p>Your unsaved draft will be cleared when you leave. Copy it somewhere safe first.</p>}<label className="li-check"><input type="checkbox" checked={connectionConsent} onChange={e => setConnectionConsent(e.target.checked)} /><span>I agree to import and retain my basic LinkedIn profile in SkillNex.</span></label></> : modal === 'disconnect' ? <p>Removes the imported name and account identifier from SkillNex and cancels pending connection attempts. Saved reports remain until you delete them. You can also remove SkillNex in LinkedIn’s permitted services to withdraw its authorisation.</p> : modal === 'clear' ? <p>Clears the profile link, role, text and on-screen review from this page. Saved reports remain in your account.</p> : <p>This permanently deletes this report and its excerpts from your SkillNex account. It does not change your LinkedIn profile.</p>}
      <div className="li-actions"><Button variant="secondary" disabled={!!busy} onClick={() => setModal(null)}>Cancel</Button><Button variant={modal === 'connect' ? 'default' : 'danger'} disabled={!!busy || (modal === 'connect' && !connectionConsent)} onClick={() => void confirm()}>{modal === 'connect' ? 'Continue to LinkedIn' : modal === 'disconnect' ? 'Disconnect' : modal === 'clear' ? 'Clear draft' : 'Delete report'}</Button></div>
    </Dialog>
  </div>;
}
