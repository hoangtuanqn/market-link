import { describe, expect, it } from 'vitest';
import { displayName } from './names';

const person = { userId: 3, fullName: 'Nguyễn Thị Tư', role: 'farmer', image: null, online: false, lastSeenAt: null };

describe('displayName', () => {
  /** Khách nhắn cho một sạp, không nhắn cho một cái tên người. */
  it('prefers the stall name', () => {
    expect(displayName({ ...person, farmerId: 30, stallName: 'Cô Tư Garden' })).toBe('Cô Tư Garden');
  });

  it('falls back to the person for a customer', () => {
    expect(displayName({ ...person, role: 'customer' })).toBe('Nguyễn Thị Tư');
  });
});
