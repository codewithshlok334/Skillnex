export type ResumeSection = { id: string; title: string; content: string };
export type ResumeDraft = {
  name: string;
  contact: string;
  template: string;
  sections: ResumeSection[];
};

// A damaged or older browser draft must not prevent the builder from opening.
export function readResumeDraft(value: unknown): ResumeDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Partial<ResumeDraft>;
  if (
    typeof draft.name !== 'string' ||
    typeof draft.contact !== 'string' ||
    !Array.isArray(draft.sections) ||
    !draft.sections.every(
      (section) =>
        section &&
        typeof section.id === 'string' &&
        typeof section.title === 'string' &&
        typeof section.content === 'string',
    ) ||
    new Set(draft.sections.map((section) => section.id)).size !== draft.sections.length
  )
    return null;
  const templates = ['minimal', 'developer', 'fresher', 'modern', 'academic', 'data'];
  return {
    name: draft.name,
    contact: draft.contact,
    template:
      typeof draft.template === 'string' && templates.includes(draft.template)
        ? draft.template
        : 'minimal',
    sections: draft.sections,
  };
}
