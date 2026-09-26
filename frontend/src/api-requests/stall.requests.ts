import type { ApiResponse, PageType } from '@/types/api.types';
import { dayName } from '@/lib/format';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/** One pickup day of a stall at a market; times "HH:mm" (contract §4). */
export type OperatingDayDto = { dayOfWeek: number; pickupStartTime: string; pickupEndTime: string };

/** One market a stall sells at, with the booth and time windows by weekday (contract §4 `markets[]`). */
export type StallMarketDto = {
  farmerMarketId: number;
  marketId: number;
  marketName: string;
  stallCode?: string | null;
  stallLatitude?: number | null;
  stallLongitude?: number | null;
  operatingDays: OperatingDayDto[];
};

/** GET /farmers/{id} and GET /farmer/profile. `approvalStatus` only matters to the Farmer themself. */
export type StallDetailDto = {
  farmerId: number;
  stallName: string;
  contactPerson: string;
  description?: string | null;
  logoUrl?: string | null;
  orderCutoffHours: number;
  ratingAvg: number;
  ratingCount: number;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  markets: StallMarketDto[];
};

/** One stall in a market's list or a search result (GET /farmers, GET /markets/{id}/farmers). */
export type StallSummaryDto = {
  farmerId: number;
  stallName: string;
  contactPerson: string;
  logoUrl?: string | null;
  stallCode?: string | null;
  stallLatitude?: number | null;
  stallLongitude?: number | null;
  ratingAvg: number;
  ratingCount: number;
  operatingDays: number[];
  pickupStartTime?: string | null;
  pickupEndTime?: string | null;
};

export type StallProfileInput = {
  stallName: string;
  contactPerson: string;
  description?: string;
  logoUrl?: string;
  orderCutoffHours: number;
};

export type JoinMarketInput = {
  marketId: number;
  stallCode?: string;
  stallLatitude?: number;
  stallLongitude?: number;
};

export type OperatingDayInput = { dayOfWeek: number; pickupStartTime: string; pickupEndTime: string };

/** One pickup slot (contract §6): date "yyyy-MM-dd", time "HH:mm"; `isActive` is always true on the public list. */
export type SlotDto = {
  slotId: number;
  farmerMarketId: number;
  marketId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  bookedCount: number;
  isFull: boolean;
  isActive: boolean;
};

/** Generate slots from weekday time windows; at most 60 days at once, cannot start in the past. */
export type GenerateSlotsInput = {
  farmerMarketId: number;
  fromDate: string;
  toDate: string;
  slotMinutes: number;
  maxOrders: number;
};

/** A field left empty keeps its old value. */
export type UpdateSlotInput = { maxOrders?: number; isActive?: boolean };

/** The shape SlotPicker (the cart) and the Farmer's slot table both take; `off` = the Farmer turned the slot off. */
export type SlotOptionData = { value: string; time: string; booked: number; max: number; off: boolean };

export const toSlotOption = (dto: SlotDto): SlotOptionData => ({
  value: String(dto.slotId),
  time: `${dto.startTime}–${dto.endTime}`,
  booked: dto.bookedCount,
  max: dto.maxOrders,
  off: !dto.isActive,
});

/** The shape StallCard takes (the stall card on the market page). */
export type StallCardData = {
  id: number;
  stall: string;
  person: string;
  lat: number | null;
  lng: number | null;
  markets: number[];
  marketNames: string[];
  stallCode: string;
  days: string;
  pickup: string;
  rating: number | null;
  reviews: number;
};

/** "07:00" + "11:00" → "07:00 – 11:00"; if one end is missing leave it empty, the page hides it itself. */
export const pickupWindow = (start?: string | null, end?: string | null) => (start && end ? `${start} – ${end}` : '');

/** [0, 6] → "Sun, Sat" in the reader's language. */
export const dayNames = (days: number[]) =>
  [...new Set(days)]
    .sort((a, b) => a - b)
    .map((d) => dayName(d))
    .join(', ');

export const toStallCard = (dto: StallSummaryDto, marketId: number, marketName: string): StallCardData => ({
  id: dto.farmerId,
  stall: dto.stallName,
  person: dto.contactPerson,
  lat: dto.stallLatitude == null ? null : Number(dto.stallLatitude),
  lng: dto.stallLongitude == null ? null : Number(dto.stallLongitude),
  markets: [marketId],
  marketNames: [marketName],
  stallCode: dto.stallCode ?? '',
  days: dayNames(dto.operatingDays),
  pickup: pickupWindow(dto.pickupStartTime, dto.pickupEndTime),
  rating: dto.ratingCount === 0 ? null : Number(dto.ratingAvg),
  reviews: dto.ratingCount,
});

/**
 * FR-011, FR-060, FR-061 — public stalls and the Farmer's stall profile (docs/api-contract.md §4); FR-032, FR-067 —
 * pickup slots (§6).
 */
class StallApi {
  /** Public. `page` from 1, at most 50 per page. */
  static list = async (
    params: { q?: string; marketId?: number; day?: number; page?: number; pageSize?: number } = {},
  ) => {
    const response = await publicApi.get<ApiResponse<PageType<StallSummaryDto>>>('/farmers', { params });
    return response.data.data;
  };

  /** Public. 404 `NOT_FOUND` when the stall does not exist, is not approved or is suspended (D-09). */
  static get = async (id: number) => {
    const response = await publicApi.get<ApiResponse<StallDetailDto>>(`/farmers/${id}`);
    return response.data.data;
  };

  /** Public. Stalls selling at a market, filtered by weekday (0 = Sunday) if given (FR-010). */
  static atMarket = async (marketId: number, day?: number) => {
    const response = await publicApi.get<ApiResponse<StallSummaryDto[]>>(`/markets/${marketId}/farmers`, {
      params: day == null ? {} : { day },
    });
    return response.data.data;
  };

  /** Farmer — your own profile, in every approval state. */
  static myProfile = async () => {
    const response = await privateApi.get<ApiResponse<StallDetailDto>>('/farmer/profile');
    return response.data.data;
  };

  static updateProfile = async (input: StallProfileInput) => {
    const response = await privateApi.put<ApiResponse<StallDetailDto>>('/farmer/profile', input);
    return response.data.data;
  };

  /** 403 `STALL_NOT_APPROVED` when not yet approved; 409 `MARKET_ALREADY_JOINED` when already selling at that market. */
  static joinMarket = async (input: JoinMarketInput) => {
    const response = await privateApi.post<ApiResponse<StallMarketDto>>('/farmer/markets', input);
    return response.data.data;
  };

  static leaveMarket = async (farmerMarketId: number) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/markets/${farmerMarketId}`);
  };

  /** Overwrites the whole set of time windows at one market. */
  static setDays = async (farmerMarketId: number, days: OperatingDayInput[]) => {
    const response = await privateApi.put<ApiResponse<StallMarketDto>>(`/farmer/markets/${farmerMarketId}/days`, {
      days,
    });
    return response.data.data;
  };

  /**
   * Public. Slots of a stall still accepting orders, by date then time; with no `date` given, from today through the
   * next 14 days. A disabled slot is not here. 404 `NOT_FOUND` when the stall does not exist, is not approved or is
   * suspended.
   */
  static slots = async (farmerId: number, params: { marketId?: number; date?: string } = {}) => {
    const response = await publicApi.get<ApiResponse<SlotDto[]>>(`/farmers/${farmerId}/slots`, { params });
    return response.data.data;
  };

  /**
   * Farmer. Returns every slot of that market in the date range (including existing ones); calling it again does not
   * duplicate. 400 `VALIDATION_ERROR` for a bad date range; 403 `FORBIDDEN` when `farmerMarketId` is not yours.
   */
  static generateSlots = async (input: GenerateSlotsInput) => {
    const response = await privateApi.post<ApiResponse<SlotDto[]>>('/farmer/slots/generate', input);
    return response.data.data;
  };

  /** Farmer. 409 `SLOT_BELOW_BOOKED` when lowering `maxOrders` below the number of orders already placed into the slot. */
  static updateSlot = async (slotId: number, input: UpdateSlotInput) => {
    const response = await privateApi.patch<ApiResponse<SlotDto>>(`/farmer/slots/${slotId}`, input);
    return response.data.data;
  };
}

export default StallApi;
