import type { OrderListItemDto } from '@/api-requests/order.requests';
import { FarmerReportApi } from '@/api-requests/report.requests';

export type SalesTotals = { revenue: number; count: number; average: number };

export function sumSales(rows: Pick<OrderListItemDto, 'totalAmount'>[]): SalesTotals {
  const count = rows.length;
  const revenue = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  return { revenue, count, average: count ? revenue / count : 0 };
}

const TOTALS_PAGE_SIZE = 50;
const TOTALS_MAX_PAGES = 10;

export async function fetchAllSales(
  from: string,
  to: string,
): Promise<{ rows: OrderListItemDto[]; total: number; partial: boolean }> {
  const rows: OrderListItemDto[] = [];
  let page = 1;
  const first = await FarmerReportApi.sales({ from, to, page, pageSize: TOTALS_PAGE_SIZE });
  rows.push(...first.items);
  const total = first.total;
  page += 1;
  while (rows.length < total && page <= TOTALS_MAX_PAGES) {
    const data = await FarmerReportApi.sales({ from, to, page, pageSize: TOTALS_PAGE_SIZE });
    rows.push(...data.items);
    page += 1;
  }
  return { rows, total, partial: rows.length < total };
}
