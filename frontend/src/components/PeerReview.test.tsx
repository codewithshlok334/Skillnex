import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PeerReview } from './PeerReview';
import type { PeerReviewV2 } from '../utils/peerCall';

describe('two-person interview review', () => {
  it('shows each participant separately and does not turn missing evidence into zero points', () => {
    const report: PeerReviewV2 = {
      version: 2, summary: 'Saved answers reviewed.', coverage: 'Transcript only.', reviewedEntries: 1, totalEntries: 1,
      participants: [
        { userId: 'one', name: 'Asha', roles: ['candidate'], coverage: 'One saved answer.', evidenceEntries: 1, overallScore: 72,
          criteria: [{ key: 'clarity', label: 'Clarity', score: 72, reason: 'Explained the steps.' }], strengths: ['Explained the steps.'],
          mistakes: [{ noteId: 'note-1', quote: 'any array', issue: 'Binary search needs ordering.', improvement: 'State the sorted-input requirement.' }], improvements: [], nextSteps: ['Explain an example.'] },
        { userId: 'two', name: 'Kabir', roles: [], coverage: 'No saved answers.', evidenceEntries: 0, overallScore: null,
          criteria: [{ key: 'clarity', label: 'Clarity', score: null, reason: 'No evidence.' }], strengths: [], mistakes: [], improvements: [], nextSteps: ['Save an answer.'] },
      ],
    };
    const html = renderToStaticMarkup(<PeerReview report={report} userId="one" />);
    expect(html).toContain('Asha'); expect(html).toContain('Kabir'); expect(html).toContain('72');
    expect(html).toContain('Not scored'); expect(html).toContain('Not enough evidence'); expect(html).not.toContain('0/100');
    expect(html).toContain('href="#peer-note-note-1"'); expect(html).toContain('Binary search needs ordering.');
    expect(html).toContain('not voice, video or a hiring decision');
  });
  it('keeps legacy personal reports readable without implying they reviewed both users', () => {
    const html = renderToStaticMarkup(<PeerReview userId="one" report={{ summary: 'Old review', coverage: 'Private notes only', strengths: [], mistakes: [], nextSteps: [], reviewedEntries: 1, totalEntries: 1 }} />);
    expect(html).toContain('earlier personal review'); expect(html).toContain('Refresh the review');
  });
});
