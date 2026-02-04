import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

if (!SHEET_ID) {
  console.warn('Warning: GOOGLE_SHEETS_ID environment variable is not set');
}
if (!API_KEY) {
  console.warn('Warning: GOOGLE_SHEETS_API_KEY environment variable is not set');
}

// Room name to column index mapping (I=8, J=9, K=10, L=11)
const ROOM_COLUMN_INDEX: { [roomName: string]: number } = {
  '2x Single Bed Bedroom': 8,    // Column I
  'Double Bed Bedroom': 9,       // Column J
  'Bunk Bed Bedroom': 10,        // Column K
  'Whole House': 11              // Column L
};

const EXTRA_GUEST_FEE_COLUMN = 12;  // Column M
const WHOLE_HOUSE_CLEANING_FEE_COLUMN = 13;  // Column N
const ROOM_CLEANING_FEE_COLUMN = 14;  // Column O

export class GoogleSheetsService {
  private sheets;

  constructor() {
    this.sheets = google.sheets({
      version: 'v4',
      auth: API_KEY
    });
  }

  /**
   * Parse MM/DD/YYYY date string to ISO yyyy-mm-dd
   */
  private parseSheetDate(dateString: string): string {
    const parts = dateString.toString().split('/');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateString}. Expected MM/DD/YYYY`);
    }
    const mm = parseInt(parts[0], 10);
    const dd = parseInt(parts[1], 10);
    const yyyy = parseInt(parts[2], 10);
    const date = new Date(yyyy, mm - 1, dd);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get per-night prices for a room across a date range
   * Returns array of { date: ISO string, price: number | null }
   */
  async getPerNightPricesForRoom(
    roomName: string,
    startDate: string,  // ISO yyyy-mm-dd
    endDate: string     // ISO yyyy-mm-dd
  ): Promise<Array<{ date: string; price: number | null }>> {
    try {
      if (!SHEET_ID) {
        console.error('GOOGLE_SHEETS_ID not configured');
        return [];
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'A:L', // Columns A through L
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.log('No data found in Google Sheet');
        return [];
      }

      const colIndex = ROOM_COLUMN_INDEX[roomName];
      if (colIndex === undefined) {
        console.warn(`Room name not found in mapping: ${roomName}`);
        return [];
      }

      const result: Array<{ date: string; price: number | null }> = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Build a map of date -> price from sheet
      const dateToPrice: { [date: string]: number } = {};
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateCell = row[0];
        if (!dateCell) continue;

        try {
          const sheetDate = this.parseSheetDate(dateCell);
          const priceCell = row[colIndex];
          if (!priceCell) {
            dateToPrice[sheetDate] = null as any;
            continue;
          }
          const price = parseFloat(priceCell.toString().replace(/[^\d.-]/g, ''));
          if (!isNaN(price) && price > 0) {
            dateToPrice[sheetDate] = price;
          }
        } catch (e) {
          // Skip rows with invalid dates
          continue;
        }
      }

      // Generate result for each night in the range
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const iso = new Date(d).toISOString().split('T')[0];
        result.push({
          date: iso,
          price: dateToPrice[iso] ?? null
        });
      }

      return result;
    } catch (error) {
      console.error('Error reading per-night prices from Google Sheet:', error);
      return [];
    }
  }

  /**
   * Get extra guest fee per night (Column M)
   * This is the additional cost per guest above 6 for whole house bookings
   */
  async getExtraGuestFeePerNight(
    startDate: string,  // ISO yyyy-mm-dd
    endDate: string     // ISO yyyy-mm-dd
  ): Promise<number> {
    try {
      if (!SHEET_ID) {
        console.error('GOOGLE_SHEETS_ID not configured');
        return 0;
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'A:M',
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return 0;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      let totalFee = 0;
      let daysCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateCell = row[0];
        if (!dateCell) continue;

        try {
          const sheetDate = this.parseSheetDate(dateCell);
          const currentDate = new Date(sheetDate);

          if (currentDate >= start && currentDate < end) {
            const feeCell = row[EXTRA_GUEST_FEE_COLUMN];
            if (feeCell) {
              const fee = parseFloat(feeCell.toString().replace(/[^\d.-]/g, ''));
              if (!isNaN(fee) && fee >= 0) {
                totalFee += fee;
                daysCount++;
              }
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Return average fee per night across the date range
      return daysCount > 0 ? totalFee / daysCount : 0;
    } catch (error) {
      console.error('Error reading extra guest fee from Google Sheet:', error);
      return 0;
    }
  }

  /**
   * Get cleaning fee (Column N for whole house, Column O for rooms)
   */
  async getCleaningFee(roomType: 'single-bed' | 'double-bed' | 'bunk-bed' | 'whole-house'): Promise<number> {
    try {
      if (!SHEET_ID) {
        console.error('GOOGLE_SHEETS_ID not configured');
        return 0;
      }

      const colIndex = roomType === 'whole-house' 
        ? WHOLE_HOUSE_CLEANING_FEE_COLUMN 
        : ROOM_CLEANING_FEE_COLUMN;

      const columnLetter = String.fromCharCode(65 + colIndex); // Convert index to A, B, C...
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${columnLetter}2`, // First data row (skip header)
      });

      const rows = response.data.values || [];
      if (rows.length === 0 || !rows[0] || !rows[0][0]) {
        return 0;
      }

      const fee = parseFloat(rows[0][0].toString().replace(/[^\d.-]/g, ''));
      return !isNaN(fee) && fee >= 0 ? fee : 0;
    } catch (error) {
      console.error(`Error reading cleaning fee from Google Sheet:`, error);
      return 0;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
