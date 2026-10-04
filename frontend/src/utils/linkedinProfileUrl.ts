/** Canonicalise a profile reference only; this does not fetch LinkedIn content. */
export function normalizeLinkedInProfileUrl(value: string): string | null {
  const input = value.trim();
  if (input.length > 500) return null;
  const match = /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/((?:[a-z0-9._-]|%[a-f0-9]{2}){1,200})\/?(?:[?#][^\s]*)?$/i.exec(input);
  if (!match || match[1] === '.' || match[1] === '..') return null;
  return `https://www.linkedin.com/in/${match[1]}/`;
}
