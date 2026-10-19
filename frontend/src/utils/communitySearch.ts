export type CommunitySearch = { query: string; search: string; page: number };

// Derive this before requesting results, so a new URL never requests the old
// search's page while an effect is waiting to reset the form.
export function syncCommunitySearch(current: CommunitySearch | null, query: string): CommunitySearch {
  return current?.query === query ? current : { query, search: query, page: 0 };
}
