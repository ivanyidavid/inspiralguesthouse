import { googleSheetsService } from "./googleSheets";

export interface PriceRequest {
  roomType: string;
  checkIn: string;   // yyyy-mm-dd
  checkOut: string;  // yyyy-mm-dd
  guests: number;
}

export interface PriceBreakdown {
  nights: number;
  pricePerNight: number;
  roomCost: number;
  cleaningFee: number;
  extraGuestFeePerNight: number;
  extraGuests: number;
  extraGuestFeeTotal: number;
  total: number;
}

// API room ID to sheet room name mapping
const ROOM_TYPE_MAP: { [apiId: string]: string } = {
  "single-bed": "2x Single Bed Bedroom",
  "double-bed": "Double Bed Bedroom",
  "bunk-bed": "Bunk Bed Bedroom",
  "whole-house": "Whole House",
};

export async function computePrice(req: PriceRequest): Promise<PriceBreakdown> {
  const { roomType, checkIn, checkOut, guests } = req;

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  // Get sheet room name
  const sheetRoomName = ROOM_TYPE_MAP[roomType];
  if (!sheetRoomName) {
    throw new Error(`Unknown room type: ${roomType}`);
  }

  // Fetch per-night prices from Google Sheet
  const perNightPrices = await googleSheetsService.getPerNightPricesForRoom(
    sheetRoomName,
    checkIn,
    checkOut
  );

  // Sum up room costs from per-night data
  let roomCost = 0;
  let validNightCount = 0;
  for (const { price } of perNightPrices) {
    if (price !== null && price !== undefined) {
      roomCost += price;
      validNightCount++;
    }
  }

  // Calculate average nightly price for display
  let pricePerNight = validNightCount > 0 ? roomCost / validNightCount : 0;

  // Get cleaning fee (once per booking, not per night)
  const cleaningFee = await googleSheetsService.getCleaningFee(roomType as any);

  // Calculate extra guest fees (only for whole house, guests > 6)
  let extraGuestFeePerNight = 0;
  let extraGuests = 0;
  let extraGuestFeeTotal = 0;

  if (roomType === "whole-house" && guests > 6) {
    extraGuests = guests - 6;
    extraGuestFeePerNight = await googleSheetsService.getExtraGuestFeePerNight(checkIn, checkOut);
    extraGuestFeeTotal = extraGuests * extraGuestFeePerNight * nights;
  }

  const total = roomCost + cleaningFee + extraGuestFeeTotal;

  return {
    nights,
    pricePerNight,
    roomCost,
    cleaningFee,
    extraGuestFeePerNight,
    extraGuests,
    extraGuestFeeTotal,
    total,
  };
}
