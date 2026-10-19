export type CodeLabDraft = { code: string; savedCode: string; revision: number };
type SavedDraft = { code: string; revision: number };
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const browserStorage = () => sessionStorage;

// One store survives route unmounts. Session storage also survives a page reload,
// while keeping separate tabs, accounts, problems and languages independent.
export class CodeLabDraftStore {
  private snapshot: CodeLabDraft;
  private listeners = new Set<() => void>();

  constructor(
    private key: string,
    initial: SavedDraft,
    private storage: () => DraftStorage = browserStorage,
  ) {
    this.snapshot = { ...initial, savedCode: initial.code };
    try {
      const stored: unknown = JSON.parse(this.storage().getItem(key) || 'null');
      if (validDraft(stored)) {
        if (stored.code === initial.code) this.snapshot = { ...initial, savedCode: initial.code };
        else if (stored.code !== stored.savedCode || stored.revision > initial.revision) this.snapshot = stored;
      }
    } catch { /* The in-memory store still protects SPA navigation. */ }
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  edit = (code: string) => {
    if (code !== this.snapshot.code) this.replace({ ...this.snapshot, code });
  };

  // A response belongs to its captured code, not whatever is now in the editor.
  // A late acknowledgement may advance the saved base, but never replace edits.
  saved(code: string, revision: number) {
    if (revision < this.snapshot.revision) return;
    this.replace({ ...this.snapshot, savedCode: code, revision });
  }

  reconcile(remote: SavedDraft) {
    if (remote.revision <= this.snapshot.revision) return;
    const dirty = this.snapshot.code !== this.snapshot.savedCode;
    // Keep the optimistic revision until the user chooses which version to use.
    if (dirty && remote.code !== this.snapshot.code) return;
    this.resolve(remote, false);
  }

  resolve(remote: SavedDraft, keepEdits: boolean) {
    if (remote.revision < this.snapshot.revision) return;
    this.replace({
      code: keepEdits ? this.snapshot.code : remote.code,
      savedCode: remote.code,
      revision: remote.revision,
    });
  }

  private replace(next: CodeLabDraft) {
    this.snapshot = next;
    try {
      if (next.code === next.savedCode) this.storage().removeItem(this.key);
      else this.storage().setItem(this.key, JSON.stringify(next));
    } catch { /* Keep edits in memory if browser storage is unavailable or full. */ }
    this.listeners.forEach(listener => listener());
  }
}

function validDraft(value: unknown): value is CodeLabDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CodeLabDraft>;
  return typeof draft.code === 'string' && typeof draft.savedCode === 'string'
    && Number.isSafeInteger(draft.revision) && draft.revision! >= 0;
}

const drafts = new Map<string, CodeLabDraftStore>();
export function codeLabDraftKey(userId: string, problemId: number, language: string) {
  return 'skillnex-codelab-draft:' + JSON.stringify([userId, problemId, language]);
}
export function codeLabDraft(userId: string, problemId: number, language: string, initial: SavedDraft) {
  const key = codeLabDraftKey(userId, problemId, language);
  let draft = drafts.get(key);
  if (!draft) {
    draft = new CodeLabDraftStore(key, initial);
    drafts.set(key, draft);
  }
  return draft;
}
