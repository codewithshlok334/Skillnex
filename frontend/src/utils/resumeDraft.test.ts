import { describe, expect, it } from 'vitest';
import { readResumeDraft } from './resumeDraft';

const draft = {
  name: 'Asha',
  contact: 'asha@example.test',
  template: 'minimal',
  sections: [{ id: 'skills', title: 'Skills', content: 'Java, SQL' }],
};

describe('saved resume drafts', () => {
  it('preserves valid user content and ordering', () => {
    expect(readResumeDraft(draft)).toEqual(draft);
  });
  it('rejects malformed sections instead of crashing the builder', () => {
    for (const sections of [null, {}, [null], [{ id: 'skills', title: 'Skills' }]]) {
      expect(readResumeDraft({ ...draft, sections })).toBeNull();
    }
    expect(readResumeDraft(null)).toBeNull();
    expect(readResumeDraft({ ...draft, name: null })).toBeNull();
  });
  it('rejects duplicate section identifiers that would edit multiple sections', () => {
    expect(
      readResumeDraft({ ...draft, sections: [draft.sections[0], draft.sections[0]] }),
    ).toBeNull();
  });
  it('keeps the content of an older draft with an unknown template', () => {
    expect(readResumeDraft({ ...draft, template: 'old-template' })).toEqual(draft);
  });
});
