import { describe, expect, it } from 'vitest';
import { toMarket, type MarketDto } from './catalog.requests';

const dto: MarketDto = {
  id: 3,
  marketName: 'Chợ Bến Thành',
  address: 'Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh',
  addressParts: { countryCode: 'VN', provinceCode: '79', wardCode: '26743', streetName: 'Lê Lợi' },
  wardName: 'Phường Bến Thành',
  provinceName: 'Thành phố Hồ Chí Minh',
  latitude: 10.7725,
  longitude: 106.698,
  mapProvider: 'osm',
  openingTime: '06:00',
  closingTime: '19:00',
  images: [],
  operatingDays: [1, 2, 3],
  farmerCount: 4,
};

describe('toMarket (FR-010, FR-073)', () => {
  it('uses the ward as the area a market is filtered by', () => {
    const market = toMarket(dto);

    expect(market.area).toBe('Phường Bến Thành');
    expect(market.addressParts).toEqual(dto.addressParts);
  });

  it('falls back to the province, then to nothing, for a market saved before addresses had parts', () => {
    expect(toMarket({ ...dto, wardName: null }).area).toBe('Thành phố Hồ Chí Minh');
    expect(toMarket({ ...dto, wardName: null, provinceName: null, addressParts: null }).area).toBe('');
    expect(toMarket({ ...dto, addressParts: null }).addressParts).toBeUndefined();
  });
});
