import { describe, expect, it } from 'vitest';
import Helper from './helper';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

describe('Helper.mediaUrl', () => {
  it('prefixes backend uploads with the API origin', () => {
    expect(Helper.mediaUrl('/uploads/market-images/cho-ba-chieu.jpg')).toBe(
      `${API}/uploads/market-images/cho-ba-chieu.jpg`,
    );
  });

  it('keeps the frontend public files on the frontend origin', () => {
    expect(Helper.mediaUrl('/images/markets/market-1.jpg')).toBe('/images/markets/market-1.jpg');
  });

  it('keeps full URLs and returns an empty string for no image', () => {
    expect(Helper.mediaUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(Helper.mediaUrl(null)).toBe('');
  });
});
