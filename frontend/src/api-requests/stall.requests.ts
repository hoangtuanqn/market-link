import type { ApiResponse, PageType } from '@/types/api.types';
import { dayName } from '@/lib/format';
import { privateApi, publicApi } from '@/utils/axiosInstance';

/** Một ngày nhận hàng của stall tại một chợ; giờ "HH:mm" (contract §4). */
export type OperatingDayDto = { dayOfWeek: number; pickupStartTime: string; pickupEndTime: string };

/** Một chợ mà stall đang bán, kèm quầy và khung giờ theo thứ (contract §4 `markets[]`). */
export type StallMarketDto = {
  farmerMarketId: number;
  marketId: number;
  marketName: string;
  stallCode?: string | null;
  stallLatitude?: number | null;
  stallLongitude?: number | null;
  operatingDays: OperatingDayDto[];
};

/** GET /farmers/{id} và GET /farmer/profile. `approvalStatus` chỉ có ý nghĩa cho chính Farmer. */
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

/** Một stall trong danh sách của chợ hoặc kết quả tìm (GET /farmers, GET /markets/{id}/farmers). */
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

/** Một slot nhận hàng (contract §6): ngày "yyyy-MM-dd", giờ "HH:mm"; `isActive` luôn true ở danh sách công khai. */
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

/** Sinh slot từ khung giờ theo thứ; tối đa 60 ngày một lần, không bắt đầu từ quá khứ. */
export type GenerateSlotsInput = {
  farmerMarketId: number;
  fromDate: string;
  toDate: string;
  slotMinutes: number;
  maxOrders: number;
};

/** Trường nào bỏ trống thì giữ nguyên. */
export type UpdateSlotInput = { maxOrders?: number; isActive?: boolean };

/** Hình dạng mà SlotPicker (giỏ hàng) và bảng slot của Farmer đang nhận; `off` = Farmer đã tắt slot. */
export type SlotOptionData = { value: string; time: string; booked: number; max: number; off: boolean };

export const toSlotOption = (dto: SlotDto): SlotOptionData => ({
  value: String(dto.slotId),
  time: `${dto.startTime}–${dto.endTime}`,
  booked: dto.bookedCount,
  max: dto.maxOrders,
  off: !dto.isActive,
});

/** Hình dạng mà StallCard đang nhận (thẻ stall trên trang chợ). */
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

/** "07:00" + "11:00" → "07:00 – 11:00"; thiếu một đầu thì để trống, trang tự ẩn. */
export const pickupWindow = (start?: string | null, end?: string | null) => (start && end ? `${start} – ${end}` : '');

/** [0, 6] → "Sun, Sat" theo ngôn ngữ người đọc. */
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
 * FR-011, FR-060, FR-061 — stall công khai và hồ sơ gian hàng của Farmer (docs/api-contract.md §4); FR-032, FR-067 —
 * slot nhận hàng (§6).
 */
class StallApi {
  /** Public. `page` từ 1, tối đa 50 một trang. */
  static list = async (
    params: { q?: string; marketId?: number; day?: number; page?: number; pageSize?: number } = {},
  ) => {
    const response = await publicApi.get<ApiResponse<PageType<StallSummaryDto>>>('/farmers', { params });
    return response.data.data;
  };

  /** Public. 404 `NOT_FOUND` khi stall không có, chưa duyệt hoặc bị đình chỉ (D-09). */
  static get = async (id: number) => {
    const response = await publicApi.get<ApiResponse<StallDetailDto>>(`/farmers/${id}`);
    return response.data.data;
  };

  /** Public. Stall đang bán tại một chợ, lọc theo thứ (0 = Chủ nhật) nếu có (FR-010). */
  static atMarket = async (marketId: number, day?: number) => {
    const response = await publicApi.get<ApiResponse<StallSummaryDto[]>>(`/markets/${marketId}/farmers`, {
      params: day == null ? {} : { day },
    });
    return response.data.data;
  };

  /** Farmer — hồ sơ của chính mình, mọi trạng thái duyệt. */
  static myProfile = async () => {
    const response = await privateApi.get<ApiResponse<StallDetailDto>>('/farmer/profile');
    return response.data.data;
  };

  static updateProfile = async (input: StallProfileInput) => {
    const response = await privateApi.put<ApiResponse<StallDetailDto>>('/farmer/profile', input);
    return response.data.data;
  };

  /** 403 `STALL_NOT_APPROVED` khi chưa được duyệt; 409 `MARKET_ALREADY_JOINED` khi đã bán ở chợ đó. */
  static joinMarket = async (input: JoinMarketInput) => {
    const response = await privateApi.post<ApiResponse<StallMarketDto>>('/farmer/markets', input);
    return response.data.data;
  };

  static leaveMarket = async (farmerMarketId: number) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/markets/${farmerMarketId}`);
  };

  /** Ghi đè trọn bộ khung giờ tại một chợ. */
  static setDays = async (farmerMarketId: number, days: OperatingDayInput[]) => {
    const response = await privateApi.put<ApiResponse<StallMarketDto>>(`/farmer/markets/${farmerMarketId}/days`, {
      days,
    });
    return response.data.data;
  };

  /**
   * Public. Slot còn nhận đơn của một stall, theo ngày rồi giờ; không truyền `date` thì từ hôm nay tới hết 14 ngày.
   * Slot đã tắt không có ở đây. 404 `NOT_FOUND` khi stall không có, chưa duyệt hoặc bị đình chỉ.
   */
  static slots = async (farmerId: number, params: { marketId?: number; date?: string } = {}) => {
    const response = await publicApi.get<ApiResponse<SlotDto[]>>(`/farmers/${farmerId}/slots`, { params });
    return response.data.data;
  };

  /**
   * Farmer. Trả mọi slot của chợ đó trong khoảng ngày (cả slot đã có); bấm lại không sinh trùng. 400 `VALIDATION_ERROR`
   * khi khoảng ngày sai; 403 `FORBIDDEN` khi `farmerMarketId` không phải của mình.
   */
  static generateSlots = async (input: GenerateSlotsInput) => {
    const response = await privateApi.post<ApiResponse<SlotDto[]>>('/farmer/slots/generate', input);
    return response.data.data;
  };

  /** Farmer. 409 `SLOT_BELOW_BOOKED` khi hạ `maxOrders` xuống dưới số đơn đã đặt vào slot. */
  static updateSlot = async (slotId: number, input: UpdateSlotInput) => {
    const response = await privateApi.patch<ApiResponse<SlotDto>>(`/farmer/slots/${slotId}`, input);
    return response.data.data;
  };
}

export default StallApi;
