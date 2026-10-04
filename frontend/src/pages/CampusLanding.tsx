import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, FileText, Mic, Route, Sparkles, Users, ScanLine, PenLine, Menu, X, Check, GraduationCap, Lightbulb, Target, MessageCircle } from 'lucide-react';
import { Logo } from '../layouts/AppLayout';
import { useConfig } from '../hooks/useSession';
import '../campus.css';

const tools = [
  {icon: FileText, name: 'Resume analyzer', detail: 'Find the gaps. Make every line of your experience count.', path: '/app/resumes', tone: 'ocean'},
  {icon: Mic, name: 'Mock interviews', detail: 'Meet your AI interviewer. Practice with voice or text.', path: '/app/interviews', tone: 'violet'},
  {icon: MessageCircle, name: 'AI assistant', detail: 'Ask a question. Work through an idea. Find your next step.', path: '/app/assistant', tone: 'rose'},
  {icon: Route, name: 'Career roadmap', detail: 'Build a learning plan around the career you want.', path: '/app/roadmap', tone: 'forest'},
  {icon: ScanLine, name: 'Job matching', detail: 'Compare your skills with the opportunities you care about.', path: '/app/jobs', tone: 'amber'},
  {icon: PenLine, name: 'Resume builder', detail: 'Create a polished resume. Export to PDF or DOCX.', path: '/app/builder', tone: 'sky'},
];
const steps = [
  {icon: Users, title: 'Create your profile', detail: 'Your skills, interests and goals'},
  {icon: FileText, title: 'Refine your resume', detail: 'Turn experience into a clear story'},
  {icon: Mic, title: 'Practice interviews', detail: 'Build confidence one answer at a time'},
  {icon: Route, title: 'Build your roadmap', detail: 'Focus on the skills that come next'},
  {icon: Target, title: 'Find your next move', detail: 'Prepare for opportunities that fit'},
];
export function CampusLanding() {
  const [menu,setMenu] = useState(false);
  const page = useRef<HTMLDivElement>(null);
  const {data:config} = useConfig();
  useEffect(() => {
    if (!page.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sections = page.current.querySelectorAll<HTMLElement>('.campus-about, .campus-section, .campus-practice');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.06 });
    sections.forEach(section => { section.classList.add('campus-reveal'); observer.observe(section); });
    return () => { observer.disconnect(); sections.forEach(section => section.classList.remove('campus-reveal')); };
  }, []);
  return <div className="campus-site" ref={page}>
    <a className="campus-skip" href="#campus-main">Skip to content</a>
    <header className="campus-nav" onKeyDown={event => { if(event.key === 'Escape') setMenu(false); }}><Link to="/" aria-label="SkillNex home"><Logo/></Link><nav id="campus-navigation" className={menu ? 'open' : ''} aria-label="Main navigation">
      {[['Home','#campus-main'],['About','#about'],['Career tools','#tools'],['Your journey','#journey'],['FAQ','#faq']].map(([label,href])=><a key={href} href={href} onClick={()=>setMenu(false)}>{label}</a>)}
      <Link className="campus-mobile-login" to="/login">Log in</Link>
    </nav><div><Link className="campus-login" to="/login">Log in</Link><Link className="campus-button small" to="/signup">Get started <ArrowUpRight size={15}/></Link><button className="campus-menu" aria-label={menu?'Close navigation':'Open navigation'} aria-expanded={menu} onClick={()=>setMenu(!menu)} onKeyDown={event => { if(event.key === 'Escape') setMenu(false); }}>{menu?<X/>:<Menu/>}</button></div></header>
    <main id="campus-main">
      <section className="campus-hero">
        <div className="campus-wrap campus-hero-content">
          <div className="campus-hero-copy">
            <span className="campus-eyebrow"><i/> WELCOME TO SKILLNEX</span>
            <h1 className="skillnex-headline">Craft Your <span>Resume.</span><br/>Crack Your <span>Interview</span></h1>
            <p className="campus-hero-description">Big goals deserve a clear direction. Build your resume, find your voice, and prepare for the career you want—with AI by your side.</p>
            <div className="campus-actions"><Link to="/signup" className="campus-button">Build your career <ArrowUpRight size={19}/></Link><Link className="campus-outline" to="/app/interviews"><Mic size={17}/> Practice interview</Link></div>
            <div className="campus-hero-note"><GraduationCap size={17}/><span>Made for students. Built for what comes next.</span></div>
          </div>
          <div className="career-orbit" aria-label="Explore your career workspace">
            <div className="orbit-grid" aria-hidden="true"/><div className="orbit-halo" aria-hidden="true"/>
            <div className="orbit-ring ring-one" aria-hidden="true"/><div className="orbit-ring ring-two" aria-hidden="true"/><div className="orbit-ring ring-three" aria-hidden="true"/>
            <div className="orbit-axis" aria-hidden="true"/><div className="orbit-core" aria-hidden="true"><div className="orbit-core-inner"><img className="skillnex-orbit-mark" src="/brand/skillnex-mark.png" alt="" width="170" height="170"/></div></div>
            <span className="orbit-coordinate" aria-hidden="true">SN / YOUR FUTURE, CONNECTED</span>
            <Link to="/app/resumes" className="orbit-node node-resume"><span><FileText size={20}/></span><div><small>MAKE AN IMPRESSION</small><strong>Resume studio</strong></div><ArrowUpRight size={15}/></Link>
            <Link to="/app/interviews" className="orbit-node node-interview"><span><Mic size={20}/></span><div><small>FIND YOUR VOICE</small><strong>AI interviews</strong></div><ArrowUpRight size={15}/></Link>
            <Link to="/app/roadmap" className="orbit-node node-roadmap"><span><Route size={20}/></span><div><small>BUILD YOUR DIRECTION</small><strong>Your roadmap</strong></div><ArrowUpRight size={15}/></Link>
            <span className="orbit-caption"><Sparkles size={12}/> ONE WORKSPACE. MORE POSSIBILITIES.</span>
          </div>
        </div>
        <div className="campus-wrap campus-hero-bottom"><span>PREPARE. PRACTICE. PROGRESS.</span><a href="#tools">Explore your possibilities <span>↓</span></a><span>COLLEGE & BEYOND ↗</span></div>
      </section>
      <section className="campus-wrap campus-about" id="about"><div><span className="campus-label">PREPARATION MEETS POSSIBILITY</span><h2>Meet <span>SkillNex.</span></h2><p>A connected career workspace for your college years and beyond. Get feedback, build practical skills, and make your next move with a little more confidence.</p><Link className="campus-inline" to="/app">Explore your workspace <ArrowRight size={15}/></Link></div><div className="campus-benefits">{[{icon:Lightbulb,title:'Clarity',text:'Turn your questions into useful next steps.'},{icon:Users,title:'Community',text:'Learn alongside people building their future.'},{icon:GraduationCap,title:'Practice',text:'Prepare through hands-on conversations.'},{icon:Target,title:'Progress',text:'Keep your goals and preparation together.'}].map(({icon:Icon,title,text})=><article key={title}><span><Icon size={27}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="campus-wrap campus-section" id="tools"><div className="campus-section-head"><div><span className="campus-label">01 / YOUR TOOLKIT</span><h2>Every next step.<br/><span>One workspace.</span></h2><p>Six ways to turn potential into progress.</p></div><Link className="campus-inline" to="/app">Open workspace <ArrowUpRight size={17}/></Link></div><div className="campus-tool-grid">{tools.map(({icon:Icon,name,detail,path,tone}, index)=><Link to={path} className={'campus-tool '+tone} key={name}><div className="campus-tool-top"><span className="campus-tool-icon"><Icon size={25} strokeWidth={1.5}/></span><small>0{index+1}</small></div><h3>{name}</h3><p>{detail}</p><span className="campus-tool-action">Explore tool <ArrowUpRight size={17}/></span></Link>)}</div></section>
      <section className="campus-wrap campus-section" id="journey"><div className="campus-section-head"><div><h2>Your next chapter, <span>step by step.</span></h2><p>A practical path from your first question to your next opportunity.</p></div></div><ol className="campus-journey">{steps.map(({icon:Icon,title,detail},i)=><li key={title}><span className="campus-step-icon"><Icon size={22}/></span><small>0{i+1}</small><h3>{title}</h3><p>{detail}</p></li>)}</ol></section>
      <section className="campus-wrap campus-practice"><div className="campus-practice-copy"><span className="campus-label">A LITTLE PRACTICE. A LOT MORE CONFIDENCE.</span><h2>Walk into your next interview <span>prepared.</span></h2><p>Choose your role, meet your animated interviewer, and work through your answers. Use your voice or take your time with text.</p><ul><li><Check size={16}/>Role-focused practice sessions</li><li><Check size={16}/>Saved answers to review afterwards</li><li><Check size={16}/>Guided practice when AI is unavailable</li></ul><Link to="/app/interviews" className="campus-button">Start practicing <ArrowRight size={17}/></Link></div><div className="campus-interview-preview"><div className="campus-preview-top"><span><i/> INTERVIEW STUDIO</span><small>Example question</small></div><div className="campus-avatar"><Mic size={37}/><span/><span/></div><span className="campus-label">LET’S START WITH YOU</span><h3>“Tell me about a project<br/>you’re proud of building.”</h3><div className="campus-wave" aria-hidden="true">{[12,20,32,18,40,25,46,32,18,38,25,14,22].map((height,i)=><i key={i} style={{height}}/>)}</div><p>Your story. Your pace.</p></div></section>
      <section className="campus-wrap campus-section campus-faq" id="faq"><div className="campus-section-head"><div><h2>Good questions. <span>Clear answers.</span></h2><p>A few things to know before you begin.</p></div></div><div className="campus-faq-grid">{[
        ['Who is SkillNex for?','Students and early-career professionals who want to improve their resumes, practice interviews, and plan their learning.'],
        ['Can I use it without an AI connection?','You can build resumes and use guided interview practice without AI. Live chat, resume analysis, and AI feedback need a connected provider.'],
        ['Do I need a microphone?','No. You can type your interview answers. Voice is optional and depends on browser support.'],
        ['Can I export my resume?','Yes. The resume builder offers PDF and DOCX exports with a selection of layouts.'],
        ['Will my progress be saved?','Your work is saved to the configured SkillNex database. Return with the same account and database to access it.'],
        ['Does a resume score guarantee a job?','No. Resume scores are improvement estimates. Employers make their own hiring decisions.'],
      ].map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
      <section className="campus-final"><div className="campus-wrap"><span className="campus-eyebrow">YOU HAVE THE AMBITION.</span><h2>BUILD IT. PRACTICE IT.<br/><span>MAKE YOUR NEXT MOVE.</span></h2><p>Bring your goals. We’ll help you work on the next step.</p><div className="campus-actions"><Link className="campus-button" to="/signup">Get started with SkillNex <ArrowRight size={18}/></Link>{config?.demo&&<Link className="campus-outline" to="/demo">Explore demo</Link>}</div></div></section>
    </main><footer className="campus-footer campus-wrap"><Link to="/" aria-label="SkillNex home"><Logo/></Link><span>Craft Your Resume. Crack Your Interview</span><small>© {new Date().getFullYear()} SkillNex</small></footer>
  </div>;
}
