type Action = (path: string, data?: unknown) => Promise<boolean>;

// Keep completion and evaluation separate: a failed report can be retried without losing answers.
export async function finishInterview(action: Action) {
  if (!(await action('end'))) return 'end-failed' as const;
  return (await action('report')) ? 'review-ready' as const : 'review-failed' as const;
}

// Persist the answer before requesting AI. A failed follow-up can be retried independently.
export async function saveInterviewTurn(
  action: Action,
  questionId: string,
  text: string,
  lastQuestion: boolean,
  metrics?: {
    inputMode: string;
    responseSeconds: number;
    speechSeconds: number;
    spokenWords: number;
  },
  onSaved?: () => void,
) {
  if (!text.trim()) return 'empty' as const;
  if (!(await action('answer', { questionId, text: text.trim(), ...metrics })))
    return 'save-failed' as const;
  onSaved?.();
  if (lastQuestion) return 'finished' as const;
  return (await action('next')) ? ('advanced' as const) : ('followup-failed' as const);
}
