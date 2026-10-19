export type ActivityDay = { date: string; count: number };
export type CalendarDay = ActivityDay & { weekday: number; week: number; future: boolean };

// UTC is used for calendar arithmetic only; the API has already grouped solves in
// the viewer's time zone. Parsing a date-only string in local time can shift it.
export function activityCalendar(year: number, days: ActivityDay[], today: string): CalendarDay[] {
  const counts = new Map(days.map(day => [day.date, day.count]));
  const first = new Date(Date.UTC(year, 0, 1));
  const result: CalendarDay[] = [];
  for (let day = new Date(first); day.getUTCFullYear() === year; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    result.push({ date, count: counts.get(date) ?? 0, weekday: day.getUTCDay(), week: Math.floor((result.length + first.getUTCDay()) / 7), future: date > today });
  }
  return result;
}

export function activityLevel(count: number) { return count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4; }
export function activityDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
}
