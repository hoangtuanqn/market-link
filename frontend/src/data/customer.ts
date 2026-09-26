// The sample-data lookup functions are all pure: NO_SIDE_EFFECTS lets the production build drop them (config/wip.ts).
/**
 * Demo data for the signed-in Customer screens, copied from docs/prototype/data.js. Replace with API calls when the
 * endpoints exist.
 */
import type { NotificationKind } from '@/constants/notificationKind';
import type { OrderType } from '@/types/order.types';
import type { ProductType } from '@/types/product.types';
import { markets } from './home';

export type NotificationType = { kind: NotificationKind; title: string; text?: string; time: string; unread?: boolean };

export const categories = [
  'Vegetables',
  'Fruits',
  'Eggs & dairy',
  'Grains, beans & nuts',
  'Meat & poultry',
  'Seafood',
  'Mushrooms',
  'Baked goods',
];

export const notifications: NotificationType[] = [
  {
    kind: 'invite',
    title: 'Do you grow something? Sell it at the market',
    text: 'Your account can become a stall. Apply with a few photos of your plot and an admin reviews it.',
    time: 'Today',
    unread: true,
  },
  {
    kind: 'ready',
    title: 'Order #ML-0409 is ready',
    text: 'Gió Nam Bakery · pick up 07:30–08:00 on Friday 25/09.',
    time: '06:10',
    unread: true,
  },
  {
    kind: 'restock',
    title: 'Goat yogurt is back in stock',
    text: 'Củ Chi Goat Farm just added 20 jars.',
    time: 'Yesterday',
    unread: true,
  },
  {
    kind: 'accepted',
    title: 'Order #ML-0412 was accepted',
    text: 'Cô Tư Garden confirmed it for Saturday 07:00–07:30.',
    time: '24/09',
  },
  {
    kind: 'accepted',
    title: 'Order #ML-0415 was accepted',
    text: 'Út Hiền Orchard confirmed it for Sunday 06:30–07:00.',
    time: '24/09',
  },
  {
    kind: 'announce',
    title: 'Thảo Điền Weekend Market is closed on Sunday 04/10',
    text: 'Orders for that day move to Saturday 03/10.',
    time: '23/09',
  },
  {
    kind: 'declined',
    title: 'Order #ML-0402 was declined',
    text: 'The stall ran out of pomelo. Nothing to pay.',
    time: '18/09',
  },
];

export const farmers = [
  {
    id: 1,
    stall: 'Cô Tư Garden',
    person: 'Nguyễn Thị Tư',
    phone: '0912 440 540',
    stallCode: 'A12',
    lat: 10.8039,
    lng: 106.7334,
    markets: [1, 2],
    days: 'Sat, Sun',
    pickup: '06:00 – 10:30',
    rating: 4.6,
    reviews: 32,
    distance: '2.4 km',
  },
  {
    id: 2,
    stall: 'Út Hiền Orchard',
    person: 'Trần Văn Hiền',
    phone: '0987 210 031',
    stallCode: 'B03',
    lat: 10.8509,
    lng: 106.7719,
    markets: [2],
    days: 'Sat, Sun',
    pickup: '06:00 – 09:30',
    rating: 4.8,
    reviews: 21,
    distance: '4.1 km',
  },
  {
    id: 3,
    stall: 'Củ Chi Goat Farm',
    person: 'Lê Minh Khang',
    phone: '0938 776 220',
    stallCode: 'B07',
    lat: 10.8503,
    lng: 106.7711,
    markets: [2, 3],
    days: 'Sat, Sun',
    pickup: '06:30 – 09:30',
    rating: 4.4,
    reviews: 15,
    distance: '4.1 km',
  },
  {
    id: 4,
    stall: 'Gió Nam Bakery',
    person: 'Phạm Thu Hà',
    phone: '0908 331 905',
    stallCode: 'A04',
    lat: 10.8033,
    lng: 106.7326,
    markets: [1, 3],
    days: 'Fri, Sat',
    pickup: '07:00 – 10:00',
    rating: 4.9,
    reviews: 48,
    distance: '2.4 km',
  },
  {
    id: 5,
    stall: 'Ba Lành Farm',
    person: 'Võ Ba Lành',
    phone: '0913 002 771',
    stallCode: 'A09',
    lat: 10.8041,
    lng: 106.7336,
    markets: [1],
    days: 'Fri, Sat, Sun',
    pickup: '06:00 – 10:30',
    rating: 4.5,
    reviews: 19,
    distance: '2.4 km',
  },
];

/* @__NO_SIDE_EFFECTS__ */
export function farmerName(id: number): string {
  return farmers.find((f) => f.id === id)?.stall ?? '';
}

/* @__NO_SIDE_EFFECTS__ */
export function farmer(id: number) {
  return farmers.find((f) => f.id === id);
}

/* @__NO_SIDE_EFFECTS__ */
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

/* @__NO_SIDE_EFFECTS__ */
export function lineProduct(id: number): OrderLineProduct | undefined {
  return lineProducts.find((p) => p.id === id);
}

/* @__NO_SIDE_EFFECTS__ */
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
    category: 'Eggs & dairy',
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
    category: 'Vegetables',
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

export type WishProductItem = { product: ProductType; saved: string; note?: string };

export const wishProducts: WishProductItem[] = [
  {
    product: {
      id: 4,
      name: 'Goat yogurt',
      stall: 'Củ Chi Goat Farm',
      marketName: 'Thủ Đức Farmers Market',
      category: 'Eggs & dairy',
      price: 35000,
      unit: 'jar',
      stock: 0,
      status: 'sold_out',
      farmerId: 3,
    },
    saved: 'Saved 13/09',
    note: 'Sold out since Sunday',
  },
  {
    product: {
      id: 1,
      name: 'Củ Chi water spinach',
      stall: 'Cô Tư Garden',
      marketName: 'Thảo Điền Weekend Market',
      category: 'Vegetables',
      price: 15000,
      unit: 'bunch',
      stock: 12,
      flag: 'Fresh today',
      status: 'available',
      farmerId: 1,
    },
    saved: 'Saved 19/09',
  },
  {
    product: {
      id: 14,
      name: 'Raw forest honey',
      stall: 'U Minh Forest Honey',
      marketName: 'Phú Mỹ Hưng Saturday Market',
      category: 'Grains, beans & nuts',
      price: 180000,
      was: 195000,
      unit: 'jar',
      stock: 9,
      status: 'available',
      farmerId: 7,
    },
    saved: 'Saved 02/09',
    note: 'Price dropped 15,000 ₫ since you saved it',
  },
  {
    product: {
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
      farmerId: 4,
    },
    saved: 'Saved 07/09',
  },
];
