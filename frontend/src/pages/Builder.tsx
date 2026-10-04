import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Save,
  Sparkles,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Check,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, post, download } from '../api/client';
import { useSession } from '../hooks/useSession';
import { Card, PageTitle, AILabel, ErrorState, Loading } from '../components/Common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import {
  readResumeDraft,
  type ResumeSection as Section,
  type ResumeDraft as Draft,
} from '../utils/resumeDraft';
const templates = [
  ['minimal', 'ATS Minimal'],
  ['developer', 'Software Developer'],
  ['fresher', 'Fresher'],
  ['modern', 'Modern'],
  ['academic', 'Academic'],
  ['data', 'Data / AI'],
];
const sectionNames = [
  'Professional Summary',
  'Education',
  'Skills',
  'Experience',
  'Projects',
  'Certifications',
  'Achievements',
  'Leadership',
  'Extracurricular',
];
export function Builder() {
  const { user } = useSession();
  const [params] = useSearchParams(),
    client = useQueryClient();
  const key = 'careerx-draft-' + user.id;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const saved = readResumeDraft(JSON.parse(value));
        if (saved) return saved;
      }
    } catch {}
    return {
      name: user.name,
      contact: user.email,
      template: 'minimal',
      sections: sectionNames.map((title, i) => ({
        id: String(i),
        title,
        content: title === 'Skills' ? user.skills || '' : '',
      })),
    };
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [suggestion, setSuggestion] = useState<{ id: string; text: string } | null>(null),
    [drag, setDrag] = useState<string | null>(null);
  const [importing, setImporting] = useState(!!params.get('resume'));
  const [savedLocally, setSavedLocally] = useState(true);
  const operation = useRef(false);
  useEffect(() => {
    if (importing) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
      setSavedLocally(true);
    } catch {
      setSavedLocally(false);
    }
  }, [draft, key, importing]);
  useEffect(() => {
    const id = params.get('resume');
    let current = true;
    if (id) {
      setImporting(true);
      setError(null);
      api('/resumes/' + id)
        .then((r) => {
          if (!current) return;
          const imported = readResumeDraft(r.document);
          if (imported) setDraft(imported);
          else
            setDraft((d) => ({
              ...d,
              sections: [
                {
                  id: 'imported',
                  title: 'Imported resume',
                  content: typeof r.content === 'string' ? r.content : '',
                },
              ],
            }));
        })
        .catch((e) => {
          if (current) setError(e);
        })
        .finally(() => {
          if (current) setImporting(false);
        });
    } else setImporting(false);
    return () => {
      current = false;
    };
  }, [params]);
  function update(id: string, text: string) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, content: text } : s)),
    }));
  }
  function move(from: number, to: number) {
    if (
      from < 0 ||
      from >= draft.sections.length ||
      to < 0 ||
      to >= draft.sections.length ||
      from === to
    )
      return;
    setDraft((d) => {
      const sections = [...d.sections];
      const [item] = sections.splice(from, 1);
      sections.splice(to, 0, item);
      return { ...d, sections };
    });
  }
  function text() {
    return [
      draft.name,
      draft.contact,
      ...draft.sections
        .filter((s) => s.content.trim())
        .flatMap((s) => [s.title.toUpperCase(), s.content]),
    ].join('\n\n');
  }
  async function save(format?: string) {
    if (operation.current || importing) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!draft.name.trim() || !draft.sections.some((s) => s.content.trim()))
        throw new Error('Add your name and at least one resume section.');
      const result = await post('/resumes/build', {
        name: draft.name + ' — Resume',
        content: text(),
        document: draft,
      });
      client.invalidateQueries({ queryKey: ['resumes'] });
      if (format)
        await download(
          '/resumes/' + result.id + '/export?format=' + format,
          'skillnex-resume.' + format,
        );
      toast.success(format ? 'Resume downloaded.' : 'Resume saved to your library.');
    } catch (e) {
      setError(e);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function improve(s: Section) {
    if (operation.current || importing || !s.content.trim()) return;
    operation.current = true;
    setBusy(true);
    try {
      const result = await post('/resumes/improve', { text: s.content });
      setSuggestion({ id: s.id, text: result.suggestion });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  if (importing)
    return (
      <>
        <PageTitle
          title="Opening your resume"
          description="Loading the saved content into the builder."
        />
        <Loading text="Loading your resume…" />
      </>
    );
  return (
    <>
      <PageTitle
        eyebrow="ALWAYS FREE"
        title="Build a resume that opens doors."
        description="Your experience. Your voice. A little help making it shine."
        action={
          <div className="button-row">
            <Button variant="secondary" onClick={() => save()} disabled={busy}>
              <Save size={15} />
              Save
            </Button>
            <Button onClick={() => save('pdf')} disabled={busy}>
              <Download size={15} />
              Download PDF
            </Button>
          </div>
        }
      />
      {!!error && <ErrorState error={error} />}
      <div className="template-selector">
        {templates.map(([id, name]) => (
          <button
            key={id}
            className={draft.template === id ? 'active' : ''}
            onClick={() => setDraft((d) => ({ ...d, template: id }))}
          >
            <span className={'template-thumb ' + id}>
              <i />
              <i />
              <i />
            </span>
            {name}
            {draft.template === id && <Check size={13} />}
          </button>
        ))}
      </div>
      <div className="builder-grid">
        <div className="stack">
          <Card>
            <h2>Personal information</h2>
            <label>
              Full name
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                maxLength={120}
              />
            </label>
            <label>
              Contact details
              <textarea
                rows={2}
                value={draft.contact}
                onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value }))}
                placeholder="Email · Phone · Location · Portfolio"
              />
            </label>
          </Card>
          {draft.sections.map((section, index) => (
            <Card key={section.id} className="builder-section">
              <div
                draggable
                onDragStart={() => setDrag(section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  move(
                    draft.sections.findIndex((s) => s.id === drag),
                    index,
                  );
                  setDrag(null);
                }}
                className="builder-section-heading"
              >
                <GripVertical size={17} />
                <h3>{section.title}</h3>
                <button
                  className="icon-button"
                  aria-label={'Move ' + section.title + ' up'}
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={'Move ' + section.title + ' down'}
                  onClick={() => move(index, index + 1)}
                  disabled={index === draft.sections.length - 1}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <textarea
                aria-label={section.title}
                rows={section.title === 'Experience' || section.title === 'Projects' ? 5 : 3}
                value={section.content}
                onChange={(e) => update(section.id, e.target.value)}
                maxLength={10000}
                placeholder={'Add your ' + section.title.toLowerCase() + '…'}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={busy || !section.content.trim()}
                onClick={() => improve(section)}
              >
                <Sparkles size={13} />
                Improve wording
              </Button>
            </Card>
          ))}
        </div>
        <div className="preview-column">
          <div className="preview-toolbar">
            <span>
              <i /> LIVE PREVIEW
            </span>
            <span role="status">
              {savedLocally
                ? 'Draft saved on this device'
                : 'Browser storage unavailable — use Save to keep your work'}
            </span>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => save('docx')}>
              <Download size={14} />
              DOCX
            </Button>
          </div>
          <article className={'resume-paper template-' + draft.template}>
            <h1>{draft.name || 'Your name'}</h1>
            <p className="resume-contact">{draft.contact || 'Your contact details'}</p>
            {draft.sections
              .filter((s) => s.content.trim())
              .map((s) => (
                <section key={s.id}>
                  <h2>{s.title}</h2>
                  <p>{s.content}</p>
                </section>
              ))}
            {!draft.sections.some((s) => s.content) && (
              <p className="preview-placeholder">
                Your experience belongs here.
                <br />
                Start adding sections to see your resume come to life.
              </p>
            )}
          </article>
          <p className="preview-note">
            Exports use clean, accessible document formatting. Empty sections are omitted.
          </p>
        </div>
      </div>
      <Dialog
        open={!!suggestion}
        onOpenChange={(open) => !open && setSuggestion(null)}
        title="A sharper way to say it"
        description="Review the wording. Apply only if it accurately represents your experience."
      >
        <AILabel />
        <blockquote className="suggestion-preview">{suggestion?.text}</blockquote>
        <div className="button-row">
          <Button
            onClick={() => {
              if (suggestion) update(suggestion.id, suggestion.text);
              setSuggestion(null);
            }}
          >
            Apply suggestion
            <Check size={15} />
          </Button>
          <Button variant="secondary" onClick={() => setSuggestion(null)}>
            Keep original
          </Button>
        </div>
      </Dialog>
    </>
  );
}
