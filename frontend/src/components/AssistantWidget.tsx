import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Sparkles, X, Maximize2, Minimize2, Minus } from 'lucide-react';
import { Assistant } from '../pages/Assistant';
import '../chatbot.css';

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const location = useLocation();
  const onAssistant = location.pathname === '/app/assistant';
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className={'assistant-widget' + (maximized && open ? ' is-maximized' : '')}
      hidden={onAssistant}
    >
      <section
        ref={panel}
        className="assistant-widget-panel"
        id="careerx-quick-chat"
        role="dialog"
        aria-modal="false"
        aria-labelledby="quick-chat-title"
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            close();
          }
        }}
      >
        <header className="assistant-widget-header">
          <span className="assistant-widget-mark">
            <Sparkles size={22} />
          </span>
          <div>
            <h2 id="quick-chat-title">SkillNex AI</h2>
            <p>A little help, whenever you need it.</p>
          </div>
          <div className="assistant-window-controls">
            <button
              className="icon-button"
              onClick={() => setMaximized((value) => !value)}
              aria-label={maximized ? 'Restore chat size' : 'Maximize chat'}
              title={maximized ? 'Restore size' : 'Maximize'}
              aria-pressed={maximized}
            >
              {maximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              className="icon-button"
              onClick={close}
              aria-label="Minimize chat"
              title="Minimize"
            >
              <Minus size={20} />
            </button>
          </div>
        </header>
        {opened && <Assistant compact active={open && !onAssistant} />}
      </section>
      <button
        ref={trigger}
        className="assistant-widget-trigger"
        aria-expanded={open}
        aria-controls="careerx-quick-chat"
        aria-label={open ? 'Minimize AI chatbot' : 'Open AI chatbot'}
        onClick={() => {
          setOpened(true);
          setOpen((value) => !value);
        }}
      >
        {open ? <X size={21} /> : <MessageCircle size={21} />}
        <span>{open ? 'Minimize' : 'Ask AI'}</span>
      </button>
    </div>
  );
}
