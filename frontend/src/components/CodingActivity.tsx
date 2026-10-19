import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Code2 } from 'lucide-react';
import { api } from '../api/client';
import { useSession } from '../hooks/useSession';
import { Card, ErrorState, Loading } from './Common';
import { activityCalendar, activityDate, activityLevel } from '../utils/codingActivity';
import type { ActivityDay } from '../utils/codingActivity';
import '../coding-activity.css';

type Activity = { year: number; today: string; timeZone: string; firstYear: number; totalSolved: number; solvedThisYear: number; activeDays: number; pendingSubmissions: boolean; days: ActivityDay[] };
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CodingActivity() {
  const { user } = useSession();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selected, setSelected] = useState('');
  const scroll = useRef<HTMLDivElement>(null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const activity = useQuery({
    queryKey: ['codelab-activity', user.id, year, timeZone],
    queryFn: () => api<Activity>('/codelab/activity?' + new URLSearchParams({ year: String(year), timeZone })),
    refetchOnMount: 'always', refetchOnWindowFocus: true,
    refetchInterval: query => query.state.data?.pendingSubmissions ? 2000 : false,
  });
  const data = activity.data;
  const firstYear = useRef(currentYear - 1);
  if (data) firstYear.current = Math.min(firstYear.current, data.firstYear);
  const days = useMemo(() => data ? activityCalendar(year, data.days, data.today) : [], [year, data]);
  const focusDate = days.some(day => day.date === selected && !day.future) ? selected : days.filter(day => !day.future).at(-1)?.date;
  const selectedDay = days.find(day => day.date === focusDate);
  const monthTotals = months.map((_, index) => days.filter(day => Number(day.date.slice(5, 7)) === index + 1).reduce((total, day) => total + day.count, 0));
  useEffect(() => {
    if (!data || !scroll.current) return;
    const today = scroll.current.querySelector<HTMLElement>('[data-today="true"]');
    scroll.current.scrollLeft = today ? Math.max(0, today.offsetLeft - scroll.current.clientWidth / 2) : 0;
  }, [data?.year, user.id]);
  function moveDay(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7, Home: -days[index].weekday, End: 6 - days[index].weekday };
    const delta = offsets[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = days[Math.max(0, Math.min(days.filter(day => !day.future).length - 1, index + delta))];
    setSelected(next.date);
    scroll.current?.querySelector<HTMLButtonElement>(`[data-date="${next.date}"]`)?.focus();
  }
  return <Card className="coding-activity">
    <header className="ca-heading"><div><span className="ca-eyebrow"><Code2 size={16} /> YOUR CODELAB JOURNEY</span><h2>Coding activity</h2><p>Small steps, recorded one day at a time.</p></div>
      <div className="ca-heading-actions"><Link to="/app/codelab">Keep practising <ArrowUpRight size={16} /></Link><label className="ca-year">Year<select aria-label="Coding activity year" value={year} onChange={event => { setYear(Number(event.target.value)); setSelected(''); }}>
        {Array.from({ length: currentYear - firstYear.current + 1 }, (_, i) => currentYear - i).map(value => <option key={value}>{value}</option>)}
      </select></label></div>
    </header>
    {activity.isLoading ? <Loading text="Loading your coding activity…" /> : activity.error ? <ErrorState error={activity.error} retry={() => activity.refetch()} /> : data && <>
      <div className="ca-stats" aria-live="polite"><div><strong>{data.totalSolved}</strong><span>problems solved · all time</span></div><div><strong>{data.solvedThisYear}</strong><span>solved in {year}</span></div><div><strong>{data.activeDays}</strong><span>active {data.activeDays === 1 ? 'day' : 'days'} in {year}</span></div></div>
      <p className="ca-caption">{data.solvedThisYear ? `Your first accepted solutions in ${year}.` : `Your first accepted solution will light up this calendar.`} Each question counts once, after all Submit tests pass.</p>
      <div className="ca-calendar-scroll" ref={scroll} role="group" aria-label={`Daily problems solved in ${year}. Use arrow keys to move between days.`}>
        <div className="ca-calendar" style={{ '--ca-weeks': (days.at(-1)?.week ?? 52) + 1 } as CSSProperties}>
          <div className="ca-month-labels" aria-hidden="true">{months.map((month, index) => <span key={month} style={{ gridColumn: (days.find(day => day.date === `${year}-${String(index + 1).padStart(2, '0')}-01`)?.week ?? 0) + 1 }}>{month}</span>)}</div>
          <div className="ca-weekdays" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
          <div className="ca-days">{days.map((day, index) => <button key={day.date} type="button" className="ca-day" data-level={activityLevel(day.count)} data-date={day.date} data-today={day.date === data.today} data-future={day.future}
            style={{ gridColumn: day.week + 1, gridRow: day.weekday + 1 }} disabled={day.future} tabIndex={day.date === focusDate ? 0 : -1}
            aria-label={`${activityDate(day.date)}: ${day.count} ${day.count === 1 ? 'problem' : 'problems'} solved${day.future ? ' (future date)' : ''}`} aria-pressed={day.date === selected}
            title={`${activityDate(day.date)} · ${day.count} ${day.count === 1 ? 'problem' : 'problems'} solved`}
            onClick={() => setSelected(day.date)} onFocus={() => setSelected(day.date)} onKeyDown={event => moveDay(event, index)} />)}</div>
        </div>
      </div>
      <div className="ca-calendar-footer"><p aria-live="polite">{selectedDay && <><strong>{activityDate(selectedDay.date)}</strong><span> · {selectedDay.count} {selectedDay.count === 1 ? 'problem' : 'problems'} solved</span></>}</p><div className="ca-legend" aria-label="Colour scale: 0, 1, 2–3, 4–5, 6 or more problems"><span>Less</span>{[0, 1, 2, 3, 4].map(level => <i key={level} className="ca-day" data-level={level} aria-hidden="true" />)}<span>More</span></div></div>
      <div className="ca-month-totals" aria-label={`Monthly totals for ${year}`}>{months.map((month, index) => <div key={month}><span>{month}</span><strong>{monthTotals[index]}</strong></div>)}</div>
      <p className="ca-note">Dates follow your time zone ({timeZone.replaceAll('_', ' ')}). Sample runs and repeat solves don’t add to the total.{data.pendingSubmissions && ' A submission is being checked; your activity will update automatically.'}</p>
    </>}
  </Card>;
}
