/**
 * Shared sale units a stall can pick from, copied from docs/prototype/data.js. `builtin` units ship with the platform;
 * the rest were named by a stall ("tray of 30") and are offered to others too.
 */
export type UnitOption = { one: string; many: string; builtin: boolean };

export const UNIT_LIST: UnitOption[] = [
  { one: 'kg', many: 'kg', builtin: true },
  { one: 'g', many: 'g', builtin: true },
  { one: 'bunch', many: 'bunches', builtin: true },
  { one: 'piece', many: 'pieces', builtin: true },
  { one: 'bulb', many: 'bulbs', builtin: true },
  { one: 'dozen', many: 'dozen', builtin: true },
  { one: 'bag', many: 'bags', builtin: true },
  { one: 'jar', many: 'jars', builtin: true },
  { one: 'bottle', many: 'bottles', builtin: true },
  { one: 'loaf', many: 'loaves', builtin: true },
  { one: 'tray of 30', many: 'trays of 30', builtin: false },
  { one: 'basket', many: 'baskets', builtin: false },
];
