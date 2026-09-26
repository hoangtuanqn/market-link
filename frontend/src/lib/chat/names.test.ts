import { describe, expect, it } from 'vitest';
import { displayName } from './names';

const person = { userId: 3, fullName: 'Nguyễn Thị Tư', role: 'farmer', image: null, online: false, lastSeenAt: null };

describe('displayName', () => {
  /** A customer messages a stall, not a person's name. */
  it('prefers the stall name', () => {
    expect(displayName({ ...person, farmerId: 30, stallName: 'Cô Tư Garden' })).toBe('Cô Tư Garden');
  });

  it('falls back to the person for a customer', () => {
    expect(displayName({ ...person, role: 'customer' })).toBe('Nguyễn Thị Tư');
  });
});
