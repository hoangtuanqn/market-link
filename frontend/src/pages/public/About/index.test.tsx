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

/**
 * The dollar, written the way each language writes it. Matching on the word rather than banning "đồng" outright,
 * because Vietnamese says "đồng hồ 24 giờ" for the 24-hour clock in the very same sentence.
 *
 * Key and shape parity across languages is covered once for every namespace in src/i18n/locales.test.ts.
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

describe('About credits name the dollar in every language', () => {
  it('names the dollar, not the dong', () => {
    for (const [lang, file] of Object.entries(LOCALES)) {
      expect(file.credits.localeValue, lang).toContain(DOLLAR[lang as keyof typeof LOCALES]);
    }
  });
});

describe('Engineering team showcase (FR-082)', () => {
  it('renders all 5 real team member names instead of placeholders', () => {
    about();
    expect(screen.getByText('Phạm Hoàng Tuấn')).toBeInTheDocument();
    expect(screen.getByText('Trần Phúc Khang')).toBeInTheDocument();
    expect(screen.getByText('Mai Trung Hậu')).toBeInTheDocument();
    expect(screen.getByText('Lâm Hoàng An')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Hoàng Dũng')).toBeInTheDocument();
    expect(screen.queryByText('Name to add')).not.toBeInTheDocument();
  });
});
