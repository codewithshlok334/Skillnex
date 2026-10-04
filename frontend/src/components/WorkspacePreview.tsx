import { ArrowUpRight, Check, FileText, Mic, Route } from 'lucide-react';
import { Link } from 'react-router-dom';

/** An explicitly illustrative product preview, never account statistics. */
export function WorkspacePreview() {
  return (
    <section className="workspace-preview" aria-label="Example career workspace">
      <div className="preview-window-bar"><span><i /><i /><i /></span><small>SkillNex / Workspace preview</small><span className="preview-example">EXAMPLE</span></div>
      <div className="preview-window-body">
        <div className="preview-window-title"><div><small>YOUR CAREER WORKSPACE</small><h2>A clear plan. A stronger application.</h2></div><span className="preview-profile">AM</span></div>
        <div className="preview-metrics"><div><FileText size={17}/><small>Resume review</small><strong>Ready</strong></div><div><Mic size={17}/><small>Interview practice</small><strong>Your pace</strong></div><div><Route size={17}/><small>Learning plan</small><strong>One step ahead</strong></div></div>
        <div className="preview-review"><div className="preview-review-title"><FileText size={17}/><strong>Resume improvements</strong><span>Sample review</span></div><p>Make your experience easier to evaluate.</p><div><Check size={15}/><span>Use clear section headings</span></div><div><Check size={15}/><span>Describe your contribution to each project</span></div><div><span className="preview-step">3</span><span>Add outcomes you can support</span></div></div>
        <Link className="preview-next-action" to="/app/interviews"><span className="preview-next-icon"><Mic size={19}/></span><span><strong>Put your preparation into practice</strong><small>Start a mock interview for your target role</small></span><ArrowUpRight size={18}/></Link>
      </div>
      <div className="preview-window-foot">Illustrative content. Your workspace shows your own data.</div>
    </section>
  );
}
