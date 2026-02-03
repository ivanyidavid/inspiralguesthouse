import { googleSheetsService } from "./googleSheets";

export interface PriceRequest {
  roomType: string;
  checkIn: string; // yyyy-mm-dd
  checkOut: string; // yyyy-mm-dd
  guests: number;
}

export interface PriceBreakdown {
  nights: number;
  pricePerNight: number;
  roomCost: number;
  cleaningFee: number;
  extraGuestFeePerDay: number;
  extraGuests: number;
  extraGuestFeeTotal: number;
  total: number;
}

const ROOM_PRICING: { [key: string]: number } = {
  "single-bed": 80,
  "double-bed": 100,
  "bunk-bed": 90,
  "whole-house": 150,
};

export async function computePrice(req: PriceRequest): Promise<PriceBreakdown> {
  const { roomType, checkIn, checkOut, guests } = req;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  const pricePerNight = ROOM_PRICING[roomType] ?? ROOM_PRICING["whole-house"];
  const roomCost = nights * pricePerNight;

  const wholeHouseCleaningFee = await googleSheetsService.getWholeHouseCleaningFee();
  const roomCleaningFee = await googleSheetsService.getRoomCleaningFee();

  const cleaningFee = roomType === "whole-house" ? wholeHouseCleaningFee : roomCleaningFee;

  const extraGuestFeePerDay = await googleSheetsService.getExtraGuestFeeForDateRange(checkIn, checkOut);
  const extraGuests = roomType === "whole-house" && guests > 6 ? guests - 6 : 0;
  const extraGuestFeeTotal = extraGuests * extraGuestFeePerDay * nights;

  const total = roomCost + cleaningFee + extraGuestFeeTotal;

  return {
    nights,
    pricePerNight,
    roomCost,
    cleaningFee,
    extraGuestFeePerDay,
    extraGuests,
    extraGuestFeeTotal,
    total,
  };
}
