import { describe, expect, it } from 'vitest';
import { REASON_CODES, composeReason, emptyReason, toggleReason } from './reasons';

describe('composeReason (FR-071, FR-072)', () => {
  it('joins the chosen reasons in the order of the list, not the order they were clicked', () => {
    const value = { codes: ['unreachable', 'unclearPhotos'], note: '' };

    expect(composeReason('reject', value)).toBe(
      'The photos are unclear or not of your farm; We could not reach you on your phone number',
    );
  });

  it('adds the note after the chosen reasons', () => {
    const value = { codes: ['unclearPhotos'], note: '  Please send photos of the vegetable beds.  ' };

    expect(composeReason('reject', value)).toBe(
      'The photos are unclear or not of your farm. Please send photos of the vegetable beds.',
    );
  });

  it('is just the note when no reason is chosen, and empty when there is nothing', () => {
    expect(composeReason('suspend', { codes: [], note: 'Call us first.' })).toBe('Call us first.');
    expect(composeReason('suspend', emptyReason())).toBe('');
  });

  it('ignores a code that does not belong to the list', () => {
    expect(composeReason('deactivate', { codes: ['nope', 'noShows'], note: '' })).toBe(
      'Repeatedly ordered and did not collect',
    );
  });

  it('has a label for every code of every list', () => {
    for (const [kind, codes] of Object.entries(REASON_CODES)) {
      for (const code of codes) {
        expect(composeReason(kind as keyof typeof REASON_CODES, { codes: [code], note: '' })).not.toContain('reasons.');
      }
    }
  });
});

describe('toggleReason', () => {
  it('adds a code that is not chosen and removes one that is', () => {
    const once = toggleReason(emptyReason(), 'duplicate');
    expect(once.codes).toEqual(['duplicate']);
    expect(toggleReason(once, 'duplicate').codes).toEqual([]);
  });
});
