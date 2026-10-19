import { describe, expect, it } from 'vitest';
import { syncCommunitySearch } from './communitySearch';

describe('Community search navigation', () => {
  it('opens a URL search on its first page with matching input text', () => {
    expect(syncCommunitySearch(null, 'arrays')).toEqual({ query: 'arrays', search: 'arrays', page: 0 });
  });

  it('resets pagination before a global search requests a narrower set of results', () => {
    const previous = { query: 'java', search: 'java', page: 3 };
    expect(syncCommunitySearch(previous, 'binary search'))
      .toEqual({ query: 'binary search', search: 'binary search', page: 0 });
  });

  it('syncs browser Back/Forward searches and clearing the URL query', () => {
    const first = { query: 'java', search: 'unfinished text', page: 2 };
    const next = syncCommunitySearch(first, 'python');
    expect(syncCommunitySearch(next, 'java')).toEqual({ query: 'java', search: 'java', page: 0 });
    expect(syncCommunitySearch(next, '')).toEqual({ query: '', search: '', page: 0 });
  });

  it('preserves pagination and unfinished typing while the URL search stays the same', () => {
    const current = { query: 'java', search: 'new text not yet submitted', page: 2 };
    expect(syncCommunitySearch(current, 'java')).toBe(current);
  });
});
