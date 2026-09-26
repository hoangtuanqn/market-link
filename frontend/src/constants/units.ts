/**
 * Selling units a Farmer picks when creating a product (FR-062, FR-022). The fixed list lives in code, not Admin master
 * data: the SRS only lets the Admin manage "product categories", and `db/schema.sql` also only has `products.unit
 * VARCHAR(20)` rather than a units table.
 *
 * `kind` keeps reports from adding wrongly: a kilo and a bunch never add into the same number, so quantities are only
 * totalled within the same kind.
 */
export type UnitKind = 'weight' | 'volume' | 'count' | 'pack';

export type UnitOption = {
  /** The value stored in `products.unit`, also the singular when displayed. */
  one: string;
  /** Plural form — English cannot derive it by a rule so it is written out. */
  many: string;
  kind: UnitKind;
};

/**
 * Chọn lại 2026-09-26: bộ đơn vị phổ biến, chuẩn cho một chợ nông sản — bỏ các đơn vị quá hẹp (bulb, jar, bottle, loaf,
 * "tray of 30") để form gọn và dễ đoán hơn.
 */
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

export const UNIT_KINDS: UnitKind[] = ['weight', 'volume', 'count', 'pack'];

/** The plural form of a known unit; an unknown unit returns itself. */
export const pluralOf = (one: string) => UNITS.find((u) => u.one === one)?.many ?? one;
