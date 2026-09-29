import { describe, expect, it } from 'vitest';
import type { ShelfLifeGroupDto } from '@/api-requests/shelf-life.requests';
import { extendedBy, matchGuideGroup, maxShelfLifeDays } from './shelfLife';

const group = (groupName: string, examples: string): ShelfLifeGroupDto => ({ groupName, examples, modes: [] });

const vegetables = [
  group('Leafy greens', 'rau muống, cải ngọt, lettuce'),
  group('Fruiting vegetables', 'cà chua, ớt, chili'),
  group('Roots and bulbs', 'cà rốt, khoai lang, carrot'),
];

describe('shelf-life helpers', () => {
  it('allows at most twice the suggestion', () => {
    expect(maxShelfLifeDays(1)).toBe(2);
    expect(maxShelfLifeDays(3)).toBe(6);
  });

  it('counts only the days above the suggestion', () => {
    expect(extendedBy(5, 3)).toBe(2);
    expect(extendedBy(2, 3)).toBe(0);
    expect(extendedBy(9, null)).toBe(0);
  });

  it('picks the group from the product name, ignoring case and accents', () => {
    expect(matchGuideGroup('Rau Muong Củ Chi', vegetables)?.groupName).toBe('Leafy greens');
    expect(matchGuideGroup('Organic carrot', vegetables)?.groupName).toBe('Roots and bulbs');
  });

  it('matches whole words only, so a short example never hides inside another word', () => {
    expect(matchGuideGroup('Cà rốt Đà Lạt', vegetables)?.groupName).toBe('Roots and bulbs');
  });

  it('matches the English plural of an example', () => {
    const fruits = [group('Soft fruit', 'chuối, banana, mango'), group('Thick-skinned fruit', 'cam, orange, pomelo')];
    expect(matchGuideGroup('Carrots', vegetables)?.groupName).toBe('Roots and bulbs');
    expect(matchGuideGroup('Oranges', fruits)?.groupName).toBe('Thick-skinned fruit');
    expect(matchGuideGroup('Sweet potatoes', [group('Roots and bulbs', 'sweet potato')])?.groupName).toBe(
      'Roots and bulbs',
    );
    expect(matchGuideGroup('Carrotcake', vegetables)).toBeUndefined();
  });

  it('prefers the longest matching example', () => {
    const fruit = [group('Tomatoes', 'cà chua'), group('Everything', 'cà')];
    expect(matchGuideGroup('Cà chua bi', fruit)?.groupName).toBe('Tomatoes');
  });

  it('answers nothing for a blank or unknown name', () => {
    expect(matchGuideGroup('', vegetables)).toBeUndefined();
    expect(matchGuideGroup('Mật ong', vegetables)).toBeUndefined();
  });
});
