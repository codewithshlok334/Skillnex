import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown, ChevronUp, GripHorizontal, Maximize2, Minimize2, Terminal } from 'lucide-react';

type Props = { editor: ReactNode; children: ReactNode; activityKey: string; judging: boolean };

// Keep the editor mounted when results are expanded so its selection and undo history survive.
export function CodeLabPanels({ editor, children, activityKey, judging }: Props) {
  const [resultsSize, setResultsSize] = useState(38);
  const [mode, setMode] = useState<'split' | 'expanded' | 'collapsed'>('split');
  const [dragging, setDragging] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLElement>(null);
  const resultsId = useId(), editorId = useId();
  const clamp = (size: number) => Math.max(25, Math.min(70, size));

  useEffect(() => {
    if (!activityKey) return;
    setMode(current => current === 'expanded' ? current : 'split');
    setResultsSize(current => Math.max(45, current));
    if (scroll.current) scroll.current.scrollTop = 0;
    if (window.matchMedia('(max-width: 760px)').matches) {
      results.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [activityKey]);

  function resize(clientY: number) {
    const bounds = stack.current?.getBoundingClientRect();
    const dividerHeight = stack.current?.querySelector('.cl-panel-divider')?.getBoundingClientRect().height ?? 14;
    if (bounds && bounds.height > dividerHeight) setResultsSize(clamp((bounds.bottom - clientY - dividerHeight / 2) / (bounds.height - dividerHeight) * 100));
  }

  return <div ref={stack} className="cl-coding-column" data-results-mode={mode} data-resizing={dragging || undefined}
    style={{ '--cl-editor-share': `${100 - resultsSize}fr`, '--cl-results-share': `${resultsSize}fr` } as CSSProperties}>
    <div id={editorId} className="cl-editor-region" hidden={mode === 'expanded'}>{editor}</div>
    <div className="cl-panel-divider" role="separator" aria-label="Resize editor and test results" aria-orientation="horizontal"
      aria-controls={`${editorId} ${resultsId}`} aria-valuemin={25} aria-valuemax={70} aria-valuenow={Math.round(resultsSize)}
      aria-valuetext={`Test results use ${Math.round(resultsSize)} percent of the workspace`} tabIndex={mode === 'split' ? 0 : -1}
      title="Drag to resize · Arrow up/down to adjust · Double-click to reset"
      onPointerDown={event => { if (event.button !== 0 || !event.isPrimary) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); resize(event.clientY); }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(event.clientY); }}
      onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragging(false); }}
      onLostPointerCapture={() => setDragging(false)} onPointerCancel={() => setDragging(false)}
      onDoubleClick={() => setResultsSize(38)}
      onKeyDown={event => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        setResultsSize(current => event.key === 'Home' ? 25 : event.key === 'End' ? 70 : clamp(current + (event.key === 'ArrowUp' ? 5 : -5)));
      }}><GripHorizontal size={18} /></div>
    <section ref={results} className="cl-results" aria-label="Execution result">
      <header><Terminal size={17} /><h2>Test results</h2>{judging && <span className="cl-results-status" role="status">Checking…</span>}
        <div className="cl-results-actions">
          <button type="button" aria-label={mode === 'expanded' ? 'Restore editor and results' : 'Expand test results'} title={mode === 'expanded' ? 'Back to editor' : 'Expand test results'} onClick={() => setMode(mode === 'expanded' ? 'split' : 'expanded')}>
            {mode === 'expanded' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span>{mode === 'expanded' ? 'Back to editor' : 'Expand'}</span>
          </button>
          <button type="button" aria-label={mode === 'collapsed' ? 'Show test results' : 'Minimize test results'} aria-expanded={mode !== 'collapsed'} aria-controls={resultsId}
            title={mode === 'collapsed' ? 'Show test results' : 'Minimize test results'} onClick={() => setMode(mode === 'collapsed' ? 'split' : 'collapsed')}>
            {mode === 'collapsed' ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
        </div>
      </header>
      <div id={resultsId} ref={scroll} className="cl-results-scroll" hidden={mode === 'collapsed'} tabIndex={mode === 'collapsed' ? -1 : 0} aria-label="Test case details">{children}</div>
    </section>
  </div>;
}
