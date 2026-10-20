import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Copy, Video, VideoOff, Mic, MicOff, Users, Plus, Link as LinkIcon, ShieldCheck, Clock3, PhoneOff, RefreshCw, ArrowLeftRight, FileText, Sparkles, Volume2, Trash2, CheckCircle2, MessageSquare, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { api, post } from '../api/client';
import { useSession } from '../hooks/useSession';
import { initials } from '../utils/cn';
import { PeerCall, initialCall, type CallState, type PeerRoomData, type PeerParticipant, type PeerConfig, type PeerReport } from '../utils/peerCall';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { ErrorState, Loading } from '../components/Common';
import '../peer-practice.css';

const roomId = (text: string) => {
  try { const u = new URL(text); text = u.searchParams.get('join') || u.searchParams.get('room') || ''; } catch {}
  return /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(text.trim()) ? text.trim() : null;
};
const elapsed = (ms: number) => `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;

function Portrait({ person, stream, camera, mic, self, label }: { person?: Pick<PeerParticipant,'name'|'photo_url'>; stream?: MediaStream | null; camera?: boolean; mic?: boolean; self?: boolean; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const el = video.current; if (!el) return;
    el.srcObject = stream || null;
    if (stream) void el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    return () => { el.srcObject = null; };
  }, [stream]);
  return <div className={`pp-person ${self ? 'pp-self' : ''} ${!person ? 'pp-person-empty' : ''}`}>
    <video ref={video} autoPlay playsInline muted={self} className={camera && stream ? 'is-visible' : ''} aria-label={self ? 'Your camera preview' : 'Partner video'} />
    {!(camera && stream) && <div className="pp-profile-fallback"><span className="pp-profile-orbit" /><span className="pp-profile-orbit pp-orbit-two" /><div className="pp-profile-photo">{person?.photo_url ? <img src={person.photo_url} alt={person.name} /> : person ? initials(person.name) : <Users size={34} />}</div><strong>{person?.name || 'Your partner’s place'}</strong><small>{person ? 'Camera is off' : 'A good conversation starts with two.'}</small></div>}
    <span className="pp-role-label">{label}</span>
    <div className="pp-person-name"><span>{person ? `${person.name}${self ? ' (you)' : ''}` : 'Waiting for a partner'}</span>{mic ? <Mic size={15} /> : <MicOff size={15} />}</div>
    {blocked && !self && stream && mic && <button className="pp-enable-audio" onClick={() => void video.current?.play().then(() => setBlocked(false)).catch(() => toast.error('Your browser is blocking playback. Check its sound settings.'))}><Volume2 size={16} /> Hear your partner</button>}
  </div>;
}

export function PeerPractice() {
  const { user } = useSession(); const [params, setParams] = useSearchParams();
  const selected = roomId(params.get('room') || '');
  const [invite, setInvite] = useState(params.get('join') || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const [title, setTitle] = useState(''); const [details, setDetails] = useState(false);
  const history = useQuery({ queryKey: ['peer-rooms'], queryFn: () => api<PeerRoomData[]>('/peer/rooms'), enabled: !selected });
  useEffect(() => { if (params.get('join')) setInvite(params.get('join')!); }, [params]);
  async function enter(create: boolean) {
    if (busy) return; setError(null);
    const id = roomId(invite);
    if (!create && !id) { setError(new Error('Paste the room invite link or the full room code.')); return; }
    setBusy(true);
    try {
      const room = await post<PeerRoomData>(create ? '/peer/rooms' : `/peer/rooms/${id}/join`, create ? { title } : undefined);
      setParams({ room: room.id });
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  if (selected) return <PeerRoom key={selected} id={selected} leave={() => { setParams({}); void history.refetch(); }} />;
  return <div className="pp-page">
    <header className="pp-intro"><span className="pp-eyebrow"><span className="pp-live-dot" /> PEER PRACTICE</span><h1>A real conversation.<br /><em>A little more confidence.</em></h1><p>Meet a friend. Take turns interviewing. Leave with a clearer idea of what to work on.</p></header>
    <div className="pp-lobby">
      <section className="pp-join-panel" aria-labelledby="pp-meet-title"><span className="pp-mini-label">YOUR NEXT INTERVIEW STARTS HERE</span><h2 id="pp-meet-title">Make room for practice.</h2><p>No topic to pick. No complicated setup.<br />Just you, your partner, and a fresh start.</p>
        {!!error && <ErrorState error={error} />}
        <Button className="pp-create" disabled={busy} onClick={() => enter(true)}><Plus size={18} />{busy ? 'Opening room…' : 'Create a room'}<ArrowRight size={18} /></Button>
        <button className="pp-detail-toggle" onClick={() => setDetails(!details)} aria-expanded={details}>Add a session title <span>optional</span><ChevronDown size={14} /></button>
        {details && <input aria-label="Session title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Placement practice with a friend" maxLength={120} />}
        <div className="pp-divider"><span>HAVE AN INVITE?</span></div>
        <form onSubmit={e => { e.preventDefault(); void enter(false); }}><label htmlFor="pp-invite">Room link or code</label><div className="pp-join-input"><LinkIcon size={17} /><input id="pp-invite" value={invite} onChange={e => setInvite(e.target.value)} placeholder="Paste your invite here" required /><button type="submit" disabled={busy}>Join <ArrowRight size={16} /></button></div></form>
        <p className="pp-privacy-line"><ShieldCheck size={15} /> Private room · Two people · Camera optional</p>
      </section>
      <section className="pp-preview" aria-label="Preview of your interview room"><div className="pp-preview-top"><span><Video size={16} /> Your practice room</span><span className="pp-preview-pill">READY WHEN YOU ARE</span></div><div className="pp-preview-people"><Portrait person={{ name: user.name, photo_url: user.photo_url }} self label="YOU" /><Portrait label="YOUR PARTNER" /></div><div className="pp-preview-controls" aria-hidden="true"><span><MicOff size={19} /></span><span><VideoOff size={19} /></span><span className="pp-hangup"><PhoneOff size={19} /></span></div><div className="pp-preview-note"><span className="pp-note-icon"><Sparkles size={19} /></span><div><strong>The conversation first. The insights after.</strong><p>Save your transcript or notes for a review when the interview ends.</p></div></div></section>
    </div>
    <div className="pp-how"><span><b>01</b> Create & share a link</span><span><b>02</b> Meet. Ask. Switch roles.</span><span><b>03</b> Reflect on your answers</span></div>
    <section className="pp-history"><div className="pp-section-title"><h2>Your recent sessions</h2><span>Pick up where you left off</span></div>{history.isLoading ? <Loading /> : history.error ? <ErrorState error={history.error} retry={() => history.refetch()} /> : history.data?.length ? <div className="pp-history-list">{history.data.map(r => <button key={r.id} onClick={() => setParams({ room: r.id })}><span className="pp-history-icon"><Video size={19} /></span><span><strong>{r.title}</strong><small>{new Date(r.created_ms).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</small></span><em>{r.status === 'COMPLETED' ? 'View review' : r.expires_ms < Date.now() ? 'Expired' : 'Open room'}</em><ArrowRight size={16} /></button>)}</div> : <div className="pp-history-empty"><Clock3 size={19} /><p>Your sessions will live here. Start with one conversation.</p></div>}</section>
  </div>;
}

function PeerRoom({ id, leave }: { id: string; leave: () => void }) {
  const { user } = useSession(); const client = useQueryClient();
  const config = useQuery({ queryKey: ['peer-config'], queryFn: () => api<PeerConfig>('/peer/config'), staleTime: 10 * 60 * 1000 });
  const q = useQuery({ queryKey: ['peer-room', id], queryFn: () => api<PeerRoomData>(`/peer/rooms/${id}`) });
  const [room, setRoom] = useState<PeerRoomData>(); const [call, setCall] = useState<CallState>(initialCall);
  const engine = useRef<PeerCall | undefined>(undefined); const revision = useRef(-1); const wasActive = useRef(false); const autoReviewed = useRef(false);
  const observedCompletion = useRef(false);
  const [now, setNow] = useState(Date.now()); const [busy, setBusy] = useState(''); const [confirmEnd, setConfirmEnd] = useState(false);
  const [tab, setTab] = useState<'notes'|'guide'>('guide'); const [note, setNote] = useState('');
  const [report, setReport] = useState<PeerReport | null>(null); const [analysisError, setAnalysisError] = useState<unknown>(null); const analysisPending = useRef(false);
  const [strengths, setStrengths] = useState(''); const [improvements, setImprovements] = useState(''); const [clarity, setClarity] = useState(3);
  const initialStatus = q.data?.status; const ready = !!q.data && !!config.data;
  const completed = room?.status === 'COMPLETED';
  useEffect(() => { if (q.data) { setRoom(q.data); setReport(q.data.report || null); revision.current = q.data.content_revision; } }, [q.data]);
  useEffect(() => {
    if (!ready || initialStatus === 'COMPLETED' || !config.data) return;
    const instance = new PeerCall(id, user.id, config.data, update => {
      if (update.status === 'ACTIVE') wasActive.current = true;
      setRoom(old => ({ ...old, ...update }));
      if (update.content_revision !== revision.current || (update.status === 'COMPLETED' && !observedCompletion.current)) {
        revision.current = update.content_revision; void q.refetch();
      }
      if (update.status === 'COMPLETED') observedCompletion.current = true;
    }, setCall);
    engine.current = instance; void instance.start();
    return () => { instance.destroy(); if (engine.current === instance) engine.current = undefined; };
  }, [ready, id, user.id]);
  useEffect(() => { const t=setInterval(()=>setNow(Date.now()),1000); return()=>clearInterval(t); }, []);
  // End-of-session reviews only. Late transcript chunks invalidate the previous result on the server.
  useEffect(() => {
    if (!completed || !wasActive.current || autoReviewed.current || busy || call.pending || call.transcriptError || !config.data?.analysisAvailable || report) return;
    const own = room?.notes?.filter(n => n.user_id === user.id).map(n=>n.content).join('') || '';
    if (own.length >= 80) { autoReviewed.current = true; void analyse(); }
  }, [completed, call.pending, room?.notes, report, busy]);
  useEffect(() => { if (!completed) return; const t=setInterval(()=>void q.refetch(),5000); return()=>clearInterval(t); }, [completed]);

  async function refresh() { await q.refetch(); void client.invalidateQueries({ queryKey: ['peer-rooms'] }); }
  async function action(action: 'start'|'swap'|'end') {
    if (!room || busy) return; setBusy(action);
    try {
      const result = await post<PeerRoomData>(`/peer/rooms/${id}/action`, { action, revision: room.revision });
      setRoom(result); setConfirmEnd(false);
      if (action === 'end') await engine.current?.finish();
      await refresh();
    } catch (e) { toast.error((e as Error).message); await q.refetch(); } finally { setBusy(''); }
  }
  async function copy() {
    const link = `${window.location.origin}/app/peer-practice?join=${id}`;
    try { await navigator.clipboard.writeText(link); toast.success('Invite link copied. Send it to your partner.'); }
    catch { toast.error('Copy the room link from the invite field.'); }
  }
  async function saveNote(e: React.FormEvent) {
    e.preventDefault(); if (!note.trim() || busy) return; setBusy('note');
    try { await post(`/peer/rooms/${id}/notes`, { id: crypto.randomUUID(), text: note.trim() }); setNote(''); await refresh(); toast.success('Private note saved.'); }
    catch(e) { toast.error((e as Error).message); } finally { setBusy(''); }
  }
  async function analyse() {
    if (analysisPending.current || !completed) return; analysisPending.current=true; setBusy('analysis'); setAnalysisError(null);
    try { const result=await post<PeerReport>(`/peer/rooms/${id}/analysis`); setReport(result); await refresh(); }
    catch(e) { setAnalysisError(e); } finally { analysisPending.current=false; setBusy(''); }
  }
  async function feedback(e: React.FormEvent) {
    e.preventDefault(); setBusy('feedback');
    try { await post(`/peer/rooms/${id}/feedback`,{clarity,strengths,improvements}); await refresh(); toast.success('Feedback shared with your partner.'); }
    catch(e) { toast.error((e as Error).message); } finally { setBusy(''); }
  }
  async function toggleTranscript(enabled: boolean) {
    setBusy('consent');
    try { await engine.current?.setConsent(enabled); await refresh(); }
    catch(e) { toast.error((e as Error).message); } finally { setBusy(''); }
  }
  if (q.isLoading || config.isLoading) return <Loading />;
  if (q.error || config.error || !room) return <><Button variant="ghost" onClick={leave}><ArrowLeft size={15} /> Back to Peer Practice</Button><ErrorState error={q.error || config.error} retry={() => { void q.refetch(); void config.refetch(); }} /></>;
  const me = room.participants.find(p=>p.id===user.id), partner=room.participants.find(p=>p.id!==user.id);
  const partnerHere = !!partner?.client_id && partner.seen_ms > room.serverTime-15000 && !completed;
  const isHost = room.host_id === user.id;
  const interviewer = room.participants.find(p=>p.id===room.interviewer_id);
  const ownFeedback = room.feedback?.find(f=>f.author_id===user.id);
  const received = room.feedback?.find(f=>f.author_id!==user.id);
  const connected = call.connection === 'connected';
  return <div className="pp-page pp-room">
    <header className="pp-room-header"><div><button className="pp-back" onClick={leave}><ArrowLeft size={16} /> Peer Practice</button><h1>{room.title}</h1></div><div className="pp-room-header-actions"><span className="pp-timer"><Clock3 size={15} />{room.started_ms ? elapsed(Math.max(0,(room.ended_ms || now) - room.started_ms)) : '00:00'}</span>{!completed && <><Button variant="secondary" size="sm" onClick={copy}><Copy size={15} /> Invite</Button><button className="pp-end" onClick={()=>setConfirmEnd(true)}><PhoneOff size={16} /> End session</button></>}</div></header>
    {!completed ? <>
      <div className="pp-room-status" role="status"><span><i className={connected ? 'is-live' : ''} />{room.status === 'ACTIVE' ? 'Interview in progress' : 'Your room is ready'}<b>·</b>{connected ? 'Partner connected' : partnerHere ? 'Connecting your call…' : 'Waiting for your partner'}</span>{call.connection !== 'joining' && <button onClick={()=>void engine.current?.reconnect()}><RefreshCw size={13} /> Reconnect</button>}</div>
      {call.error && <div className="pp-message" role="alert">{call.error}</div>}
      <div className="pp-meeting-grid"><div className="pp-stage"><div className="pp-people"><Portrait person={partner} stream={call.remote} camera={partnerHere && partner?.camera && connected} mic={partnerHere && partner?.mic} label={partner?.id===room.interviewer_id ? 'INTERVIEWER' : 'CANDIDATE'} /><Portrait person={{name:user.name,photo_url:user.photo_url}} stream={call.local} camera={call.camera} mic={call.mic} self label={user.id===room.interviewer_id ? 'INTERVIEWER' : 'CANDIDATE'} /></div>
        <div className="pp-call-controls"><div className="pp-media-controls"><button className={call.mic ? 'is-on':''} aria-pressed={call.mic} onClick={()=>void engine.current?.toggle('audio')}>{call.mic ? <Mic /> : <MicOff />}<span>{call.mic ? 'Mute' : 'Start mic'}</span></button><button className={call.camera ? 'is-on':''} aria-pressed={call.camera} onClick={()=>void engine.current?.toggle('video')}>{call.camera ? <Video /> : <VideoOff />}<span>{call.camera ? 'Stop video' : 'Start video'}</span></button><button disabled={room.status!=='ACTIVE' || !!busy} onClick={()=>action('swap')}><ArrowLeftRight /><span>Switch roles</span></button><button onClick={()=>setConfirmEnd(true)} className="pp-control-end"><PhoneOff /><span>End</span></button></div><span className="pp-call-caption"><ShieldCheck size={13} /> Video is never recorded by SkillNex</span></div>
        {room.status==='WAITING' ? <section className="pp-conversation-card"><span className="pp-eyebrow">BEFORE YOU BEGIN</span><h2>One link. Two perspectives.</h2><p>Invite your partner, turn on your microphone, and settle in. The host starts the interview when you’re both ready.</p><div className="pp-invite-link"><input aria-label="Invite link" value={`${window.location.origin}/app/peer-practice?join=${id}`} readOnly onFocus={e=>e.target.select()} /><button onClick={copy} aria-label="Copy invite link"><Copy size={17} /></button></div>{isHost ? <Button onClick={()=>action('start')} disabled={!partnerHere || !connected || !!busy}>Start interview <ArrowRight size={16} /></Button> : <p className="pp-waiting-host">Waiting for the host to start the interview.</p>}</section> : <section className="pp-conversation-card"><span className="pp-eyebrow"><MessageSquare size={14} /> THE FLOOR IS YOURS</span><h2>{user.id===room.interviewer_id ? 'Ask. Listen. Follow the story.' : 'Take your time. Think out loud.'}</h2><p>{interviewer?.name} is interviewing. Ask your own questions, follow up on an interesting point, and switch roles whenever you’re ready.</p><div className="pp-conversation-prompt"><span>A starting point, if you need one</span><p>“Tell me about a project you’re proud of. What was the hardest decision you made?”</p></div></section>}
      </div><aside className="pp-meeting-aside"><div className="pp-aside-tabs"><button aria-pressed={tab==='guide'} onClick={()=>setTab('guide')}>Session guide</button><button aria-pressed={tab==='notes'} onClick={()=>setTab('notes')}>My notes</button></div>{tab==='guide' ? <><section className="pp-guide"><span className="pp-mini-label">KEEP IT HUMAN</span><h3>A little structure helps.</h3><ol><li><b>Break the ice</b><span>Introductions and what you’d like to practise.</span></li><li><b>Explore the details</b><span>Ask about a project, approach or real experience.</span></li><li><b>Trade places</b><span>Give each person time to ask and answer.</span></li><li><b>End with a takeaway</b><span>Share feedback and review the conversation.</span></li></ol></section><div className="pp-analysis-later"><Sparkles size={19}/><strong>Feedback comes after.</strong><p>Your strengths, mistakes and next steps appear after the interview ends.</p></div></> : <><NoteForm note={note} setNote={setNote} save={saveNote} busy={!!busy} /><NoteList room={room} uid={user.id} remove={async noteId=>{await api(`/peer/rooms/${id}/notes/${noteId}`,{method:'DELETE'});await refresh();}} /></>}
      <section className="pp-transcript-control"><label><input type="checkbox" checked={!!me?.consent} disabled={!!busy || !config.data?.transcriptionAvailable} onChange={e=>void toggleTranscript(e.target.checked)} /><span>Save my speech for the final review</span></label><p>{config.data?.transcriptionAvailable ? 'When the interview starts, your microphone audio is sent to the configured AI provider for transcription. Saved transcript text is shared with your partner and used for analysis. SkillNex does not store the audio.' : 'Automatic transcription is not configured. Save your questions and answers in My notes for the final review.'}</p><small>{call.pending ? `${call.pending} speech segment${call.pending>1?'s':''} saving…` : me?.consent && call.mic && room.status==='ACTIVE' ? 'Transcript on · capturing your speech' : 'No microphone audio is being transcribed'}</small>{call.transcriptError && <p role="alert" className="pp-transcript-error">{call.transcriptError}</p>}</section>
      </aside></div>
    </> : <>
      <section className="pp-finished"><span className="pp-finished-icon"><CheckCircle2 size={28}/></span><div><span className="pp-eyebrow">CONVERSATION COMPLETE</span><h2>Good practice. Now make it count.</h2><p>Your camera and microphone are off. Review what went well and what to try next.</p></div></section>
      {(call.pending>0 || call.transcriptError) && <div className="pp-message" role="status">{call.pending ? 'Finishing your transcript. Your analysis will be ready to generate once it is saved.' : call.transcriptError}</div>}
      <div className="pp-review-grid"><section className="pp-review-main"><div className="pp-section-title"><h2><Sparkles size={20}/> Your interview review</h2><Button size="sm" onClick={analyse} disabled={!!busy || call.pending>0 || !config.data?.analysisAvailable}>{busy==='analysis'?'Reviewing conversation…':report?'Refresh review':'Generate analysis'}</Button></div>
        {!!analysisError && <ErrorState error={analysisError} />}
        {report ? <Report report={report} /> : <div className="pp-review-empty"><FileText size={32}/><h3>Built from your actual conversation.</h3><p>Save at least a short answer in your notes or wait for your transcript. The review covers your strengths, specific mistakes, better approaches and next steps.</p><small>No video assessment. No invented scores. {config.data?.analysisAvailable ? '' : 'AI analysis is not configured on this server.'}</small></div>}
        {received && <section className="pp-feedback-received"><span className="pp-mini-label">FROM YOUR PARTNER</span><h3>Clarity: {received.clarity}/5 <small>Peer rating</small></h3><p><b>What worked:</b> {received.strengths}</p><p><b>Try next:</b> {received.improvements}</p></section>}
        {partner && <form className="pp-feedback-form" onSubmit={feedback}><h3>{ownFeedback ? 'Update your feedback for' : 'Leave feedback for'} {partner.name}</h3><label>How clear were their explanations?<select value={clarity} onChange={e=>setClarity(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label><label>Something they did well<textarea required maxLength={2000} value={strengths} onChange={e=>setStrengths(e.target.value)} placeholder="Mention a specific answer or example." /></label><label>One thing to improve<textarea required maxLength={2000} value={improvements} onChange={e=>setImprovements(e.target.value)} placeholder="Give a practical suggestion, kindly." /></label><Button variant="secondary" disabled={!!busy} type="submit"><Check size={16}/>{busy==='feedback'?'Saving…':'Share feedback'}</Button></form>}
      </section><aside className="pp-review-notes"><h2><FileText size={18}/> Conversation & notes</h2><p>Correct a transcript by removing your entry and saving a written correction. New notes refresh the evidence for your next analysis.</p><NoteForm note={note} setNote={setNote} save={saveNote} busy={!!busy}/><NoteList room={room} uid={user.id} remove={async noteId=>{await api(`/peer/rooms/${id}/notes/${noteId}`,{method:'DELETE'});await refresh();}}/></aside></div>
    </>}
    <Dialog open={confirmEnd} onOpenChange={setConfirmEnd} title="Finish this interview?" description="This ends the call for both people. Your saved notes and transcript stay available for the final review."><div className="pp-end-dialog"><Button variant="secondary" disabled={!!busy} onClick={()=>setConfirmEnd(false)}>Keep practising</Button><Button disabled={!!busy} onClick={()=>action('end')}><PhoneOff size={16}/>{busy==='end'?'Ending…':'End & review'}</Button></div></Dialog>
  </div>;
}

function NoteForm({note,setNote,save,busy}:{note:string;setNote:(v:string)=>void;save:(e:React.FormEvent)=>void;busy:boolean}) {
  return <form className="pp-note-form" onSubmit={save}><label htmlFor="pp-note">Your private notes<textarea id="pp-note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Question asked… My answer… What I’d explain differently…" maxLength={5000} rows={5}/></label><small>Only you can see written notes. They are sent to AI when you generate your review.</small><Button variant="secondary" size="sm" type="submit" disabled={busy || !note.trim()}><Plus size={14}/> Save note</Button></form>;
}
function NoteList({room,uid,remove}:{room:PeerRoomData;uid:string;remove:(id:string)=>Promise<void>}) {
  return <div className="pp-notes-list">{room.notes?.length ? room.notes.map(n=><article key={n.id}><div><span>{n.user_id===uid?'You':'Partner'} · {n.source==='note'?'Private note':n.speaker_role}</span>{n.user_id===uid && <button aria-label="Delete this note" onClick={()=>void remove(n.id).catch(e=>toast.error(e.message))}><Trash2 size={13}/></button>}</div><p>{n.content}</p></article>):<p className="pp-no-notes">No saved notes yet. A few details now make the final review more useful.</p>}</div>;
}
function Report({report}:{report:PeerReport}) {
  return <div className="pp-report"><p className="pp-report-summary">{report.summary}</p><div className="pp-report-coverage"><ShieldCheck size={16}/><p>{report.coverage}<small>{report.reviewedEntries} of {report.totalEntries} saved entries reviewed. AI suggestions can be imperfect.</small></p></div><section><h3><CheckCircle2 size={18}/> What went well</h3>{report.strengths.length ? <ul>{report.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul>:<p>There is not enough evidence to identify specific strengths yet.</p>}</section><section><h3><MessageSquare size={18}/> Mistakes & better approaches</h3>{report.mistakes.length?report.mistakes.map((m,i)=><article className="pp-mistake" key={i}><blockquote>“{m.quote}”</blockquote><h4>{m.issue}</h4><p>{m.improvement}</p></article>):<p>No specific mistakes were supported by the saved content.</p>}</section><section><h3><ArrowRight size={18}/> Your next practice steps</h3><ol>{report.nextSteps.map((s,i)=><li key={i}>{s}</li>)}</ol></section></div>;
}
