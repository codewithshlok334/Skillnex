import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeLabDraftStore, codeLabDraft, codeLabDraftKey } from './codeLabDraft';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
const initial = { code: '# starter\n', revision: 0 };
afterEach(() => vi.unstubAllGlobals());

describe('CodeLab draft recovery across navigation', () => {
  it('restores exact unfinished code after a reload, including variable names and whitespace', () => {
    const storage = memoryStorage(), key = codeLabDraftKey('student', 1, 'python');
    const first = new CodeLabDraftStore(key, initial, () => storage);
    const code = 'student_total = 0\nfor entry in values:\n    student_total += entry\n';
    first.edit(code);
    const reopened = new CodeLabDraftStore(key, initial, () => storage);
    expect(reopened.getSnapshot()).toEqual({ code, savedCode: initial.code, revision: 0 });
  });

  it('isolates recovery by candidate, problem and programming language', () => {
    const storage = memoryStorage();
    const key = codeLabDraftKey('candidate-a', 1, 'python');
    new CodeLabDraftStore(key, initial, () => storage).edit('private_python_answer');
    for (const identity of [
      ['candidate-b', 1, 'python'], ['candidate-a', 2, 'python'], ['candidate-a', 1, 'java'],
    ] as const) {
      expect(new CodeLabDraftStore(codeLabDraftKey(identity[0], identity[1], identity[2]), initial, () => storage).getSnapshot().code)
        .toBe(initial.code);
    }
  });

  it('keeps a draft through SPA unmount and remount even when browser storage is blocked', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('full'); },
      removeItem: () => { throw new Error('blocked'); },
    });
    const first = codeLabDraft('blocked-storage', 7, 'cpp', initial);
    first.edit('int my_answer = 42;');
    const reopened = codeLabDraft('blocked-storage', 7, 'cpp', initial);
    expect(reopened.getSnapshot().code).toBe('int my_answer = 42;');
  });

  it('keeps edits made after remount when an earlier save finishes late', () => {
    const storage = memoryStorage();
    vi.stubGlobal('sessionStorage', storage);
    const oldWorkspace = codeLabDraft('late-save', 8, 'python', initial);
    oldWorkspace.edit('first_version = 1');
    const submitted = oldWorkspace.getSnapshot();
    const otherProblem = codeLabDraft('late-save', 9, 'python', initial);
    otherProblem.edit('different_problem = 9');
    const reopened = codeLabDraft('late-save', 8, 'python', initial);
    reopened.edit('newer_version = 2');
    oldWorkspace.saved(submitted.code, 1);
    expect(reopened.getSnapshot()).toEqual({ code: 'newer_version = 2', savedCode: 'first_version = 1', revision: 1 });
    expect(otherProblem.getSnapshot().code).toBe('different_problem = 9');
    const reloaded = new CodeLabDraftStore(codeLabDraftKey('late-save', 8, 'python'), initial, () => storage);
    expect(reloaded.getSnapshot()).toEqual(reopened.getSnapshot());
  });

  it('clears only a fully saved draft and ignores acknowledgements older than its saved revision', () => {
    const storage = memoryStorage(), store = new CodeLabDraftStore('saved', initial, () => storage);
    store.edit('first');
    store.saved('first', 1);
    expect(storage.getItem('saved')).toBeNull();
    store.edit('second');
    store.saved('second', 2);
    store.edit('third');
    store.saved('first', 1);
    expect(store.getSnapshot()).toEqual({ code: 'third', savedCode: 'second', revision: 2 });
    expect(storage.getItem('saved')).toContain('third');
  });

  it('refreshes a clean saved draft but preserves unfinished edits when the server changes', () => {
    const storage = memoryStorage(), store = new CodeLabDraftStore('refresh', initial, () => storage);
    store.reconcile({ code: 'saved elsewhere', revision: 1 });
    expect(store.getSnapshot().code).toBe('saved elsewhere');
    store.edit('my unfinished work');
    store.reconcile({ code: 'new remote version', revision: 2 });
    expect(store.getSnapshot()).toEqual({ code: 'my unfinished work', savedCode: 'saved elsewhere', revision: 1 });
    const reopened = new CodeLabDraftStore('refresh', { code: 'new remote version', revision: 2 }, () => storage);
    expect(reopened.getSnapshot()).toEqual(store.getSnapshot());
    reopened.resolve({ code: 'new remote version', revision: 2 }, true);
    expect(reopened.getSnapshot()).toEqual({ code: 'my unfinished work', savedCode: 'new remote version', revision: 2 });
  });

  it('lets the candidate explicitly load the newer saved version instead of recovered edits', () => {
    const storage = memoryStorage(), store = new CodeLabDraftStore('choose', initial, () => storage);
    store.edit('unfinished');
    store.resolve({ code: 'saved in another tab', revision: 1 }, false);
    expect(store.getSnapshot()).toEqual({ code: 'saved in another tab', savedCode: 'saved in another tab', revision: 1 });
    expect(storage.getItem('choose')).toBeNull();
  });

  it('ignores corrupt browser data without blocking the editor', () => {
    const storage = memoryStorage();
    for (const value of ['{broken', 'null', '{"code":3}', '{"code":"a","savedCode":"b","revision":-1}']) {
      storage.setItem('bad', value);
      expect(new CodeLabDraftStore('bad', initial, () => storage).getSnapshot())
        .toEqual({ ...initial, savedCode: initial.code });
    }
  });
});
