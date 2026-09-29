import type { ApiResponse } from '@/types/api.types';
import type { CountryOption, ProvinceOption, WardOption } from '@/types/address.types';
import { privateApi, publicApi } from '@/utils/axiosInstance';
import Session from '@/utils/session';

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

const readApi = () => (Session.getRawUser() ? privateApi : publicApi);

const data = async <T>(path: string, params?: Record<string, string>) =>
  (await readApi().get<ApiResponse<T>>(path, { params })).data.data;

class GeoApi {
  static countries = () => remembered('countries', () => data<CountryOption[]>('/geo/countries'));

  static provinces = () => remembered('provinces', () => data<ProvinceOption[]>('/geo/provinces'));

  static wards = (provinceCode: string) =>
    remembered(`wards:${provinceCode}`, () => data<WardOption[]>(`/geo/provinces/${provinceCode}/wards`));

  static streets = async (provinceCode: string, q: string) =>
    (await data<{ name: string }[]>(`/geo/provinces/${provinceCode}/streets`, { q })).map((s) => s.name);

  static resetCache = () => memo.clear();
}

export default GeoApi;
