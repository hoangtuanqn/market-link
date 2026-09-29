import type { ApiResponse, PageType } from '@/types/api.types';
import { dayName } from '@/lib/format';
import { privateApi, publicApi } from '@/utils/axiosInstance';

export type OperatingDayDto = { dayOfWeek: number; pickupStartTime: string; pickupEndTime: string };

export type StallMarketDto = {
  farmerMarketId: number;
  marketId: number;
  marketName: string;
  stallCode?: string | null;
  stallLatitude?: number | null;
  stallLongitude?: number | null;
  operatingDays: OperatingDayDto[];
};

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

export type UpdateStallMarketInput = {
  stallCode?: string;
  stallLatitude?: number | null;
  stallLongitude?: number | null;
};

export type OperatingDayInput = { dayOfWeek: number; pickupStartTime: string; pickupEndTime: string };

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

export type GenerateSlotsInput = {
  farmerMarketId: number;
  fromDate: string;
  toDate: string;
  slotMinutes: number;
  maxOrders: number;
};

export type UpdateSlotInput = { maxOrders?: number; isActive?: boolean };

export type SlotOptionData = { value: string; time: string; booked: number; max: number; off: boolean };

export const toSlotOption = (dto: SlotDto): SlotOptionData => ({
  value: String(dto.slotId),
  time: `${dto.startTime}–${dto.endTime}`,
  booked: dto.bookedCount,
  max: dto.maxOrders,
  off: !dto.isActive,
});

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

export const pickupWindow = (start?: string | null, end?: string | null) => (start && end ? `${start} – ${end}` : '');

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

class StallApi {
  static list = async (
    params: { q?: string; marketId?: number; day?: number; page?: number; pageSize?: number } = {},
  ) => {
    const response = await publicApi.get<ApiResponse<PageType<StallSummaryDto>>>('/farmers', { params });
    return response.data.data;
  };

  static get = async (id: number) => {
    const response = await publicApi.get<ApiResponse<StallDetailDto>>(`/farmers/${id}`);
    return response.data.data;
  };

  static atMarket = async (marketId: number, day?: number) => {
    const response = await publicApi.get<ApiResponse<StallSummaryDto[]>>(`/markets/${marketId}/farmers`, {
      params: day == null ? {} : { day },
    });
    return response.data.data;
  };

  static myProfile = async () => {
    const response = await privateApi.get<ApiResponse<StallDetailDto>>('/farmer/profile');
    return response.data.data;
  };

  static updateProfile = async (input: StallProfileInput) => {
    const response = await privateApi.put<ApiResponse<StallDetailDto>>('/farmer/profile', input);
    return response.data.data;
  };

  static joinMarket = async (input: JoinMarketInput) => {
    const response = await privateApi.post<ApiResponse<StallMarketDto>>('/farmer/markets', input);
    return response.data.data;
  };

  static updateMarket = async (farmerMarketId: number, input: UpdateStallMarketInput) => {
    const response = await privateApi.put<ApiResponse<StallMarketDto>>(`/farmer/markets/${farmerMarketId}`, input);
    return response.data.data;
  };

  static leaveMarket = async (farmerMarketId: number) => {
    await privateApi.delete<ApiResponse<null>>(`/farmer/markets/${farmerMarketId}`);
  };

  static setDays = async (farmerMarketId: number, days: OperatingDayInput[]) => {
    const response = await privateApi.put<ApiResponse<StallMarketDto>>(`/farmer/markets/${farmerMarketId}/days`, {
      days,
    });
    return response.data.data;
  };

  static slots = async (farmerId: number, params: { marketId?: number; date?: string } = {}) => {
    const response = await publicApi.get<ApiResponse<SlotDto[]>>(`/farmers/${farmerId}/slots`, { params });
    return response.data.data;
  };

  static farmerSlots = async (farmerMarketId: number, date?: string) => {
    const response = await privateApi.get<ApiResponse<SlotDto[]>>('/farmer/slots', {
      params: date ? { farmerMarketId, date } : { farmerMarketId },
    });
    return response.data.data;
  };

  static generateSlots = async (input: GenerateSlotsInput) => {
    const response = await privateApi.post<ApiResponse<SlotDto[]>>('/farmer/slots/generate', input);
    return response.data.data;
  };

  static updateSlot = async (slotId: number, input: UpdateSlotInput) => {
    const response = await privateApi.patch<ApiResponse<SlotDto>>(`/farmer/slots/${slotId}`, input);
    return response.data.data;
  };
}

export default StallApi;
