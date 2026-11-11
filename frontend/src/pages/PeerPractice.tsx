import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Copy, Video, VideoOff, Mic, MicOff, Users, Plus, Link as LinkIcon, ShieldCheck, Clock3, PhoneOff, RefreshCw, ArrowLeftRight, FileText, Sparkles, Trash2, CheckCircle2, MessageSquare, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { api, post } from '../api/client';
import { useSession } from '../hooks/useSession';
import { PeerCall, initialCall, type CallState, type PeerRoomData, type PeerConfig, type PeerReport } from '../utils/peerCall';
import { Portrait } from '../components/PeerPortrait';
import { PeerReview } from '../components/PeerReview';
export { Portrait } from '../components/PeerPortrait';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { ErrorState, Loading } from '../components/Common';
import '../peer-practice.css';
import '../peer-review.css';

const roomId = (text: string) => {
  try { const u = new URL(text); text = u.searchParams.get('join') || u.searchParams.get('room') || ''; } catch {}
  return /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(text.trim()) ? text.trim() : null;
};
const elapsed = (ms: number) => `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;

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
  const engine = useRef<PeerCall | undefined>(undefined); const revision = useRef(-1); const autoReviewRevision = useRef(-1);
  const observedCompletion = useRef(false);
  const [now, setNow] = useState(Date.now()); const [busy, setBusy] = useState(''); const [confirmEnd, setConfirmEnd] = useState(false);
  const [tab, setTab] = useState<'notes'|'guide'>('guide'); const [note, setNote] = useState(''); const [shareNote, setShareNote] = useState(false);
  const [report, setReport] = useState<PeerReport | null>(null); const [analysisError, setAnalysisError] = useState<unknown>(null); const analysisPending = useRef(false);
  const [strengths, setStrengths] = useState(''); const [improvements, setImprovements] = useState(''); const [clarity, setClarity] = useState(3);
  const initialStatus = q.data?.status; const ready = !!q.data && !!config.data;
  const completed = room?.status === 'COMPLETED';
  useEffect(() => { if (q.data) { setRoom(q.data); setReport(q.data.report || null); if (q.data.report?.version === 2) setAnalysisError(null); revision.current = q.data.content_revision; } }, [q.data]);
  useEffect(() => {
    if (!ready || initialStatus === 'COMPLETED' || !config.data) return;
    const instance = new PeerCall(id, user.id, config.data, update => {
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
  // Wait for final speech uploads. A changed revision allows a fresh review after late entries.
  useEffect(() => {
    if (!completed || !room || autoReviewRevision.current === room.content_revision || busy || call.pending || !config.data?.analysisAvailable || report?.version === 2) return;
    const shared = room.notes?.filter(n => n.source === 'transcript' || n.shared) || [];
    if (!room.participants.some(person => shared.filter(n => n.user_id === person.id).reduce((sum, n) => sum + n.content.trim().length, 0) >= 80)) return;
    const timer = setTimeout(() => { autoReviewRevision.current = room.content_revision; void analyse(); }, 6000);
    return () => clearTimeout(timer);
  }, [completed, call.pending, room?.content_revision, report, busy, config.data?.analysisAvailable]);
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
    try { await post(`/peer/rooms/${id}/notes`, { id: crypto.randomUUID(), text: note.trim(), shareWithPartner: shareNote }); setNote(''); await refresh(); toast.success(shareNote ? 'Answer shared for the final review.' : 'Private note saved.'); }
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
        <section className="pp-audio-check" aria-label="Microphone check"><div className="pp-mic-meter"><Mic size={16}/><span>{call.mic ? 'Your mic input' : 'Microphone is off'}</span><meter min={0} max={1} value={call.micLevel} aria-label="Your microphone level" /></div><label>Microphone<select aria-label="Choose microphone" value={call.selectedMicrophone === 'default' ? '' : call.selectedMicrophone} onFocus={()=>void engine.current?.refreshMicrophones()} onChange={e=>void engine.current?.setMicrophone(e.target.value)}><option value="">System default</option>{call.microphones.filter(device=>device.deviceId !== 'default').map(device=><option key={device.deviceId} value={device.deviceId}>{device.label || 'Microphone'}</option>)}</select></label><small>{call.micIssue || (call.mic ? 'Speak and check that the bar moves. If it stays empty, choose another microphone.' : 'Start your mic above to talk to your partner.')}</small></section>
        {room.status==='WAITING' ? <section className="pp-conversation-card"><span className="pp-eyebrow">BEFORE YOU BEGIN</span><h2>One link. Two perspectives.</h2><p>Invite your partner, turn on your microphone, and settle in. The host starts the interview when you’re both ready.</p><div className="pp-invite-link"><input aria-label="Invite link" value={`${window.location.origin}/app/peer-practice?join=${id}`} readOnly onFocus={e=>e.target.select()} /><button onClick={copy} aria-label="Copy invite link"><Copy size={17} /></button></div>{isHost ? <Button onClick={()=>action('start')} disabled={!partnerHere || !connected || !!busy}>Start interview <ArrowRight size={16} /></Button> : <p className="pp-waiting-host">Waiting for the host to start the interview.</p>}</section> : <section className="pp-conversation-card"><span className="pp-eyebrow"><MessageSquare size={14} /> THE FLOOR IS YOURS</span><h2>{user.id===room.interviewer_id ? 'Ask. Listen. Follow the story.' : 'Take your time. Think out loud.'}</h2><p>{interviewer?.name} is interviewing. Ask your own questions, follow up on an interesting point, and switch roles whenever you’re ready.</p><div className="pp-conversation-prompt"><span>A starting point, if you need one</span><p>“Tell me about a project you’re proud of. What was the hardest decision you made?”</p></div></section>}
      </div><aside className="pp-meeting-aside"><div className="pp-aside-tabs"><button aria-pressed={tab==='guide'} onClick={()=>setTab('guide')}>Session guide</button><button aria-pressed={tab==='notes'} onClick={()=>setTab('notes')}>My notes</button></div>{tab==='guide' ? <><section className="pp-guide"><span className="pp-mini-label">KEEP IT HUMAN</span><h3>A little structure helps.</h3><ol><li><b>Break the ice</b><span>Introductions and what you’d like to practise.</span></li><li><b>Explore the details</b><span>Ask about a project, approach or real experience.</span></li><li><b>Trade places</b><span>Give each person time to ask and answer.</span></li><li><b>End with a takeaway</b><span>Share feedback and review the conversation.</span></li></ol></section><div className="pp-analysis-later"><Sparkles size={19}/><strong>Feedback comes after.</strong><p>Both participants get their own points, strengths, mistakes and next steps after the interview ends. Save speech or share written answers to include them.</p></div></> : <><NoteForm note={note} setNote={setNote} share={shareNote} setShare={setShareNote} save={saveNote} busy={!!busy} /><NoteList room={room} uid={user.id} remove={async noteId=>{await api(`/peer/rooms/${id}/notes/${noteId}`,{method:'DELETE'});await refresh();}} /></>}
      <section className="pp-transcript-control"><label><input type="checkbox" checked={!!me?.consent} disabled={!!busy || !config.data?.transcriptionAvailable} onChange={e=>void toggleTranscript(e.target.checked)} /><span>Save my speech for the final review</span></label><p>{config.data?.transcriptionAvailable ? 'When the interview starts, your microphone audio is sent to the configured AI provider for transcription. Saved transcript text is shared with your partner and used for analysis. SkillNex does not store the audio.' : 'Automatic transcription is not configured. Add your answers in My notes and choose to share them for the final review.'}</p><small>{call.pending ? `${call.pending} speech segment${call.pending>1?'s':''} saving…` : me?.consent && call.mic && room.status==='ACTIVE' ? 'Transcript on · capturing your speech' : 'No microphone audio is being transcribed'}</small>{call.transcriptError && <p role="alert" className="pp-transcript-error">{call.transcriptError}</p>}</section>
      </aside></div>
    </> : <>
      <section className="pp-finished"><span className="pp-finished-icon"><CheckCircle2 size={28}/></span><div><span className="pp-eyebrow">CONVERSATION COMPLETE</span><h2>Good practice. Now make it count.</h2><p>Your camera and microphone are off. Review what went well and what to try next.</p></div></section>
      {(call.pending>0 || call.transcriptError) && <div className="pp-message" role="status">{call.pending ? 'Finishing your transcript. Your analysis will be ready to generate once it is saved.' : call.transcriptError}</div>}
      <div className="pp-review-grid"><section className="pp-review-main"><div className="pp-section-title"><h2><Sparkles size={20}/> Both sides of the conversation</h2><Button size="sm" onClick={analyse} disabled={!!busy || call.pending>0 || !config.data?.analysisAvailable}>{busy==='analysis'?'Reviewing both participants…':report?'Refresh review':'Generate analysis'}</Button></div>
        {!!analysisError && <ErrorState error={analysisError} />}
        {report ? <PeerReview report={report} userId={user.id} /> : <div className="pp-review-empty"><FileText size={32}/><h3>Two people. Two individual reviews.</h3><p>Each person gets points, strengths, mistakes with corrections, and next steps based on their saved speech or shared written answers. Private notes stay private.</p><p>{busy==='analysis' ? 'Preparing your final review…' : 'If an answer is missing, add it below and tick “Share this answer for our final review”.'}</p><small>{config.data?.analysisAvailable ? 'A participant without enough saved answers is shown as not scored.' : 'AI analysis is not configured on this server.'}</small></div>}
        {received && <section className="pp-feedback-received"><span className="pp-mini-label">FROM YOUR PARTNER</span><h3>Clarity: {received.clarity}/5 <small>Peer rating</small></h3><p><b>What worked:</b> {received.strengths}</p><p><b>Try next:</b> {received.improvements}</p></section>}
        {partner && <form className="pp-feedback-form" onSubmit={feedback}><h3>{ownFeedback ? 'Update your feedback for' : 'Leave feedback for'} {partner.name}</h3><label>How clear were their explanations?<select value={clarity} onChange={e=>setClarity(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label><label>Something they did well<textarea required maxLength={2000} value={strengths} onChange={e=>setStrengths(e.target.value)} placeholder="Mention a specific answer or example." /></label><label>One thing to improve<textarea required maxLength={2000} value={improvements} onChange={e=>setImprovements(e.target.value)} placeholder="Give a practical suggestion, kindly." /></label><Button variant="secondary" disabled={!!busy} type="submit"><Check size={16}/>{busy==='feedback'?'Saving…':'Share feedback'}</Button></form>}
      </section><aside className="pp-review-notes"><h2><FileText size={18}/> Conversation & notes</h2><p>To correct your transcript, remove your entry and save a shared written correction. Each person can edit only their own entries.</p><NoteForm note={note} setNote={setNote} share={shareNote} setShare={setShareNote} save={saveNote} busy={!!busy}/><NoteList room={room} uid={user.id} remove={async noteId=>{await api(`/peer/rooms/${id}/notes/${noteId}`,{method:'DELETE'});await refresh();}}/></aside></div>
    </>}
    <Dialog open={confirmEnd} onOpenChange={setConfirmEnd} title="Finish this interview?" description="This ends the call for both people. Your saved notes and transcript stay available for the final review."><div className="pp-end-dialog"><Button variant="secondary" disabled={!!busy} onClick={()=>setConfirmEnd(false)}>Keep practising</Button><Button disabled={!!busy} onClick={()=>action('end')}><PhoneOff size={16}/>{busy==='end'?'Ending…':'End & review'}</Button></div></Dialog>
  </div>;
}

function NoteForm({note,setNote,share,setShare,save,busy}:{note:string;setNote:(v:string)=>void;share:boolean;setShare:(v:boolean)=>void;save:(e:React.FormEvent)=>void;busy:boolean}) {
  return <form className="pp-note-form" onSubmit={save}><label htmlFor="pp-note">{share ? 'Your shared answer' : 'Your private notes'}<textarea id="pp-note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Question asked… My answer… What I’d explain differently…" maxLength={5000} rows={5}/></label><label className="pp-share-answer"><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)} /> Share this answer for our final review</label><small>{share ? 'Your partner can read this answer. It is sent to AI for the two-person review.' : 'Only you can see this note. It is not included in the shared AI review.'}</small><Button variant="secondary" size="sm" type="submit" disabled={busy || !note.trim()}><Plus size={14}/>{share ? 'Save shared answer' : 'Save private note'}</Button></form>;
}
function NoteList({room,uid,remove}:{room:PeerRoomData;uid:string;remove:(id:string)=>Promise<void>}) {
  return <div className="pp-notes-list">{room.notes?.length ? room.notes.map(n=><article key={n.id} id={`peer-note-${n.id}`} tabIndex={-1}><div><span>{n.user_id===uid?'You':'Partner'} · {n.source==='note' ? n.shared ? 'Shared answer' : 'Private note' : `${n.speaker_role} · transcript`}</span>{n.user_id===uid && <button aria-label="Delete this note" onClick={()=>void remove(n.id).catch(e=>toast.error(e.message))}><Trash2 size={13}/></button>}</div><p>{n.content}</p></article>):<p className="pp-no-notes">No saved notes yet. Save speech or share an answer for the final review.</p>}</div>;
}
