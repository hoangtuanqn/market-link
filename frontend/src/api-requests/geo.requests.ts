import type { ApiResponse } from '@/types/api.types';
import type { CountryOption, ProvinceOption, WardOption } from '@/types/address.types';
import { publicApi } from '@/utils/axiosInstance';

/**
 * The same lists open on the sign-up, profile and market forms, and they only change with a migration: keep each one
 * for the session. A failed request is dropped so Retry asks again.
 */
const memo = new Map<string, Promise<unknown>>();

function remembered<T>(key: string, load: () => Promise<T>): Promise<T> {
  const known = memo.get(key) as Promise<T> | undefined;
  if (known) return known;
  const pending = load().catch((error: unknown) => {
    memo.delete(key);
    throw error;
  });
  memo.set(key, pending);
  return pending;
}

const data = async <T>(path: string, params?: Record<string, string>) =>
  (await publicApi.get<ApiResponse<T>>(path, { params })).data.data;

/** FR-001, FR-073 — the lists behind the address fields (docs/api-contract.md §3a). All public. */
class GeoApi {
  static countries = () => remembered('countries', () => data<CountryOption[]>('/geo/countries'));

  /** Vietnam's 34 provinces and centrally run cities. */
  static provinces = () => remembered('provinces', () => data<ProvinceOption[]>('/geo/provinces'));

  static wards = (provinceCode: string) =>
    remembered(`wards:${provinceCode}`, () => data<WardOption[]>(`/geo/provinces/${provinceCode}/wards`));

  /** Up to 20 suggestions; never cached, every keystroke asks something new. */
  static streets = async (provinceCode: string, q: string) =>
    (await data<{ name: string }[]>(`/geo/provinces/${provinceCode}/streets`, { q })).map((s) => s.name);

  /** Tests only: forget the cached lists. */
  static resetCache = () => memo.clear();
}

export default GeoApi;
