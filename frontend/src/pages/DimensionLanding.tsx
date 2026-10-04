import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronRight,
  Code2,
  FileText,
  Menu,
  MessageCircle,
  Mic,
  PenLine,
  Route,
  ScanLine,
  Sparkles,
  X,
} from 'lucide-react';
import { Logo } from '../layouts/AppLayout';
import { WorkspacePreview } from '../components/WorkspacePreview';
import { useConfig } from '../hooks/useSession';

const previews = {
  resume: {
    label: 'Resume studio',
    icon: FileText,
    title: 'Your experience. A sharper story.',
    description:
      'Turn what you have done into a resume that opens the conversation. Get specific feedback, refine your wording, and make every line count.',
    action: 'Explore resume studio',
    path: '/app/resumes',
  },
  interview: {
    label: 'Mock interviews',
    icon: AudioLines,
    title: 'Meet your next interview, early.',
    description:
      'Find your rhythm with an animated interviewer. Practice your answers, speak or type at your own pace, and return to your conversation.',
    action: 'Start interview practice',
    path: '/app/interviews',
  },
  roadmap: {
    label: 'Career roadmap',
    icon: Route,
    title: 'Big goals. Clear next steps.',
    description:
      'Connect your skills to the career you want. Build a personal learning path and track progress, one achievable milestone at a time.',
    action: 'Find your direction',
    path: '/app/roadmap',
  },
};
type Preview = keyof typeof previews;

export function DimensionLanding() {
  const { data } = useConfig();
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState<Preview>('resume');
  const selected = previews[preview];
  return (
    <div className="dimension-site">
      <a className="dimension-skip" href="#dimension-main">
        Skip to content
      </a>
      <header className="dimension-nav">
        <Link to="/" aria-label="SkillNex home">
          <Logo />
        </Link>
        <nav
          className={menu ? 'dimension-links is-open' : 'dimension-links'}
          aria-label="Main navigation"
        >
          <a onClick={() => setMenu(false)} href="#toolkit">
            The toolkit
          </a>
          <a onClick={() => setMenu(false)} href="#your-path">
            Your path
          </a>
          <Link to="/app/community">
            Community <ArrowUpRight size={12} />
          </Link>
        </nav>
        <div className="dimension-nav-actions">
          <Link className="dimension-signin" to="/login">
            Log in
          </Link>
          <Link className="dimension-button dimension-button-small" to="/signup">
              Create account <ArrowUpRight size={15} />
          </Link>
          <button
            className="dimension-menu"
            type="button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
          >
            {menu ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <main id="dimension-main">
        <section className="dimension-hero">
          <div className="dimension-hero-copy">
            <span className="dimension-eyebrow">
              <i /> YOUR CAREER, IN FOCUS
            </span>
            <h1>
              Prepare for your<br /><span>next opportunity.</span>
            </h1>
            <p>
              Review your resume, practice interviews, and plan your next career move.
              One workspace to turn preparation into progress.
            </p>
            <div className="dimension-hero-actions">
              <Link className="dimension-button" to="/signup">
                Open your workspace <ArrowUpRight size={19} />
              </Link>
              <a className="dimension-text-link" href="#toolkit">
                Explore the tools <ArrowDown size={15} />
              </a>
            </div>
            <div className="dimension-hero-note">
              <span className="dimension-note-icons">
                <Code2 size={14} />
                <Mic size={14} />
                <Sparkles size={14} />
              </span>
              <span>
                Built for students.
                <br />
                <strong>Made for whatever comes next.</strong>
              </span>
            </div>
          </div>
          <WorkspacePreview />
        </section>
        <div className="dimension-ticker" aria-label="SkillNex capabilities">
          <span>
            <Sparkles size={17} />
            AI, ON YOUR SIDE
          </span>
          <span>
            RESUME TO READY <ArrowUpRight size={18} />
          </span>
          <span>MORE PRACTICE. MORE CONFIDENCE.</span>
          <span>
            <Route size={18} />
            YOUR OWN WAY FORWARD
          </span>
        </div>
        <section className="dimension-section" id="toolkit">
          <div className="dimension-section-heading">
            <div>
              <span className="dimension-eyebrow">THE CAREER TOOLKIT</span>
              <h2>
                Every step of your preparation.<br /><span>Connected.</span>
              </h2>
            </div>
            <p>
              Everything connects. From the first line on your resume to the next step on your
              roadmap.
            </p>
          </div>
          <div className="dimension-workbench">
            <div className="dimension-preview-copy">
              <div
                className="dimension-preview-tabs"
                role="group"
                aria-label="Explore career tools"
              >
                {(Object.keys(previews) as Preview[]).map((key) => {
                  const Icon = previews[key].icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={preview === key}
                      onClick={() => setPreview(key)}
                    >
                      <Icon size={16} />
                      {previews[key].label}
                    </button>
                  );
                })}
              </div>
              <div className="dimension-preview-description" aria-live="polite">
                <span className="dimension-feature-number">
                  {preview === 'resume' ? '01' : preview === 'interview' ? '02' : '03'} / BUILT
                  AROUND YOU
                </span>
                <h3>{selected.title}</h3>
                <p>{selected.description}</p>
                <Link className="dimension-text-link" to={selected.path}>
                  {selected.action}
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <span className="dimension-preview-note">
                Illustrative preview · Your workspace uses your own data.
              </span>
            </div>
            <div className={`dimension-preview-visual preview-${preview}`}>
              {preview === 'resume' && (
                <div className="dimension-resume-demo">
                  <div className="dimension-demo-toolbar">
                    <span>
                      <i />
                      <i />
                      <i />
                    </span>
                    <small>YOUR RESUME, REFINED</small>
                    <FileText size={14} />
                  </div>
                  <div className="dimension-demo-paper">
                    <span className="dimension-demo-tag">YOUR NEXT CHAPTER</span>
                    <h4>
                      Alex Morgan<span>Frontend Developer</span>
                    </h4>
                    <div className="dimension-paper-rule" />
                    <small>PROFILE</small>
                    <p>
                      Curious builder. Thoughtful problem solver.
                      <br />
                      Turning ideas into useful experiences.
                    </p>
                    <small>PROJECT EXPERIENCE</small>
                    <div className="dimension-paper-lines">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="dimension-demo-skills">
                      <span>React</span>
                      <span>JavaScript</span>
                      <span>Design systems</span>
                    </div>
                  </div>
                  <div className="dimension-demo-feedback">
                    <span>
                      <Sparkles size={17} />
                    </span>
                    <div>
                      <strong>Small changes. Stronger impact.</strong>
                      <small>Highlight your role in this project.</small>
                    </div>
                    <Check size={16} />
                  </div>
                </div>
              )}
              {preview === 'interview' && (
                <div className="dimension-interview-demo">
                  <div className="dimension-demo-toolbar">
                    <span className="dimension-available">
                      <i />
                      PRACTICE SPACE
                    </span>
                    <Mic size={15} />
                  </div>
                  <div className="dimension-demo-avatar">
                    <Sparkles size={38} strokeWidth={1.1} />
                    <span />
                  </div>
                  <span className="dimension-demo-tag">MEET YOUR AI INTERVIEWER</span>
                  <h4>
                    “Tell me about something
                    <br />
                    you’re proud of building.”
                  </h4>
                  <div className="dimension-demo-wave" aria-hidden="true">
                    {Array.from({ length: 25 }, (_, i) => (
                      <i key={i} style={{ height: `${10 + ((i * 13) % 34)}px` }} />
                    ))}
                  </div>
                  <p>Think it through. Find your words. Try again.</p>
                </div>
              )}
              {preview === 'roadmap' && (
                <div className="dimension-roadmap-demo">
                  <div className="dimension-demo-toolbar">
                    <span className="dimension-available">
                      <i />
                      YOUR PERSONAL PATH
                    </span>
                    <Route size={16} />
                  </div>
                  <h4>
                    From curious
                    <br />
                    to capable.
                  </h4>
                  {[
                    ['01', 'Build your foundation', 'Skills that make the next step possible.'],
                    ['02', 'Make something real', 'Put your learning into a personal project.'],
                    ['03', 'Show what you can do', 'Your portfolio. Your story. Your opportunity.'],
                  ].map(([n, title, detail], i) => (
                    <div className="dimension-path-node" key={n}>
                      <span>{i === 0 ? <Check size={15} /> : n}</span>
                      <div>
                        <strong>{title}</strong>
                        <small>{detail}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="dimension-bento">
            <Link to="/app/assistant" className="dimension-bento-ai">
              <span className="dimension-bento-top">
                <MessageCircle size={23} />
                <ArrowUpRight size={21} />
              </span>
              <h3>
                A question.
                <br />A conversation.
                <br />
                <em>A clearer next step.</em>
              </h3>
              <p>Your AI assistant for ideas, explanations, and everything you’re figuring out.</p>
              <span className="dimension-chat-bubble">
                “Can you help me get started?”
                <Sparkles size={15} />
              </span>
              <small>English, Hindi, or Hinglish. Your choice.</small>
            </Link>
            <Link to="/app/builder" className="dimension-bento-builder">
              <span className="dimension-bento-top">
                <PenLine size={23} />
                <ArrowUpRight size={21} />
              </span>
              <div className="dimension-mini-docs" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <h3>
                Your story.
                <br />
                Beautifully presented.
              </h3>
              <p>
                Six resume styles. Live preview.
                <br />
                PDF and DOCX exports.
              </p>
              <span className="dimension-label">FREE RESUME BUILDER</span>
            </Link>
            <Link to="/app/jobs" className="dimension-bento-match">
              <span className="dimension-bento-top">
                <ScanLine size={23} />
                <ArrowUpRight size={21} />
              </span>
              <div className="dimension-match-art" aria-hidden="true">
                <span />
                <span />
                <Sparkles size={25} />
              </div>
              <h3>
                Find where
                <br />
                you fit.
              </h3>
              <p>Connect your experience to the opportunities that interest you.</p>
              <span className="dimension-label">PERSONAL JOB MATCHING</span>
            </Link>
          </div>
        </section>
        <section className="dimension-section dimension-path-section" id="your-path">
          <div className="dimension-section-heading">
            <div>
              <span className="dimension-eyebrow">02 / FORWARD IS A DIRECTION</span>
              <h2>
                No perfect starting point.
                <br />
                <span>Just your next step.</span>
              </h2>
            </div>
            <Link className="dimension-text-link" to="/signup">
              Let’s find yours <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="dimension-steps">
            {[
              [
                '01',
                'Bring your ambition.',
                'Your skills, your resume, your big “what if.” Start with what you have.',
              ],
              [
                '02',
                'Make it a little stronger.',
                'Get feedback, practice a conversation, or build something worth sharing.',
              ],
              [
                '03',
                'Keep moving forward.',
                'Save your progress and come back to your own workspace.',
              ],
            ].map(([n, title, description]) => (
              <article key={n}>
                <span>
                  {n}
                  <ArrowRight size={18} />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="dimension-section dimension-faq">
          <div>
            <span className="dimension-eyebrow">A LITTLE CLARITY</span>
            <h2>
              Good questions.
              <br />
              <span>Honest answers.</span>
            </h2>
          </div>
          <div>
            {[
              [
                'Can I use SkillNex without an AI connection?',
                'Yes. Build and export resumes, save your profile, and use guided interview practice. Live AI replies, analysis, and personalized AI feedback need a connected provider.',
              ],
              [
                'Does a resume score guarantee an interview?',
                'No. Scores are estimates to help you improve your resume. Hiring decisions depend on the employer and the role.',
              ],
              [
                'Will my work still be here when I return?',
                'Your work is saved to the configured SkillNex database. Sign in with the same account and connect to the same database to access it. Database backups help protect your work.',
              ],
              [
                'Can I practice without using a microphone?',
                'Absolutely. Type your answers, or use voice in a supported browser. You choose how you practice.',
              ],
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span>+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="dimension-final">
          <span className="dimension-final-star" aria-hidden="true">
            ✳
          </span>
          <span className="dimension-eyebrow">YOUR NEXT CHAPTER IS CALLING</span>
          <h2>
            Go make
            <br />
            <span>your next move.</span>
          </h2>
          <div>
            <Link className="dimension-button" to="/signup">
              Let’s get started <ArrowUpRight size={19} />
            </Link>
            {data?.demo && (
              <Link className="dimension-text-link" to="/demo">
                Take a look around <ChevronRight size={17} />
              </Link>
            )}
          </div>
        </section>
      </main>
      <footer className="dimension-footer">
        <Link to="/" aria-label="SkillNex home">
          <Logo />
        </Link>
        <span>A little help. A world of possibility.</span>
        <small>© {new Date().getFullYear()} SkillNex</small>
      </footer>
    </div>
  );
}
