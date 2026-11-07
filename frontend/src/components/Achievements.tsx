import { useId } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import '../achievements.css';

export type EarnedAward = { id: string; name: string; description: string };
export const achievementCollection = [
  { id: 'learning-first', name: 'First Finish', color: '#13a798', dark: '#075a58', light: '#b1fff1', symbol: 'flag', criteria: '1 accepted CodeLab problem, or a completed mock with 10+ answered questions.' },
  { id: 'learning-sharp', name: 'Sharp Thinker', color: '#9170ed', dark: '#46317c', light: '#e5d7ff', symbol: 'brain', criteria: '5 distinct Medium/Hard CodeLab solves, or 70% in a 20+ question mock.' },
  { id: 'learning-high', name: 'High Scorer', color: '#338ed3', dark: '#184369', light: '#c3eaff', symbol: 'trophy', criteria: '10 distinct CodeLab solves, or 85% in a 20+ question mock.' },
  { id: 'learning-perfect', name: 'Perfect Round', color: '#e6a936', dark: '#81551b', light: '#fff0b2', symbol: 'crown', criteria: '5 CodeLab problems accepted on their first judged submission, or 100% in a 20+ question mock.' },
  { id: 'learning-hard', name: 'Hard Mode Hero', color: '#ef7955', dark: '#883d35', light: '#ffd5a7', symbol: 'flame', criteria: '1 Hard CodeLab solve, or 85% in a 20+ question all-Hard mock.' },
] as const;

export function AchievementSticker({ id, locked = false }: { id: string; locked?: boolean }) {
  const unique = useId().replace(/:/g, '');
  const badge = achievementCollection.find(b => b.id === id);
  if (!badge) return null;
  return <svg className={'achievement-sticker' + (locked ? ' is-locked' : '')} viewBox="0 0 144 156" role="img" aria-label={badge.name + (locked ? ', locked' : ', earned')}>
    <defs><linearGradient id={unique + 'shield'} x1="0" y1="0" x2=".8" y2="1"><stop stopColor={badge.light} /><stop offset=".45" stopColor={badge.color} /><stop offset="1" stopColor={badge.dark} /></linearGradient><linearGradient id={unique + 'face'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={badge.dark} /><stop offset="1" stopColor={badge.color} /></linearGradient></defs>
    <path d="M41 113 28 148 50 141 61 154 74 119M103 113l13 35-22-7-11 13-13-35" fill={badge.dark} stroke="#eaf6f5" strokeWidth="3" strokeLinejoin="round" />
    <path d="M72 5 123 26 133 76 110 118 72 136 34 118 11 76 21 26Z" fill={'url(#' + unique + 'shield)'} stroke="#f2f9f8" strokeWidth="4" strokeLinejoin="round" />
    <path d="m72 17 41 17 9 41-20 34-30 15-30-15-20-34 9-41Z" fill={'url(#' + unique + 'face)'} stroke={badge.light} strokeWidth="1.5" />
    <path d="M34 82q2 18 19 28M110 82q-2 18-19 28" fill="none" stroke={badge.light} strokeWidth="2" strokeLinecap="round" opacity=".7" />
    <path d="m34 90-8-7 3 12 10 3m-1 2-3 10 11-2m64-18 8-7-3 12-10 3m1 2 3 10-11-2" fill={badge.light} opacity=".65" />
    <g fill="none" stroke={badge.light} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      {badge.symbol === 'flag' && <><path d="M55 93V47m1 1c13-13 25 10 38-2v29c-13 12-25-11-38 2" /><path d="m65 57 8 4v10l-8-4zm15 6 8-3v10l-8 3" fill={badge.light} strokeWidth="1" /></>}
      {badge.symbol === 'brain' && <><path d="M72 46c-9-14-25-2-21 9-13 4-13 22-3 26-4 15 17 23 24 10 7 13 28 5 24-10 10-4 10-22-3-26 4-11-12-23-21-9v45" /><path d="M57 55c10 0 10 10 5 15m-7 12c7-4 13 1 13 6m19-33c-10 0-10 10-5 15m7 12c-7-4-13 1-13 6" /></>}
      {badge.symbol === 'trophy' && <><path d="M55 46h34v19c0 24-34 24-34 0Zm0 5H44v9c0 11 8 14 17 14m28-23h11v9c0 11-8 14-17 14M72 84v15m-13 0h26" /><path d="m72 53 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill={badge.light} strokeWidth="1" /></>}
      {badge.symbol === 'crown' && <><path d="m46 59 14 11 12-23 12 23 14-11-7 32H53Z" fill={badge.color} /><path d="M55 99h34" /><circle cx="46" cy="54" r="3" fill={badge.light} /><circle cx="72" cy="42" r="3" fill={badge.light} /><circle cx="98" cy="54" r="3" fill={badge.light} /><path d="m72 72 4 7-4 6-4-6Z" fill={badge.light} strokeWidth="1" /></>}
      {badge.symbol === 'flame' && <><path d="M72 40c5 19 25 24 22 42-2 24-43 26-45 0-1-12 5-19 13-27-1 10 3 13 6 15 8-12 7-20 4-30Z" fill={badge.color} /><path d="M73 74c1 9 11 11 9 18-3 10-18 8-18-2 0-5 4-10 9-16Z" fill={badge.light} strokeWidth="1" /></>}
    </g><path d="m72 109 2 4 5 1-4 3 1 4-4-2-4 2 1-4-4-3 5-1Z" fill={badge.light} /><path d="m27 25 3 6 7 2-7 2-3 6-2-6-7-2 7-2Z" fill="#fff" opacity=".85" />
  </svg>;
}

export function AchievementCollection({ earnedIds }: { earnedIds: string[] }) {
  const earned = new Set(earnedIds);
  return <section className="achievement-collection" id="achievements"><header><div><span className="achievement-eyebrow"><Sparkles size={15} /> SMALL WINS. YOURS TO KEEP.</span><h2>Achievements / My Stickers</h2><p>Earn them in CodeLab or Aptitude Arena. Each badge stays on your profile.</p></div><span className="achievement-count">{achievementCollection.filter(b => earned.has(b.id)).length} / {achievementCollection.length} earned</span></header>
    <div className="achievement-grid">{achievementCollection.map(b => <article className={'achievement-card ' + (earned.has(b.id) ? 'earned' : 'locked')} key={b.id} style={{ '--badge-color': b.color } as React.CSSProperties}>
      <AchievementSticker id={b.id} locked={!earned.has(b.id)} /><h3>{b.name}</h3><span className="achievement-state">{earned.has(b.id) ? '✓ Earned' : <><LockKeyhole size={11} />Locked</>}</span><p>{b.criteria}</p>
    </article>)}</div><footer><span>CodeLab badges require all Submit test cases to pass. Sample runs do not count.</span><Link to="/app/aptitude">Open Aptitude Arena →</Link><Link to="/app/codelab">Open CodeLab →</Link></footer>
  </section>;
}

const celebrated = new Set<string>();
export function celebrateAchievements(userId: string, awards: EarnedAward[], coins?: { amount: number; balance: number; eventId: string }) {
  let newCoin = false;
  if (coins && coins.amount > 0) {
    const coinKey = 'skillnex-coin:' + userId + ':' + coins.eventId;
    if (!celebrated.has(coinKey)) {
      try { newCoin = !localStorage.getItem(coinKey); localStorage.setItem(coinKey, '1'); } catch { newCoin = true; }
      celebrated.add(coinKey);
    }
  }
  const fresh = awards.filter(a => {
    if (!achievementCollection.some(b => b.id === a.id)) return false;
    const key = 'skillnex-earned:' + userId + ':' + a.id;
    if (celebrated.has(key)) return false;
    try { if (localStorage.getItem(key)) return false; localStorage.setItem(key, '1'); } catch { /* In-memory deduplication still works. */ }
    celebrated.add(key); return true;
  });
  if (!fresh.length && !newCoin) return;
  toast.custom(id => <div className="achievement-popup" role="status"><div className="achievement-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div><button className="achievement-close" aria-label="Dismiss achievement" onClick={() => toast.dismiss(id)}><X size={16} /></button><span className="achievement-popup-kicker">🎉 {fresh.length ? 'ACHIEVEMENT UNLOCKED!' : 'QUESTION CONQUERED!'}</span><div className="achievement-popup-stickers">{fresh.map(b => <AchievementSticker key={b.id} id={b.id} />)}{!fresh.length && newCoin && <span className="skillcoin-art" aria-label="SkillCoin">S<span>✦</span></span>}</div><strong>{fresh.map(b => b.name).join(' · ') || '+1 SkillCoin'}</strong>{newCoin && <div className="achievement-coin">🪙 +1 SkillCoin · {coins?.balance} total</div>}<p>{fresh.length ? `Nicely done! Your ${fresh.length === 1 ? 'sticker is' : 'stickers are'} saved to your profile. 🙌` : 'All Submit tests passed. Keep the streak going! 🙌'}</p><Link to="/app/profile#achievements" onClick={() => toast.dismiss(id)}>View my rewards →</Link><div className="achievement-dismiss-progress" /></div>, { duration: 5500, position: 'top-center', id: 'learning-award-' + userId + '-' + (coins?.eventId || fresh.map(b => b.id).join('-')) });
}
