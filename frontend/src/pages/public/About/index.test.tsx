import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import de from '@/locales/de/About.json';
import en from '@/locales/en/About.json';
import es from '@/locales/es/About.json';
import fr from '@/locales/fr/About.json';
import id from '@/locales/id/About.json';
import ja from '@/locales/ja/About.json';
import ko from '@/locales/ko/About.json';
import th from '@/locales/th/About.json';
import vi from '@/locales/vi/About.json';
import zh from '@/locales/zh/About.json';
import AboutPage from './index';

const about = () =>
  render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );

describe('About page credits (FR-082)', () => {
  it('credits the photo source instead of calling the photos placeholders', () => {
    about();
    expect(screen.getByText(/Unsplash/)).toBeInTheDocument();
  });

  it('names the currency the prices are actually in', () => {
    about();
    // lib/format.ts is locked to USD; the credits line used to say Vietnamese dong.
    expect(screen.getByText(/US dollars/)).toBeInTheDocument();
    expect(screen.queryByText(/Vietnamese đồng/i)).not.toBeInTheDocument();
  });
});

const LOCALES = { de, en, es, fr, id, ja, ko, th, vi, zh };

/** Every key present in `o`, flattened to dotted paths. */
const keysOf = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' ? keysOf(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe('About translations stay in step across all ten languages', () => {
  it('gives every language the same set of keys as English', () => {
    const expected = keysOf(en).sort();
    for (const [lang, file] of Object.entries(LOCALES)) {
      // A missing key falls back to English, so a reader of that language sees a language they did not pick.
      expect(keysOf(file).sort(), lang).toEqual(expected);
    }
  });

  /**
   * The dollar, written the way each language writes it. Matching on the word rather than banning "đồng" outright,
   * because Vietnamese says "đồng hồ 24 giờ" for the 24-hour clock in the very same sentence.
   */
  const DOLLAR: Record<keyof typeof LOCALES, string> = {
    de: 'US-Dollar',
    en: 'US dollars',
    es: 'Dólares estadounidenses',
    fr: 'Dollars américains',
    id: 'Dolar AS',
    ja: '米ドル',
    ko: '미국 달러',
    th: 'ดอลลาร์สหรัฐ',
    vi: 'Đô la Mỹ',
    zh: '美元',
  };

  it('names the dollar, not the dong, in every language', () => {
    for (const [lang, file] of Object.entries(LOCALES)) {
      expect(file.credits.localeValue, lang).toContain(DOLLAR[lang as keyof typeof LOCALES]);
    }
  });
});
