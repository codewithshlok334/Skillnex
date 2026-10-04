import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function timestamp(value: string | null | undefined) {
  if (!value) return Date.now();
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + 'Z').getTime();
}
export function date(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) {
  if (!value) return 'On your schedule';
  return new Date(timestamp(value)).toLocaleDateString(undefined, options);
}
export function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
