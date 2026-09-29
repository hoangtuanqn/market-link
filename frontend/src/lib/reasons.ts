import i18n from '@/i18n';

export const REASON_CODES = {
  reject: ['incompleteInfo', 'unclearPhotos', 'unreachable', 'notFarmProduce', 'duplicate'],
  suspend: ['complaints', 'notAsDescribed', 'missedPickups', 'rulesBroken', 'ownerRequest', 'shelfLifeViolations'],
  deactivate: ['noShows', 'abusiveMessages', 'fakeAccount', 'fakeReviews', 'ownerRequest'],
} as const;

export type ReasonKind = keyof typeof REASON_CODES;

export type ReasonValue = {
  codes: string[];
  note: string;
};

export const emptyReason = (): ReasonValue => ({ codes: [], note: '' });

export const toggleReason = (value: ReasonValue, code: string): ReasonValue => ({
  ...value,
  codes: value.codes.includes(code) ? value.codes.filter((c) => c !== code) : [...value.codes, code],
});

export const isReasonCode = (kind: ReasonKind, code: string): boolean =>
  (REASON_CODES[kind] as readonly string[]).includes(code);

export const reasonLabel = (kind: ReasonKind, code: string) => i18n.t(`reasons.${kind}.${code}` as never);

export function composeReason(kind: ReasonKind, value: ReasonValue): string {
  const codes: readonly string[] = REASON_CODES[kind];
  const labels = codes.filter((c) => value.codes.includes(c)).map((c) => reasonLabel(kind, c));
  const note = value.note.trim().replace(/\s+/g, ' ');
  const chosen = labels.join('; ');
  if (!chosen) return note;
  return note ? `${chosen}. ${note}` : chosen;
}
