export const passwordRuleMessage = 'Use 9+ characters, 1 capital letter, 1 number and 1 special symbol.';
export function passwordChecks(password: string) {
 return [
  { label: '9+ characters', passed: Array.from(password).length >= 9 },
  { label: 'A–Z', passed: /[A-Z]/.test(password) },
  { label: '0–9', passed: /[0-9]/.test(password) },
  { label: '@#$…', passed: /[^\p{L}\p{N}\s]/u.test(password) },
 ];
}
export function passwordError(password: string): string | null {
 if (new TextEncoder().encode(password).length > 72) return 'Password is too long. Please use a shorter password.';
 return passwordChecks(password).every(rule => rule.passed) ? null : passwordRuleMessage;
}
