import { beforeEach, expect, test, vi } from 'vitest';
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), dismiss: vi.fn() } }));
import { toast } from 'sonner';
import { celebrateAchievements } from './Achievements';
const storage = new Map<string, string>();
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) }); });
test('achievement celebration lasts 5.5 seconds and is not repeated on refetch', () => {
 const award = { id: 'learning-first', name: 'First Finish', description: 'First accepted problem' };
 celebrateAchievements('award-user', [award]); celebrateAchievements('award-user', [award]);
 expect(toast.custom).toHaveBeenCalledTimes(1);expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ duration: 5500 }));
 celebrateAchievements('different-user', [award]);expect(toast.custom).toHaveBeenCalledTimes(2);
});
test('each new CodeLab coin celebrates once; zero coins does not celebrate', () => {
 celebrateAchievements('coin-user', [], { amount: 0, balance: 0, eventId: 'run' });expect(toast.custom).not.toHaveBeenCalled();
 celebrateAchievements('coin-user', [], { amount: 1, balance: 1, eventId: 'submit-1' });
 celebrateAchievements('coin-user', [], { amount: 1, balance: 1, eventId: 'submit-1' });expect(toast.custom).toHaveBeenCalledTimes(1);
 celebrateAchievements('coin-user', [], { amount: 1, balance: 2, eventId: 'submit-2' });expect(toast.custom).toHaveBeenCalledTimes(2);
});
