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

// Fallback pricing if Google Sheets doesn't contain room rates
const DEFAULT_ROOM_PRICING: { [key: string]: number } = {
  "single-bed": 80,
  "double-bed": 100,
  "bunk-bed": 90,
  "whole-house": 150,
};

// Room type mapping from API IDs to sheet names
const ROOM_TYPE_MAP: { [key: string]: string } = {
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

  // Fetch per-night prices for the room between the dates (each row in sheet corresponds to a date)
  const sheetRoomName = ROOM_TYPE_MAP[roomType];
  const perNight = await googleSheetsService.getPerNightPricesForRoom(sheetRoomName, checkIn, checkOut);

  let roomCost = 0;
  let foundAny = false;
  const perNightPrices: Array<number | null> = [];
  for (const p of perNight) {
    if (p.price === null || p.price === undefined) {
      perNightPrices.push(null);
    } else {
      perNightPrices.push(p.price);
      roomCost += p.price;
      foundAny = true;
    }
  }

  let pricePerNight: number;
  if (foundAny) {
    // Use the first available night's price to populate pricePerNight for UI display
    const first = perNightPrices.find((v) => v !== null) as number | undefined;
    pricePerNight = first ?? (DEFAULT_ROOM_PRICING[roomType] ?? DEFAULT_ROOM_PRICING['whole-house']);
  } else {
    // fallback: try sheet-wide single value or default
    const sheetPrices = await googleSheetsService.getRoomNightlyPrices();
    pricePerNight = sheetPrices[sheetRoomName] ?? DEFAULT_ROOM_PRICING[roomType] ?? DEFAULT_ROOM_PRICING["whole-house"];
    roomCost = nights * pricePerNight;
  }

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
