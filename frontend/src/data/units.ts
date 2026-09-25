/**
 * Shared sale units a stall can pick from, copied from docs/prototype/data.js. `builtin` units ship with the platform;
 * the rest were named by a stall ("tray of 30") and are offered to others too.
 *
 * `kind` matters for reports: quantities are only ever added up within one kind, because a kilo and a bunch never sum.
 */
export type UnitKind = 'Weight' | 'Volume' | 'Count' | 'Pack';

export type UnitOption = {
  one: string;
  many: string;
  builtin: boolean;
  kind: UnitKind;
  /** Stall that named it; only set when `builtin` is false. */
  addedBy?: string;
  /** How many products currently use it. */
  used: number;
};

export const UNIT_LIST: UnitOption[] = [
  { one: 'kg', many: 'kg', builtin: true, kind: 'Weight', used: 6 },
  { one: 'g', many: 'g', builtin: true, kind: 'Weight', used: 0 },
  { one: 'bunch', many: 'bunches', builtin: true, kind: 'Count', used: 9 },
  { one: 'piece', many: 'pieces', builtin: true, kind: 'Count', used: 4 },
  { one: 'bulb', many: 'bulbs', builtin: true, kind: 'Count', used: 1 },
  { one: 'dozen', many: 'dozen', builtin: true, kind: 'Count', used: 1 },
  { one: 'bag', many: 'bags', builtin: true, kind: 'Pack', used: 1 },
  { one: 'jar', many: 'jars', builtin: true, kind: 'Pack', used: 3 },
  { one: 'bottle', many: 'bottles', builtin: true, kind: 'Pack', used: 1 },
  { one: 'loaf', many: 'loaves', builtin: true, kind: 'Pack', used: 2 },
  { one: 'tray of 30', many: 'trays of 30', builtin: false, kind: 'Pack', addedBy: 'Ba Lành Farm', used: 1 },
  { one: 'basket', many: 'baskets', builtin: false, kind: 'Pack', addedBy: 'Hóc Môn Greens', used: 0 },
];

export const UNIT_KINDS: UnitKind[] = ['Weight', 'Volume', 'Count', 'Pack'];
