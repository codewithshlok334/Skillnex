import { ArrowRight, CheckCircle2, MessageSquare, ShieldCheck, UserRound } from 'lucide-react';
import type { PeerReport } from '../utils/peerCall';

/** Reviews are shown after the room ends; a missing score is never shown as zero. */
export function PeerReview({ report, userId }: { report: PeerReport; userId: string }) {
  if (report.version !== 2) return <div className="pp-report">
    <p className="pp-report-summary">{report.summary}</p><p>{report.coverage}</p>
    <p className="pp-report-coverage">This is your earlier personal review. Refresh the review to analyse both participants using shared conversation entries.</p>
    <h3>What went well</h3><ul>{report.strengths.map((text, i) => <li key={i}>{text}</li>)}</ul>
    <h3>Mistakes & better approaches</h3>{report.mistakes.map((item, i) => <article className="pp-mistake" key={i}><blockquote>{item.quote}</blockquote><h4>{item.issue}</h4><p>{item.improvement}</p></article>)}
    <h3>Next steps</h3><ol>{report.nextSteps.map((text, i) => <li key={i}>{text}</li>)}</ol>
  </div>;
  return <div className="pp-dual-review">
    <div className="pp-review-overview"><p>{report.summary}</p><div className="pp-report-coverage"><ShieldCheck size={18} /><div>{report.coverage}<small>{report.reviewedEntries} of {report.totalEntries} shared entries reviewed. Points reflect saved answer content, not voice, video or a hiring decision.</small></div></div></div>
    <div className="pp-participant-reviews">{report.participants.map(person => <article className="pp-report pp-person-report" key={person.userId} aria-label={`${person.name}'s interview review`}>
      <header className="pp-person-review-header"><span className="pp-report-avatar"><UserRound size={22} /></span><div><h3>{person.name}{person.userId === userId && <small>YOU</small>}</h3><p>{person.roles.length ? person.roles.join(' · ') : 'Participant'}</p></div><div className="pp-score"><strong>{person.overallScore === null ? '—' : person.overallScore}</strong><span>{person.overallScore === null ? 'Not scored' : '/ 100 points'}</span></div></header>
      <p className="pp-evidence-note">{person.coverage} <span>{person.evidenceEntries} shared {person.evidenceEntries === 1 ? 'entry' : 'entries'}.</span></p>
      {person.criteria.length > 0 && <div className="pp-criteria">{person.criteria.map(criterion => <div className="pp-criterion" key={criterion.key}><div><strong>{criterion.label}</strong><span>{criterion.score === null ? 'Not enough evidence' : `${criterion.score}/100`}</span></div>{criterion.score !== null && <meter min={0} max={100} value={criterion.score} aria-label={`${person.name}: ${criterion.label}`} />}<p>{criterion.reason}</p></div>)}</div>}
      <section><h3><CheckCircle2 size={17} /> Strong points</h3>{person.strengths.length ? <ul>{person.strengths.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p className="pp-evidence-note">More saved answers are needed to identify specific strengths.</p>}</section>
      <section><h3><MessageSquare size={17} /> Mistakes & corrections</h3>{person.mistakes.length ? person.mistakes.map((item, i) => <article className="pp-mistake" key={i}><blockquote>“{item.quote}”</blockquote><h4>{item.issue}</h4><p>{item.improvement}</p><a href={`#peer-note-${item.noteId}`}>View saved answer</a></article>) : <p className="pp-evidence-note">No specific mistake was supported by the saved answers.</p>}</section>
      {person.improvements.length > 0 && <section><h3>What to improve</h3><ul>{person.improvements.map((text, i) => <li key={i}>{text}</li>)}</ul></section>}
      <section><h3><ArrowRight size={17} /> Next practice steps</h3><ol>{person.nextSteps.map((text, i) => <li key={i}>{text}</li>)}</ol></section>
    </article>)}</div>
  </div>;
}
