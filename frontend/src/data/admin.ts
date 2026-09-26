// The sample-data lookup functions are all pure: NO_SIDE_EFFECTS lets the production build drop them (config/wip.ts).
/**
 * Demo data for the Admin screens, copied from docs/prototype/data.js. Replace with API calls when the endpoints exist.
 *
 * Only the Farmer screens talk to a real backend today (FR-071); markets, orders, products and categories have no
 * tables yet, so every figure below is the frozen prototype data. Keeping it frozen is the point: the same stall, order
 * and total shows up on the dashboard, the reports and the revenue screen.
 *
 * Copy a human reads (headings, hints, empty states) lives in the locale files, not here. What stays here is the demo
 * record itself — names, dates, amounts — exactly as a response body would carry it.
 */
import type { OrderStatus } from '@/types/order.types';

/* ------------------------------------------------------------------ people */

export type AdminCustomerStatus = 'active' | 'inactive';

export type AdminCustomerType = {
  id: number;
  name: string;
  email: string;
  phone: string;
  joined: string;
  orders: number;
  status: AdminCustomerStatus;
  /** Why the account was deactivated; only set when status is `inactive`. */
  reason?: string;
};

export const customers: AdminCustomerType[] = [
  {
    id: 1,
    name: 'Nguyễn Minh Khang',
    email: 'khang@example.com',
    phone: '0903 118 218',
    joined: '01/08/2026',
    orders: 8,
    status: 'active',
  },
  {
    id: 2,
    name: 'Phạm Minh Anh',
    email: 'minhanh@example.com',
    phone: '0903 552 218',
    joined: '03/08/2026',
    orders: 14,
    status: 'active',
  },
  {
    id: 3,
    name: 'Trần Phúc',
    email: 'phuc.tran@example.com',
    phone: '0912 010 540',
    joined: '11/08/2026',
    orders: 5,
    status: 'active',
  },
  {
    id: 4,
    name: 'Lê Lan Hương',
    email: 'lanhuong@example.com',
    phone: '0987 300 031',
    joined: '15/08/2026',
    orders: 11,
    status: 'active',
  },
  {
    id: 5,
    name: 'Account 4471',
    email: 'promo4471@example.com',
    phone: '0900 000 471',
    joined: '30/08/2026',
    orders: 1,
    status: 'inactive',
    reason: 'Posted advertising in reviews on 02/09/2026.',
  },
  {
    id: 6,
    name: 'Võ Quốc Bảo',
    email: 'quocbao@example.com',
    phone: '0938 900 776',
    joined: '02/09/2026',
    orders: 3,
    status: 'active',
  },
];

/* @__NO_SIDE_EFFECTS__ */
export function adminCustomer(id: number): AdminCustomerType | undefined {
  return customers.find((c) => c.id === id);
}

/** Counts behind the filter chips on the customers list. The demo table only holds six of the 412. */
export const customerCounts = { all: 412, active: 409, inactive: 3, joinedThisMonth: 37 };

/** Extra detail shown on one customer, beyond what the list carries. Keyed by customer id. */
export const customerDetail: Record<
  number,
  {
    address: string;
    lastOrder: string;
    collected: number;
    noShows: number;
    noShowDate: string;
    market: string;
    buysMostFrom: string;
  }
> = {
  1: {
    address: '21 Thảo Điền, Thảo Điền Ward, Thủ Đức City',
    lastOrder: '24/09/2026',
    collected: 7,
    noShows: 1,
    noShowDate: '12/09/2026',
    market: 'Thảo Điền Weekend Market',
    buysMostFrom: 'Cô Tư Garden',
  },
};

/** The account history timeline on the customer detail screen. `status` only picks the dot colour and glyph. */
export type AccountEventType = {
  status: OrderStatus;
  /** Resolves under `timeline.` in the AdminCustomerDetail locale file. */
  titleKey: 'created' | 'firstCollected' | 'noShow' | 'lastOrder';
  time: string;
  detail: string;
};

export const customerTimeline: AccountEventType[] = [
  { status: 'accepted', titleKey: 'created', time: '01/08/2026 20:31', detail: 'Signed up with an email address' },
  {
    status: 'completed',
    titleKey: 'firstCollected',
    time: '17/08/2026 07:12',
    detail: 'Cô Tư Garden · Thảo Điền Weekend Market',
  },
  { status: 'cancelled', titleKey: 'noShow', time: '12/09/2026 11:00', detail: 'Order #ML-0388 was never collected' },
  { status: 'placed', titleKey: 'lastOrder', time: '24/09/2026 09:12', detail: 'Awaiting the stall' },
];

/* ------------------------------------------------------------- marketplace */

/**
 * One-off market closures: a day the market does not open even though it falls on an operating day. `handling` is what
 * happens to orders already placed for that day — the SRS does not define it, so the screen marks it as open.
 */
export type ClosureHandling = 'move' | 'contact' | 'cancel';

export type ClosureType = {
  id: number;
  marketId: number;
  date: string;
  /** English weekday name; the screen shows it under the date. */
  weekday: string;
  reason: string;
  handling: ClosureHandling;
  /** Orders already placed for that day. */
  orders: number;
  announced: boolean;
  by: string;
};

export const CLOSURE_HANDLINGS: ClosureHandling[] = ['move', 'contact', 'cancel'];

export const closures: ClosureType[] = [
  {
    id: 1,
    marketId: 1,
    date: '04/10/2026',
    weekday: 'Sunday',
    reason: 'Ward street works on Quốc Hương',
    handling: 'move',
    orders: 6,
    announced: true,
    by: 'Admin · 23/09/2026',
  },
  {
    id: 2,
    marketId: 4,
    date: '21/10/2026',
    weekday: 'Wednesday',
    reason: 'Public holiday',
    handling: 'cancel',
    orders: 0,
    announced: false,
    by: 'Admin · 24/09/2026',
  },
];

/** Notes a market keeps for its stalls, plus when it was added. Keyed by market id. */
export const marketAdmin: Record<number, { added: string; notes: string }> = {
  1: { added: '01/08/2026', notes: 'Loading from Quốc Hương only. Stalls A01–A20 along the river.' },
  2: { added: '05/08/2026', notes: 'Park on Võ Văn Ngân. Stalls B01–B12 under the roof.' },
  3: { added: '18/08/2026', notes: 'Enter from Nguyễn Đức Cảnh. Stalls C01–C14 around the square.' },
  4: { added: '02/09/2026', notes: 'Bring your own table. Stalls D01–D10 along the wall.' },
};

/* -------------------------------------------------------------- moderation */

/** An item an admin has already hidden. Kept in the database with its reason (FR-074). */
export type HiddenItemType = { id: number; item: string; owner: string; reason: string; hiddenOn: string };

export const hiddenItems: HiddenItemType[] = [
  { id: 1, item: 'Review on “Straw mushrooms”', owner: 'Account 4471', reason: 'Advertising', hiddenOn: '02/09/2026' },
  {
    id: 2,
    item: 'Listing “Weight-loss tea”',
    owner: 'Long Khánh Fruit Garden',
    reason: 'Health claim, not produce',
    hiddenOn: '19/09/2026',
  },
];

/** The report that put the flagged review in the queue. */
export const reviewReport = { by: 'U Minh Forest Honey', date: '02/09', quote: 'Advertising, not a review.' };

/** Recently listed products an admin skims for anything that breaks the guidelines. */
export const recentlyListedIds = [14, 9, 5, 20];

/* ----------------------------------------------------------------- content */

export type AdminAnnouncementType = {
  id: number;
  title: string;
  text: string;
  from: string;
  to: string;
  active: boolean;
  /** Who sees it: everyone, customers or farmers. */
  audience: 'Everyone' | 'Customers' | 'Farmers';
};

export const announcements: AdminAnnouncementType[] = [
  {
    id: 1,
    title: 'Thảo Điền Weekend Market is closed on Sunday 04/10',
    text: 'Orders for that day move to Saturday 03/10. Farmers will confirm again.',
    from: '23/09/2026',
    to: '04/10/2026',
    active: true,
    audience: 'Everyone',
  },
  {
    id: 2,
    title: 'First green-skin pomelos of the season this week',
    text: '3 stalls in Thủ Đức are taking pre-orders for Saturday morning.',
    from: '21/09/2026',
    to: '27/09/2026',
    active: true,
    audience: 'Customers',
  },
  {
    id: 3,
    title: 'Reminder: update your pickup windows before Friday',
    text: 'Slots are generated from your operating days each week.',
    from: '14/09/2026',
    to: '18/09/2026',
    active: false,
    audience: 'Farmers',
  },
];

export type FeedbackKind = 'bug' | 'suggestion' | 'query';

export type FeedbackType = {
  id: number;
  type: FeedbackKind;
  from: string;
  date: string;
  text: string;
  status: 'open' | 'answered';
};

export const feedback: FeedbackType[] = [
  {
    id: 1,
    type: 'bug',
    from: 'khang@example.com',
    date: '23/09/2026',
    text: 'The slot picker on the cart page does not scroll on my phone (iPhone 12, Safari).',
    status: 'open',
  },
  {
    id: 2,
    type: 'suggestion',
    from: 'lanhuong@example.com',
    date: '22/09/2026',
    text: 'Could you show the pickup queue length so I know how long I will wait at the stall?',
    status: 'open',
  },
  {
    id: 3,
    type: 'query',
    from: 'guest',
    date: '21/09/2026',
    text: 'Is Bà Chiểu Green Market open on the public holiday?',
    status: 'answered',
  },
];

/* --------------------------------------------------------------- analytics */

/**
 * Time series for the analytics screens, generated once and frozen so the dashboard, the reports and the revenue report
 * all show the same numbers.
 */
export const series = {
  dayLabels: [
    '01/09',
    '02/09',
    '03/09',
    '04/09',
    '05/09',
    '06/09',
    '07/09',
    '08/09',
    '09/09',
    '10/09',
    '11/09',
    '12/09',
    '13/09',
    '14/09',
    '15/09',
    '16/09',
    '17/09',
    '18/09',
    '19/09',
    '20/09',
    '21/09',
    '22/09',
    '23/09',
    '24/09',
    '25/09',
    '26/09',
    '27/09',
    '28/09',
    '29/09',
    '30/09',
  ],
  revenueNow: [
    968393, 890808, 1163219, 874767, 1128125, 1051992, 904359, 1150433, 918431, 1136796, 959991, 983204, 1169150,
    1390730, 1037510, 1101584, 1324132, 1503042, 1322694, 1241241, 1554986, 1083923, 1518470, 1235030, 1171813, 1170419,
    1281944, 1558286, 1240244, 1461065,
  ],
  revenuePrev: [
    1046678, 922017, 1009451, 779939, 781675, 855194, 1086192, 968111, 916924, 1050470, 990195, 919821, 1160502,
    1117984, 902900, 1064723, 1044361, 1215599, 1148934, 940277, 1275817, 865272, 1012566, 1178561, 891353, 1056369,
    843753, 1148944, 1198461, 1109786,
  ],
  ordersNow: [
    32, 23, 30, 28, 28, 27, 33, 35, 28, 31, 22, 32, 31, 37, 35, 26, 28, 33, 23, 30, 26, 25, 25, 36, 26, 28, 31, 39, 27,
    33,
  ],
  ordersPrev: [
    24, 28, 28, 28, 20, 22, 21, 29, 30, 19, 19, 20, 20, 24, 25, 21, 17, 23, 22, 25, 31, 27, 25, 26, 27, 18, 30, 29, 30,
    29,
  ],
  sparkFarmers: [4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8],
  sparkCustomers: [291, 305, 318, 330, 344, 356, 365, 378, 389, 397, 404, 412],
  sparkMarkets: [2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4],
  sparkOrders: [712, 764, 803, 845, 889, 931, 986, 1042, 1098, 1156, 1221, 1284],
};

/** The period every analytics screen is reporting on. */
export const period = {
  label: 'September 2026',
  days: '30 days',
  compare: 'August 2026',
  from: '2026-09-01',
  to: '2026-09-30',
};

/** Headline counts for the dashboard tiles. */
export const platformTotals = {
  farmers: 8,
  farmersWaiting: 2,
  farmersSuspended: 1,
  customers: 412,
  customersThisMonth: 37,
  markets: 4,
  orders: 1284,
  ordersThisWeek: 192,
  completedValue: 31900000,
};

/** Orders in the period, split the way the orders screen and the reports screen both show them. */
export const orderTotals = {
  placed: 796,
  completed: 596,
  accepted: 84,
  open: 115,
  stillPlaced: 31,
  declined: 38,
  cancelled: 47,
  averageOrder: 53500,
  revenue: 31900000,
};

export type MarketCountType = { marketId: number; value: number };

/** Orders this week by market, on the dashboard. */
export const ordersThisWeekByMarket: MarketCountType[] = [
  { marketId: 1, value: 86 },
  { marketId: 2, value: 53 },
  { marketId: 3, value: 34 },
  { marketId: 4, value: 19 },
];

/** Orders in the period by market, on the orders screen. */
export const ordersByMarket: MarketCountType[] = [
  { marketId: 1, value: 352 },
  { marketId: 2, value: 221 },
  { marketId: 3, value: 142 },
  { marketId: 4, value: 81 },
];

/** Revenue in the period by market, on the reports screen. */
export const revenueByMarket: MarketCountType[] = [
  { marketId: 1, value: 14200000 },
  { marketId: 2, value: 8900000 },
  { marketId: 3, value: 5800000 },
  { marketId: 4, value: 3000000 },
];

/** Orders by state, in the order a reader thinks about them rather than alphabetically. */
export const ordersByStatus: { status: OrderStatus; value: number }[] = [
  { status: 'completed', value: 596 },
  { status: 'accepted', value: 84 },
  { status: 'placed', value: 31 },
  { status: 'cancelled', value: 47 },
  { status: 'declined', value: 38 },
];

export type TopFarmerRow = {
  rank: number;
  stall: string;
  markets: string;
  orders: number;
  revenue: number;
  products: number;
  rating: string;
};

export const topFarmers: TopFarmerRow[] = [
  {
    rank: 1,
    stall: 'Gió Nam Bakery',
    markets: 'Thảo Điền, Phú Mỹ Hưng',
    orders: 128,
    revenue: 6400000,
    products: 3,
    rating: '4.9',
  },
  {
    rank: 2,
    stall: 'Cô Tư Garden',
    markets: 'Thảo Điền, Thủ Đức',
    orders: 112,
    revenue: 8450000,
    products: 4,
    rating: '4.6',
  },
  { rank: 3, stall: 'Ba Lành Farm', markets: 'Thảo Điền', orders: 96, revenue: 4300000, products: 2, rating: '4.5' },
  { rank: 4, stall: 'Út Hiền Orchard', markets: 'Thủ Đức', orders: 81, revenue: 5200000, products: 2, rating: '4.8' },
  {
    rank: 5,
    stall: 'Củ Chi Goat Farm',
    markets: 'Thủ Đức, Phú Mỹ Hưng',
    orders: 74,
    revenue: 4100000,
    products: 3,
    rating: '4.4',
  },
];

/** Quantities are only ever added up within one unit, so each row carries the product's own unit. */
export type TopProductRow = { rank: number; productId: number; qty: number; value: number };

export const topProducts: TopProductRow[] = [
  { rank: 1, productId: 5, qty: 142, value: 6390000 },
  { rank: 2, productId: 1, qty: 312, value: 4680000 },
  { rank: 3, productId: 14, qty: 21, value: 3780000 },
  { rank: 4, productId: 24, qty: 34, value: 3230000 },
  { rank: 5, productId: 3, qty: 44, value: 2860000 },
  { rank: 6, productId: 23, qty: 96, value: 2400000 },
];

export type MarketReportRow = {
  marketId: number;
  stalls: number;
  orders: number;
  ordersChange: number;
  completed: number;
  declined: number;
  revenue: number;
  revenueChange: number;
};

export const marketsSideBySide: MarketReportRow[] = [
  {
    marketId: 1,
    stalls: 14,
    orders: 352,
    ordersChange: 16,
    completed: 268,
    declined: 14,
    revenue: 14200000,
    revenueChange: 18,
  },
  {
    marketId: 2,
    stalls: 9,
    orders: 221,
    ordersChange: 9,
    completed: 171,
    declined: 11,
    revenue: 8900000,
    revenueChange: 12,
  },
  {
    marketId: 3,
    stalls: 11,
    orders: 142,
    ordersChange: -4,
    completed: 104,
    declined: 9,
    revenue: 5800000,
    revenueChange: -2,
  },
  {
    marketId: 4,
    stalls: 7,
    orders: 81,
    ordersChange: 21,
    completed: 53,
    declined: 4,
    revenue: 3000000,
    revenueChange: 26,
  },
];
