/**
 * Ho Chi Minh City's 22 administrative units (16 urban districts, 5 rural districts, Thủ Đức city), named the way the
 * rest of the app already writes them ("District 7", "Bình Thạnh", "Thủ Đức" — see `data/home.ts`). Coordinates are an
 * approximate centre for each one, close enough to give the admin a starting view; the pin is still theirs to
 * fine-tune.
 */
export type HcmcDistrict = { name: string; lat: number; lng: number };

export const HCMC_DISTRICTS: HcmcDistrict[] = [
  { name: 'District 1', lat: 10.7756, lng: 106.7019 },
  { name: 'District 3', lat: 10.7843, lng: 106.6883 },
  { name: 'District 4', lat: 10.7594, lng: 106.7014 },
  { name: 'District 5', lat: 10.755, lng: 106.6683 },
  { name: 'District 6', lat: 10.7461, lng: 106.6354 },
  { name: 'District 7', lat: 10.7343, lng: 106.722 },
  { name: 'District 8', lat: 10.7395, lng: 106.6285 },
  { name: 'District 10', lat: 10.7726, lng: 106.6669 },
  { name: 'District 11', lat: 10.7631, lng: 106.65 },
  { name: 'District 12', lat: 10.8672, lng: 106.6413 },
  { name: 'Bình Tân', lat: 10.7652, lng: 106.6047 },
  { name: 'Bình Thạnh', lat: 10.8106, lng: 106.7091 },
  { name: 'Gò Vấp', lat: 10.8386, lng: 106.6652 },
  { name: 'Phú Nhuận', lat: 10.7991, lng: 106.6797 },
  { name: 'Tân Bình', lat: 10.8014, lng: 106.6527 },
  { name: 'Tân Phú', lat: 10.7908, lng: 106.628 },
  { name: 'Bình Chánh', lat: 10.689, lng: 106.5934 },
  { name: 'Cần Giờ', lat: 10.409, lng: 106.9556 },
  { name: 'Củ Chi', lat: 10.9738, lng: 106.493 },
  { name: 'Hóc Môn', lat: 10.8845, lng: 106.5953 },
  { name: 'Nhà Bè', lat: 10.6959, lng: 106.7414 },
  { name: 'Thủ Đức', lat: 10.8494, lng: 106.7537 },
];
