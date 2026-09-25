/**
 * Demo data for the signed-in Farmer screens, copied from docs/prototype/data.js. Replace with API calls when the
 * endpoints exist.
 */
import type { BarRow } from '@/components/ui/bar-list';
import type { StockRow } from '@/components/ui/stock-list';
import type { OrderStatus } from '@/types/order.types';
import { product } from './catalog';

export type FarmerOrderLine = { productId: number; qty: number };

export type FarmerOrderType = {
  code: string;
  who: string;
  phone: string;
  date: string;
  slot: string;
  items: FarmerOrderLine[];
  status: OrderStatus;
  isNew?: boolean;
  note?: string;
  reason?: string;
  cutoff: string;
};

/** Incoming orders as seen by Farmer Cô Tư Garden (FR-065). */
export const farmerOrders: FarmerOrderType[] = [
  {
    code: '#ML-0421',
    who: 'Minh Anh',
    phone: '0903 ••• 218',
    date: 'Sat 26/09',
    slot: '07:00–07:30',
    items: [
      { productId: 1, qty: 2 },
      { productId: 2, qty: 1 },
      { productId: 7, qty: 1 },
    ],
    status: 'placed',
    isNew: true,
    note: 'Please pick the smaller bunches if you can.',
    cutoff: '19:00 25/09',
  },
  {
    code: '#ML-0420',
    who: 'Trần Phúc',
    phone: '0912 ••• 540',
    date: 'Sat 26/09',
    slot: '07:30–08:00',
    items: [
      { productId: 19, qty: 3 },
      { productId: 7, qty: 2 },
    ],
    status: 'placed',
    isNew: true,
    cutoff: '19:30 25/09',
  },
  {
    code: '#ML-0419',
    who: 'Lan Hương',
    phone: '0987 ••• 031',
    date: 'Sat 26/09',
    slot: '06:30–07:00',
    items: [
      { productId: 1, qty: 5 },
      { productId: 2, qty: 3 },
      { productId: 7, qty: 2 },
      { productId: 19, qty: 1 },
    ],
    status: 'placed',
    cutoff: '18:30 25/09',
  },
  {
    code: '#ML-0418',
    who: 'Quốc Bảo',
    phone: '0938 ••• 776',
    date: 'Sun 27/09',
    slot: '06:00–06:30',
    items: [
      { productId: 2, qty: 2 },
      { productId: 1, qty: 1 },
    ],
    status: 'placed',
    cutoff: '18:00 26/09',
  },
  {
    code: '#ML-0412',
    who: 'Minh Khang',
    phone: '0903 ••• 218',
    date: 'Sat 26/09',
    slot: '07:00–07:30',
    items: [
      { productId: 1, qty: 2 },
      { productId: 2, qty: 1 },
    ],
    status: 'accepted',
    cutoff: '19:00 25/09',
  },
  {
    code: '#ML-0411',
    who: 'Thu Thảo',
    phone: '0909 ••• 402',
    date: 'Sat 26/09',
    slot: '08:00–08:30',
    items: [{ productId: 7, qty: 4 }],
    status: 'accepted',
    cutoff: '20:00 25/09',
  },
  {
    code: '#ML-0405',
    who: 'Đức Anh',
    phone: '0916 ••• 118',
    date: 'Sat 26/09',
    slot: '06:00–06:30',
    items: [{ productId: 1, qty: 6 }],
    status: 'accepted',
    cutoff: '18:00 25/09',
  },
  {
    code: '#ML-0396',
    who: 'Hồng Nhung',
    phone: '0934 ••• 550',
    date: 'Fri 25/09',
    slot: '06:30–07:00',
    items: [{ productId: 2, qty: 2 }],
    status: 'ready',
    cutoff: '18:30 24/09',
  },
  {
    code: '#ML-0381',
    who: 'Minh Khang',
    phone: '0903 ••• 218',
    date: 'Sat 19/09',
    slot: '06:30–07:00',
    items: [
      { productId: 1, qty: 3 },
      { productId: 19, qty: 2 },
    ],
    status: 'completed',
    cutoff: '18:30 18/09',
  },
  {
    code: '#ML-0374',
    who: 'Bích Ngọc',
    phone: '0922 ••• 833',
    date: 'Sat 19/09',
    slot: '07:00–07:30',
    items: [{ productId: 2, qty: 4 }],
    status: 'completed',
    cutoff: '19:00 18/09',
  },
  {
    code: '#ML-0366',
    who: 'Văn Long',
    phone: '0918 ••• 097',
    date: 'Sun 13/09',
    slot: '06:00–06:30',
    items: [{ productId: 1, qty: 10 }],
    status: 'declined',
    reason: 'Not enough stock after the rain.',
    cutoff: '18:00 12/09',
  },
  {
    code: '#ML-0360',
    who: 'Kim Chi',
    phone: '0901 ••• 664',
    date: 'Sat 12/09',
    slot: '07:30–08:00',
    items: [{ productId: 7, qty: 1 }],
    status: 'cancelled',
    cutoff: '19:30 11/09',
  },
];

export function farmerOrderTotal(order: FarmerOrderType): number {
  return order.items.reduce((sum, i) => sum + i.qty * (product(i.productId)?.price ?? 0), 0);
}

/** Stock for Saturday's market day (FR-063). */
export const stockForSaturday: StockRow[] = [
  { name: 'Củ Chi water spinach', left: 12, total: 20 },
  { name: 'Choy sum', left: 8, total: 15 },
  { name: 'Thai basil', left: 30, total: 40 },
  { name: 'Lemongrass', left: 22, total: 25 },
];

/** Best sellers in September (FR-069). */
export const bestSellers: BarRow[] = [
  { label: 'Củ Chi water spinach', value: 64, suffix: 'bunches' },
  { label: 'Choy sum', value: 41, suffix: 'bunches' },
  { label: 'Thai basil', value: 38, suffix: 'bunches' },
  { label: 'Lemongrass', value: 20, suffix: 'bunches' },
];

export const overviewSpark = {
  orders: [78, 82, 91, 88, 97, 103, 99, 108, 114, 119, 123, 128],
  revenue: [520, 610, 585, 700, 760, 690, 810, 880, 845, 910, 980, 1050],
};
