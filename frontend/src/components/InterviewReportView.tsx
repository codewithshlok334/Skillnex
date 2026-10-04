import { Download, CheckCircle2, Clock, MessageSquare, Mic } from 'lucide-react';
import { Card, ScoreRing, Progress, AILabel } from './Common';
import { Button } from './ui/button';
import type { Data } from '../types';

export function InterviewReportView({ interview }: { interview: Data }) {
  const report = interview.report || {};
  const transcript: Data[] = interview.transcript || [];
  const answered = transcript.filter((t) => t.answer);
  const speechSeconds = answered.reduce((sum, t) => sum + Number(t.speech_seconds || 0), 0);
  const spokenWords = answered.reduce((sum, t) => sum + Number(t.spoken_words || 0), 0);
  const pace =
    speechSeconds >= 10 && spokenWords >= 3
      ? Math.round((spokenWords * 60) / speechSeconds)
      : null;
  const reviews: Data[] = Array.isArray(report.questionReviews) ? report.questionReviews : [];
  const struggled = reviews.filter(
    (r) => r.struggled === true && answered.some((t) => t.id === r.questionId),
  );
  const elapsed = interview.ended_at ? Number(interview.elapsedSeconds) : null;
  const duration =
    elapsed === null
      ? 'Not recorded'
      : Math.floor(elapsed / 60) + ' min ' + (elapsed % 60) + ' sec';
  const list = (key: string): string[] => (Array.isArray(report[key]) ? report[key] : []);
  function exportReport() {
    const text = [
      'SKILLNEX INTERVIEW REPORT',
      'Candidate: ' + (interview.candidateName || 'Candidate'),
      'Role: ' + interview.role,
      'Type: ' + interview.kind,
      'Difficulty: ' + interview.difficulty,
      'Duration: ' + duration,
      'Mode: ' + (report.practice ? 'Guided self-review' : 'AI practice evaluation'),
      '',
      report.summary || '',
      ...(report.breakdown || []).map((b: Data) => b.label + ': ' + b.score + '/100'),
      '',
      'STRENGTHS',
      ...list('strengths'),
      '',
      'AREAS TO IMPROVE',
      ...list('improvements'),
      '',
      'SPEECH METRICS',
      pace === null
        ? 'Not enough voice data.'
        : pace +
          ' approximate transcribed words per microphone minute. Includes pauses; not a confidence assessment.',
      '',
      'TRANSCRIPT',
      ...transcript.flatMap((t, i) => [
        'Question ' +
          (i + 1) +
          (t.phase && t.phase !== 'Legacy'
            ? ' [' + t.phase + (t.turn_kind === 'FOLLOW_UP' ? ' follow-up' : '') + ']'
            : '') +
          ': ' +
          t.question,
        'Answer: ' + (t.answer || 'No answer submitted.'),
        'Feedback: ' +
          (reviews.find((r) => r.questionId === t.id)?.feedback || 'Not assessed.'),
        '',
      ]),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SkillNex-interview-report.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="studio-report stack">
      <Card>
        <div className="section-title">
          <div>
            <span className="pill green">
              <CheckCircle2 size={14} />
              Interview complete
            </span>
            <h2 style={{ marginTop: 16 }}>
              {interview.candidateName || 'Your'} · Interview report
            </h2>
            <p>
              {interview.role} · {interview.kind} · {interview.difficulty}
            </p>
          </div>
          <Button variant="secondary" onClick={exportReport}>
            <Download size={15} />
            Download report
          </Button>
        </div>
        <div className="studio-report-meta">
          <span>
            <Clock size={16} />
            {duration}
          </span>
          <span>
            <MessageSquare size={16} />
            {answered.length} answers saved
          </span>
          <span>
            <Mic size={16} />
            {pace === null ? 'Pace not measured' : pace + ' approx. words/min'}
          </span>
        </div>
        {report.practice ? (
          <p>{report.summary}</p>
        ) : (
          <>
            <AILabel demo={report.demo} />
            <div className="analysis-summary">
              <ScoreRing value={Number(report.score) || 0} />
              <div>
                <h2>Your preparation, in perspective</h2>
                <p>
                  {report.summary ||
                    'Feedback is based on your submitted answers. Use it to plan your next practice session.'}
                </p>
                <small className="muted">
                  Practice estimates, not a hiring decision. Missing categories were not
                  assessed.
                </small>
              </div>
            </div>
            <div className="analysis-breakdown">
              {(report.breakdown || []).map((b: Data) => (
                <div key={b.label}>
                  <div>
                    <span>{b.label}</span>
                    <strong>{Number(b.score) / 10}/10</strong>
                  </div>
                  <Progress value={Number(b.score)} />
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
      <div className="two-column report-grid">
        {(report.practice
          ? [['checklist', 'Self-review checklist']]
          : [
              ['strengths', 'Strengths'],
              ['improvements', 'Areas to improve'],
              ['topics', 'Topics to revisit'],
              ['followUpQuestions', 'Practice next'],
            ]
        ).map(([key, title]) => (
          <Card key={key}>
            <h2>{title}</h2>
            <ul className="advice-list">
              {list(key).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Card>
        <h2>Speaking pace & delivery</h2>
        <p>
          {pace === null
            ? 'There is not enough microphone data to estimate your speaking pace. Typed answers do not receive a pace estimate.'
            : `About ${pace} transcribed words per microphone minute across ${spokenWords} words. Microphone time includes pauses and may differ from actual speaking time.`}
        </p>
        <p className="muted small">
          This is an approximate practice metric. Confidence and emotions cannot be reliably
          inferred from text or camera appearance, so they are not scored. Communication
          feedback evaluates the structure and clarity of submitted answers.
        </p>
      </Card>
      {!report.practice && (
        <Card>
          <h2>Answers to revisit</h2>
          {struggled.length ? (
            struggled.map((r) => (
              <div className="model-answer" key={r.questionId}>
                <h3>{transcript.find((t) => t.id === r.questionId)?.question}</h3>
                <p>{r.feedback}</p>
              </div>
            ))
          ) : (
            <p className="muted">
              {reviews.length
                ? 'No answers were flagged for additional review.'
                : 'Per-question feedback was not recorded for this report.'}
            </p>
          )}
        </Card>
      )}
      <Card>
        <div className="section-title">
          <div>
            <h2>Full interview transcript</h2>
            <p>Your saved questions, answers and feedback.</p>
          </div>
        </div>
        {transcript.map((t, i) => {
          const review = reviews.find((r) => r.questionId === t.id);
          return (
            <details className="transcript-item studio-transcript" key={t.id} open={i === 0}>
              <summary>
                <span>
                  Q{i + 1} · {t.question}
                </span>
                {review && <strong>{review.score}/100</strong>}
              </summary>
              <p className="pre-wrap">{t.answer || 'No answer submitted.'}</p>
              {review && (
                <div className="studio-answer-review">
                  <strong>Feedback</strong>
                  <p>{review.feedback}</p>
                </div>
              )}
            </details>
          );
        })}
      </Card>
      {!!report.modelAnswers?.length && (
        <Card>
          <h2>Suggested answer structure</h2>
          <p className="muted small">
            Adapt these examples to your real experience. Do not add facts you cannot support.
          </p>
          {report.modelAnswers.map((a: Data, i: number) => (
            <div className="model-answer" key={i}>
              <h3>{a.question}</h3>
              <p className="pre-wrap">{a.answer}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
