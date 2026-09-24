/**
 * Demo data for the signed-in Customer screens, copied from docs/prototype/data.js. Replace with API calls when the
 * endpoints exist.
 */
import type { OrderType } from '@/types/order.types';
import type { ProductType } from '@/types/product.types';
import { markets } from './home';

export const farmers = [
  { id: 1, stall: 'Cô Tư Garden', phone: '0912 440 540', stallCode: 'A12', lat: 10.8039, lng: 106.7334 },
  { id: 2, stall: 'Út Hiền Orchard', phone: '0987 210 031', stallCode: 'B03', lat: 10.8509, lng: 106.7719 },
  { id: 3, stall: 'Củ Chi Goat Farm', phone: '0938 776 220', stallCode: 'B07', lat: 10.8503, lng: 106.7711 },
  { id: 4, stall: 'Gió Nam Bakery', phone: '0908 331 905', stallCode: 'A04', lat: 10.8033, lng: 106.7326 },
  { id: 5, stall: 'Ba Lành Farm', phone: '0913 002 771', stallCode: 'A09', lat: 10.8041, lng: 106.7336 },
];

export function farmerName(id: number): string {
  return farmers.find((f) => f.id === id)?.stall ?? '';
}

export function farmer(id: number) {
  return farmers.find((f) => f.id === id);
}

export function marketName(id: number): string {
  return markets.find((m) => m.id === id)?.name ?? '';
}

type OrderLineProduct = { id: number; name: string; price: number; unit: string };

/** Only the products referenced by the demo orders below (id → name/price/unit for the ticket line items). */
const lineProducts: OrderLineProduct[] = [
  { id: 1, name: 'Củ Chi water spinach', price: 15000, unit: 'bunch' },
  { id: 2, name: 'Choy sum', price: 18000, unit: 'bunch' },
  { id: 3, name: 'Green-skin pomelo', price: 65000, unit: 'piece' },
  { id: 4, name: 'Goat yogurt', price: 35000, unit: 'jar' },
  { id: 5, name: 'Sourdough loaf', price: 45000, unit: 'loaf' },
  { id: 6, name: 'Free-range eggs', price: 42000, unit: 'dozen' },
  { id: 7, name: 'Thai basil', price: 8000, unit: 'bunch' },
  { id: 8, name: 'Longan', price: 55000, unit: 'kg' },
  { id: 10, name: 'Rye loaf', price: 55000, unit: 'loaf' },
  { id: 19, name: 'Lemongrass', price: 6000, unit: 'bunch' },
];

export function lineProduct(id: number): OrderLineProduct | undefined {
  return lineProducts.find((p) => p.id === id);
}

export function orderTotal(order: OrderType): number {
  return order.items.reduce((sum, i) => sum + i.qty * (lineProduct(i.productId)?.price ?? 0), 0);
}

export const orders: OrderType[] = [
  {
    code: '#ML-0421',
    farmerId: 1,
    marketId: 1,
    date: 'Sat 26/09/2026',
    slot: '07:00–07:30',
    status: 'placed',
    cutoff: '19:00 25/09',
    items: [
      { productId: 1, qty: 2 },
      { productId: 2, qty: 1 },
      { productId: 7, qty: 1 },
    ],
    history: [['placed', '24/09/2026 09:12', 'You']],
  },
  {
    code: '#ML-0412',
    farmerId: 1,
    marketId: 1,
    date: 'Sat 26/09/2026',
    slot: '07:00–07:30',
    status: 'accepted',
    cutoff: '19:00 25/09',
    items: [
      { productId: 1, qty: 2 },
      { productId: 2, qty: 1 },
      { productId: 3, qty: 1 },
    ],
    history: [
      ['placed', '23/09/2026 20:41', 'You'],
      ['accepted', '24/09/2026 06:55', 'Cô Tư Garden'],
    ],
  },
  {
    code: '#ML-0415',
    farmerId: 2,
    marketId: 2,
    date: 'Sun 27/09/2026',
    slot: '06:30–07:00',
    status: 'accepted',
    cutoff: '18:30 26/09',
    items: [{ productId: 8, qty: 2 }],
    history: [
      ['placed', '23/09/2026 21:10', 'You'],
      ['accepted', '24/09/2026 07:20', 'Út Hiền Orchard'],
    ],
  },
  {
    code: '#ML-0409',
    farmerId: 4,
    marketId: 1,
    date: 'Fri 25/09/2026',
    slot: '07:30–08:00',
    status: 'ready',
    cutoff: '07:30 24/09',
    locked: true,
    items: [
      { productId: 5, qty: 1 },
      { productId: 10, qty: 1 },
    ],
    history: [
      ['placed', '22/09/2026 18:02', 'You'],
      ['accepted', '22/09/2026 19:30', 'Gió Nam Bakery'],
      ['ready', '24/09/2026 06:10', 'Gió Nam Bakery'],
    ],
  },
  {
    code: '#ML-0398',
    farmerId: 3,
    marketId: 2,
    date: 'Sun 20/09/2026',
    slot: '08:00–08:30',
    status: 'completed',
    cutoff: '14:00 19/09',
    locked: true,
    items: [{ productId: 4, qty: 4 }],
    reviewed: false,
    history: [
      ['placed', '18/09/2026 12:00', 'You'],
      ['accepted', '18/09/2026 14:20', 'Củ Chi Goat Farm'],
      ['ready', '20/09/2026 06:30', 'Củ Chi Goat Farm'],
      ['completed', '20/09/2026 08:14', 'Củ Chi Goat Farm'],
    ],
  },
  {
    code: '#ML-0381',
    farmerId: 1,
    marketId: 1,
    date: 'Sat 19/09/2026',
    slot: '06:30–07:00',
    status: 'completed',
    cutoff: '18:30 18/09',
    locked: true,
    items: [
      { productId: 1, qty: 3 },
      { productId: 19, qty: 2 },
    ],
    reviewed: true,
    history: [
      ['placed', '17/09/2026 20:05', 'You'],
      ['accepted', '17/09/2026 21:00', 'Cô Tư Garden'],
      ['ready', '19/09/2026 05:50', 'Cô Tư Garden'],
      ['completed', '19/09/2026 06:48', 'Cô Tư Garden'],
    ],
  },
  {
    code: '#ML-0402',
    farmerId: 2,
    marketId: 2,
    date: 'Sat 19/09/2026',
    slot: '07:00–07:30',
    status: 'declined',
    cutoff: '19:00 18/09',
    locked: true,
    items: [{ productId: 3, qty: 3 }],
    reason: 'The stall ran out of pomelo for this weekend.',
    history: [
      ['placed', '18/09/2026 10:30', 'You'],
      ['declined', '18/09/2026 16:45', 'Út Hiền Orchard'],
    ],
  },
  {
    code: '#ML-0377',
    farmerId: 5,
    marketId: 1,
    date: 'Sun 13/09/2026',
    slot: '08:00–08:30',
    status: 'cancelled',
    cutoff: '20:00 12/09',
    locked: true,
    items: [{ productId: 6, qty: 2 }],
    history: [
      ['placed', '11/09/2026 09:00', 'You'],
      ['accepted', '11/09/2026 11:15', 'Ba Lành Farm'],
      ['cancelled', '12/09/2026 07:40', 'You'],
    ],
  },
];

export const dashboardFavoriteProducts: ProductType[] = [
  {
    id: 4,
    name: 'Goat yogurt',
    stall: 'Củ Chi Goat Farm',
    marketName: 'Thủ Đức Farmers Market',
    category: 'Dairy',
    price: 35000,
    unit: 'jar',
    stock: 0,
    status: 'sold_out',
    favorite: true,
  },
  {
    id: 1,
    name: 'Củ Chi water spinach',
    stall: 'Cô Tư Garden',
    marketName: 'Thảo Điền Weekend Market',
    category: 'Leafy greens',
    price: 15000,
    unit: 'bunch',
    stock: 12,
    flag: 'Fresh today',
    status: 'available',
    favorite: true,
  },
  {
    id: 5,
    name: 'Sourdough loaf',
    stall: 'Gió Nam Bakery',
    marketName: 'Thảo Điền Weekend Market',
    category: 'Baked goods',
    price: 45000,
    unit: 'loaf',
    stock: 15,
    flag: 'Baked at 5am',
    status: 'available',
    favorite: true,
  },
];
