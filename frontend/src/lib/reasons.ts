import i18n from '@/i18n';

/**
 * The reasons an admin can pick instead of writing one (FR-071, FR-072): rejecting a Farmer's application, suspending a
 * stall, deactivating a customer account. The server still receives one sentence (`composeReason`), the same text it
 * stored before, so nothing changes for the API or for the Farmer reading it back.
 */
export const REASON_CODES = {
  reject: ['incompleteInfo', 'unclearPhotos', 'unreachable', 'notFarmProduce', 'duplicate'],
  suspend: ['complaints', 'notAsDescribed', 'missedPickups', 'rulesBroken', 'ownerRequest'],
  deactivate: ['noShows', 'abusiveMessages', 'fakeAccount', 'fakeReviews', 'ownerRequest'],
} as const;

export type ReasonKind = keyof typeof REASON_CODES;

export type ReasonValue = {
  /** Codes of `REASON_CODES[kind]` the admin ticked. */
  codes: string[];
  /** Anything the admin adds in their own words. */
  note: string;
};

export const emptyReason = (): ReasonValue => ({ codes: [], note: '' });

export const toggleReason = (value: ReasonValue, code: string): ReasonValue => ({
  ...value,
  codes: value.codes.includes(code) ? value.codes.filter((c) => c !== code) : [...value.codes, code],
});

/** The label of one reason, in the admin's language — it is what the recipient reads. */
export const reasonLabel = (kind: ReasonKind, code: string) => i18n.t(`reasons.${kind}.${code}` as never);

/**
 * The sentence sent to the server: the ticked reasons in the order of the list (so two admins ticking the same boxes
 * send the same text), then the note. "A; B. Note." — or just the note, or empty when nothing was given.
 */
export function composeReason(kind: ReasonKind, value: ReasonValue): string {
  const codes: readonly string[] = REASON_CODES[kind];
  const labels = codes.filter((c) => value.codes.includes(c)).map((c) => reasonLabel(kind, c));
  const note = value.note.trim().replace(/\s+/g, ' ');
  const chosen = labels.join('; ');
  if (!chosen) return note;
  return note ? `${chosen}. ${note}` : chosen;
}
