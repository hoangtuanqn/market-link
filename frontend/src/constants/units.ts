export type UnitKind = 'weight' | 'volume' | 'count' | 'pack';

export type UnitOption = {
  one: string;
  many: string;
  kind: UnitKind;
};

export const UNITS: UnitOption[] = [
  { one: 'kg', many: 'kg', kind: 'weight' },
  { one: 'g', many: 'g', kind: 'weight' },
  { one: 'litre', many: 'litres', kind: 'volume' },
  { one: 'bunch', many: 'bunches', kind: 'count' },
  { one: 'piece', many: 'pieces', kind: 'count' },
  { one: 'dozen', many: 'dozen', kind: 'count' },
  { one: 'bag', many: 'bags', kind: 'pack' },
  { one: 'box', many: 'boxes', kind: 'pack' },
];

export const pluralOf = (one: string) => UNITS.find((u) => u.one === one)?.many ?? one;
