import { afterEach, describe, expect, it } from 'vitest';
import { money, perUnit, vnd } from './format';
import SettingsStore from './settings';

const NBSP = ' ';

afterEach(() => SettingsStore.set({ language: 'en', units: 'metric' }));

describe('money', () => {
  it('shows whole đồng with the ₫ sign, grouped the English way', () => {
    SettingsStore.set({ language: 'en' });
    expect(money(12000)).toBe(`12,000${NBSP}₫`);
    expect(money(1250000)).toBe(`1,250,000${NBSP}₫`);
    expect(money(0)).toBe(`0${NBSP}₫`);
  });

  it('groups thousands the way the interface language does', () => {
    SettingsStore.set({ language: 'vi' });
    expect(money(12000)).toBe(`12.000${NBSP}₫`);
  });

  it('rounds to a whole đồng, never shows decimals', () => {
    SettingsStore.set({ language: 'en' });
    expect(money(20411.7)).toBe(`20,412${NBSP}₫`);
  });

  it('is the formatter vnd() points to', () => {
    expect(vnd).toBe(money);
  });
});

describe('perUnit', () => {
  it('prices one sale unit in đồng', () => {
    SettingsStore.set({ language: 'en', units: 'metric' });
    expect(perUnit(45000, 'kg')).toBe(`45,000${NBSP}₫ / kg`);
    expect(perUnit(12000, 'bunch')).toBe(`12,000${NBSP}₫ / bunch`);
  });

  it('converts the price per kilo to a price per pound for imperial readers', () => {
    SettingsStore.set({ language: 'en', units: 'imperial' });
    expect(perUnit(45000, 'kg')).toBe(`20,412${NBSP}₫ / lb`);
  });
});
