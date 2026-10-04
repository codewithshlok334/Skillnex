import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Square } from 'lucide-react';
import { api } from '../api/client';
import { mediaError } from '../utils/interviewVoice';
import { openMicrophone, type MicClip } from '../utils/directMicrophone';
import { Button } from './ui/button';

export function RecordedInterviewAnswer({ interviewId, questionId, language, target, onActive, onBusy, onText, onStart, disabled }: {
  interviewId:string; questionId:string; language:string; target:HTMLElement|null;
  onActive:(value:boolean)=>void; onBusy:(value:boolean)=>void;
  onText:(text:string,seconds:number)=>void; onStart:()=>void; disabled:boolean;
}) {
  const [phase,setPhase]=useState<'idle'|'opening'|'listening'|'transcribing'>('idle');
  const [error,setError]=useState(''), [level,setLevel]=useState(0), [seconds,setSeconds]=useState(0);
  const [devices,setDevices]=useState<MediaDeviceInfo[]>([]), [deviceId,setDeviceId]=useState(() => {
    try { return sessionStorage.getItem('skillnex-interview-mic') || ''; } catch { return ''; }
  });
  const [clip,setClip]=useState<MicClip|null>(null), [url,setUrl]=useState('');
  const alive=useRef(true), state=useRef(phase), generation=useRef(0);
  const capture=useRef<Awaited<ReturnType<typeof openMicrophone>>|null>(null);
  const operation=useRef<AbortController|null>(null);
  const callbacks=useRef({onActive,onBusy,onText,onStart}); callbacks.current={onActive,onBusy,onText,onStart};
  function change(next:typeof phase) {state.current=next;setPhase(next);}
  async function refreshDevices(){
    try {const all=await navigator.mediaDevices?.enumerateDevices(); if(alive.current) setDevices(all?.filter(d=>d.kind==='audioinput')||[]);} catch {}
  }
  useEffect(()=>{
    alive.current=true; void refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange',refreshDevices);
    return ()=>{alive.current=false;generation.current++;operation.current?.abort();capture.current?.cancel();navigator.mediaDevices?.removeEventListener('devicechange',refreshDevices);callbacks.current.onActive(false);callbacks.current.onBusy(false);};
  },[]);
  useEffect(()=>{if(!clip){setUrl('');return;}const value=URL.createObjectURL(clip.wav);setUrl(value);return()=>URL.revokeObjectURL(value);},[clip]);
  function cancel(){generation.current++;operation.current?.abort();capture.current?.cancel();capture.current=null;change('idle');onActive(false);onBusy(false);setLevel(0);}
  async function transcribe(audio:MicClip, token:number){
    const controller=new AbortController();operation.current=controller;
    change('transcribing');onBusy(true);setError('');
    const timeout=setTimeout(()=>controller.abort(),45000);
    try {
      const form=new FormData();form.append('audio',audio.wav,'answer.wav');form.append('questionId',questionId);form.append('language',language);
      const result=await api<{text:string}>(`/interviews/${interviewId}/transcribe`,{method:'POST',body:form,signal:controller.signal});
      if(!alive.current||token!==generation.current)return;
      if(!result.text?.trim())throw new Error('Sound was captured, but no words could be understood. Check the microphone, speak closer and try again. You can also type your answer.');
      callbacks.current.onText(result.text,audio.seconds);setClip(null);change('idle');
    } catch(e){
      if(alive.current&&token===generation.current){change('idle');setError(controller.signal.aborted?'Voice processing took too long. Retry this audio or type your answer.':e instanceof Error?e.message:'Voice processing failed. Retry or type your answer.');}
    } finally {clearTimeout(timeout);if(alive.current&&token===generation.current){operation.current=null;onBusy(false);}}
  }
  async function stop(){
    if(state.current!=='listening'||!capture.current)return;
    const token=generation.current, current=capture.current;capture.current=null;
    change('transcribing');onActive(false);setLevel(0);
    try {const audio=await current.stop();if(!alive.current||token!==generation.current)return;setClip(audio);await transcribe(audio,token);}
    catch(e){if(alive.current&&token===generation.current){change('idle');onBusy(false);setError(e instanceof Error?e.message:'Microphone capture failed. Try another input device.');}}
  }
  async function start(){
    if(state.current!=='idle'||disabled)return;
    const token=++generation.current, controller=new AbortController();operation.current=controller;
    change('opening');setError('');setClip(null);setSeconds(0);setLevel(0);onBusy(true);onStart();
    const openingTimeout=setTimeout(()=>{
      if(alive.current&&token===generation.current&&state.current==='opening'){
        cancel();setError('The microphone did not open. Allow microphone access beside the address bar, then retry. You can keep typing your answer.');
      }
    },30000);
    try {
      const mic=await openMicrophone(deviceId,controller.signal,(value,duration)=>{
        if(!alive.current||token!==generation.current)return;
        setLevel(value);setSeconds(Math.floor(duration));
        if(duration>=120)void stop();
      },()=>{void stop();});
      if(!alive.current||token!==generation.current){mic.cancel();return;}
      capture.current=mic;change('listening');onActive(true);void refreshDevices();
    } catch(e){if(alive.current&&token===generation.current){change('idle');onBusy(false);onActive(false);setError(e instanceof Error&&!['NotAllowedError','NotFoundError','NotReadableError','OverconstrainedError'].includes(e.name)?e.message:(e as {name?:string})?.name==='OverconstrainedError'?'Selected microphone is unavailable. Choose another microphone in Mic settings.':mediaError(e));}}
    finally { clearTimeout(openingTimeout); }
  }
  const button=<Button type="button" className={'meeting-tool'+(phase==='listening'?' enabled':'')} disabled={disabled||phase==='transcribing'} onClick={phase==='opening'?cancel:phase==='listening'?stop:start} aria-pressed={phase==='listening'}>
    {phase==='listening'?<Square size={20}/>:<Mic size={20}/>}<span>{phase==='opening'?'Cancel mic request':phase==='listening'?'Stop & use answer':phase==='transcribing'?'Converting speech…':'Start mic'}</span>
  </Button>;
  return <section className="recorded-answer direct-mic" aria-label="Microphone answer">
    <div className="button-row">{button}</div>
    <p className="small">Speak, then press <strong>Stop & use answer</strong>. Your words appear below automatically. Review before sending.</p>
    {phase==='opening'&&<p role="status">Allow microphone access in Chrome’s address bar.</p>}
    {phase==='listening'&&<div className="mic-signal"><meter min="0" max="100" value={level} aria-label="Microphone level"/><p role="status">{level>2?'Hearing sound':seconds>=3?'No sound right now — check Mic settings':'Listening…'} · {seconds}s / 120s</p></div>}
    {phase==='transcribing'&&<p role="status">Turning your speech into text…</p>}
    <details><summary>Mic settings</summary><label>Microphone<select value={deviceId} disabled={phase!=='idle'} onChange={e=>{
      setDeviceId(e.target.value);
      try { sessionStorage.setItem('skillnex-interview-mic',e.target.value); } catch {}
    }}><option value="">System default microphone</option>{devices.filter(d=>d.deviceId&&d.deviceId!=='default').map((d,i)=><option key={d.deviceId} value={d.deviceId}>{d.label||`Microphone ${i+1}`}</option>)}</select></label><button type="button" disabled={phase!=='idle'} onClick={()=>void refreshDevices()}>Refresh microphones</button></details>
    {error&&<p className="interview-input-notice" role="alert">{error}</p>}
    {clip&&phase==='idle'&&<><div className="button-row"><Button type="button" disabled={disabled} onClick={()=>void transcribe(clip,++generation.current)}>Retry voice processing</Button><Button type="button" variant="secondary" onClick={()=>{setClip(null);setError('');}}>Discard audio</Button></div>{url&&<details><summary>Listen to captured audio ({clip.seconds}s)</summary><audio controls src={url} aria-label="Captured microphone audio"/></details>}</>}
    <p className="small">After Stop, your audio is sent to the configured AI provider for transcription. Camera video stays local.</p>
    {target&&createPortal(button,target)}
  </section>;
}
