import { expect, test } from 'vitest';
import { passwordError } from './passwordPolicy';
test('new passwords require 9 characters, capital, number and symbol', () => {
 for (const value of ['Pass123!', 'lowercase1!', 'NoNumbers!', 'NoSymbols1', 'Password1 ']) expect(passwordError(value)).not.toBeNull();
 expect(passwordError('Pass1234!')).toBeNull();expect(passwordError('LongEnough2#')).toBeNull();
});
test('checks encoder length limit without silently truncating passwords', () => {
 expect(passwordError('Aa1!' + 'a'.repeat(68))).toBeNull();
 expect(passwordError('Aa1!' + 'a'.repeat(69))).toContain('too long');
 expect(passwordError('Aa1!' + '🧠'.repeat(18))).toContain('too long');
});
