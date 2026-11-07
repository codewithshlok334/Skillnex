export type AptitudeSource = { kind: 'ORIGINAL' | 'GATE_PYQ'; label: string; url?: string; answerKeyUrl?: string; note?: string };
export type AptitudeQuestion = { id: number; title: string; category: string; topic: string; difficulty: string; solved: boolean; source?: AptitudeSource; prompt: string; passage: string; options: string[]; review?: AptitudeFeedback };
export type AptitudeFeedback = { questionId: number; selectedIndex: number | null; correct: boolean; correctIndex: number; explanation: string; source: AptitudeSource; solved?: boolean };
export type AptitudeMock = { id: string; status: 'ACTIVE' | 'COMPLETED'; category: string; difficulty: string; revision: number; total: number; score: number | null; createdAt: number; expiresAt: number; finishedAt: number | null; serverNow: number; answers: Record<string, number>; marked: number[]; questions: AptitudeQuestion[]; marking: string; awards: { id: string; name: string; description: string }[] };
export type TopicProgress = { category: string; topic: string; attempted: number; correct: number; accuracy: number | null };
export type MockSummary = { id: string; status: 'ACTIVE' | 'COMPLETED'; category: string; difficulty: string; score: number | null; total: number; created_ms: number; expires_ms: number; finished_ms: number | null };
export type AptitudeProgress = { attempted: number; correct: number; accuracy: number; solved: number; topics: TopicProgress[]; weakTopics: TopicProgress[]; daily: { date: string; attempted: number; correct: number }[]; mocks: MockSummary[] };
export function remainingSeconds(expiresAt: number, serverNow: number, receivedAt: number, now: number): number {
  return Math.max(0, Math.ceil((expiresAt - serverNow - Math.max(0, now - receivedAt)) / 1000));
}
export function timerLabel(seconds: number): string {
  const bounded = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(bounded / 60)).padStart(2, '0')}:${String(bounded % 60).padStart(2, '0')}`;
}
export function mockTotals(mock: { total: number; score: number | null; answers: Record<string, number>; questions: { id: number }[] }) {
  const answered = mock.questions.filter(q => mock.answers[q.id] !== undefined).length;
  const correct = mock.score ?? 0;
  return { answered, correct, wrong: Math.max(0, answered - correct), skipped: mock.total - answered, percent: Math.round(correct * 100 / Math.max(1, mock.total)) };
}
