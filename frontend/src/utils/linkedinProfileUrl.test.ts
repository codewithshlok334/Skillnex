import { describe, expect, it } from 'vitest';
import { normalizeLinkedInProfileUrl } from './linkedinProfileUrl';

describe('LinkedIn profile reference input', () => {
  it.each([
    'linkedin.com/in/test-member',
    'www.linkedin.com/in/test-member/',
    'https://linkedin.com/in/test-member',
    'http://www.linkedin.com/in/test-member',
    '  linkedin.com/in/test-member/?utm_source=share#profile  ',
    'HTTPS://WWW.LINKEDIN.COM/in/test-member',
  ])('accepts pasted profile links without requiring a scheme: %s', input => {
    expect(normalizeLinkedInProfileUrl(input)).toBe('https://www.linkedin.com/in/test-member/');
  });

  it.each([
    '', 'test member', 'linkedin.com/company/example', 'linkedin.com/in/',
    'https://linkedin.com.evil.test/in/member', 'https://linkedin.com@evil.test/in/member',
    'https://evil.test@linkedin.com/in/member', 'https://linkedin.com:8080/in/member',
    'javascript:alert(1)', 'linkedin.com/in/member/extra', 'linkedin.com/in/../',
    'linkedin.com/in/member\\extra', 'linkedin.com/in/invalid%ZZ',
  ])('rejects invalid profile destinations: %s', input => {
    expect(normalizeLinkedInProfileUrl(input)).toBeNull();
  });
});
