import { google } from 'googleapis';

const SHEET_ID = '1xKU0YZdoOWrhEKOeBVPVLO-U9IYzTE6m6pKuOTc6-ZM';
const API_KEY = 'AIzaSyBcU26MCdKJAUYG1t-Zpb_ifUk0wyYYeQ4';

interface SheetAvailability {
  date: string;
  roomType: string;
  blocked: boolean;
}

export class GoogleSheetsService {
  private sheets;

  constructor() {
    this.sheets = google.sheets({
      version: 'v4',
      auth: API_KEY
    });
  }

  async getAvailabilityData(): Promise<SheetAvailability[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'A:Z',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in sheet');
        return [];
      }

      const availability: SheetAvailability[] = [];
      const headerRow = rows[0];
      const roomColumns: { [key: string]: number } = {};
      const roomTypes = ['2x Single Bed Bedroom', 'Double Bed Bedroom', 'Bunk Bed Bedroom', 'Whole House'];
      
      headerRow.forEach((header: string, index: number) => {
        if (roomTypes.includes(header.trim())) {
          roomColumns[header.trim()] = index;
        }
      });

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateValue = row[0];
        if (!dateValue) continue;
        
        let formattedDate: string;
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            const parts = dateValue.split('/');
            if (parts.length === 3) {
              const mm = parseInt(parts[0]);
              const dd = parseInt(parts[1]);
              const yyyy = parseInt(parts[2]);
              const parsedDate = new Date(yyyy, mm - 1, dd);
              formattedDate = parsedDate.toISOString().split('T')[0];
            } else {
              continue;
            }
          } else {
            formattedDate = date.toISOString().split('T')[0];
          }
        } catch (error) {
          console.log(`Skipping invalid date: ${dateValue}`);
          continue;
        }

        Object.entries(roomColumns).forEach(([roomType, columnIndex]) => {
          const cellValue = row[columnIndex];
          const isBlocked = cellValue && cellValue.toString().toLowerCase().trim() === 'x';
          if (isBlocked) {
            availability.push({
              date: formattedDate,
              roomType: roomType,
              blocked: true
            });
          }
        });
      }

      console.log(`Loaded ${availability.length} blocked dates from Google Sheets`);
      return availability;
    } catch (error) {
      console.error('Error reading Google Sheets:', error);
      return [];
    }
  }

  async getBlockedDatesForRoom(roomType: string): Promise<string[]> {
    const availability = await this.getAvailabilityData();
    return availability
      .filter(item => item.roomType === roomType && item.blocked)
      .map(item => item.date);
  }

  async getBlockedDatesForAllRooms(): Promise<{ [roomType: string]: string[] }> {
    const availability = await this.getAvailabilityData();
    const blocked: { [roomType: string]: string[] } = {
      '2x Single Bed Bedroom': [],
      'Double Bed Bedroom': [],
      'Bunk Bed Bedroom': [],
      'Whole House': []
    };

    availability.forEach(item => {
      if (item.blocked && blocked[item.roomType]) {
        blocked[item.roomType].push(item.date);
      }
    });

    return blocked;
  }

  async getWholeHouseCleaningFee(): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'N2',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0 || !rows[0] || !rows[0][0]) {
        console.log('No cleaning fee found in cell N2, defaulting to 0');
        return 0;
      }

      const feeValue = rows[0][0];
      const fee = parseFloat(feeValue.toString().replace(/[^\d.-]/g, ''));
      
      if (isNaN(fee)) {
        console.log(`Invalid cleaning fee value in N2: ${feeValue}, defaulting to 0`);
        return 0;
      }

      console.log(`Loaded whole house cleaning fee: €${fee}`);
      return fee;
    } catch (error) {
      console.error('Error reading cleaning fee from Google Sheets:', error);
      return 0;
    }
  }

  async getRoomCleaningFee(): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'O2',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0 || !rows[0] || !rows[0][0]) {
        console.log('No room cleaning fee found in cell O2, defaulting to 0');
        return 0;
      }

      const feeValue = rows[0][0];
      const fee = parseFloat(feeValue.toString().replace(/[^\d.-]/g, ''));
      
      if (isNaN(fee)) {
        console.log(`Invalid room cleaning fee value in O2: ${feeValue}, defaulting to 0`);
        return 0;
      }

      console.log(`Loaded room cleaning fee: €${fee}`);
      return fee;
    } catch (error) {
      console.error('Error reading room cleaning fee from Google Sheets:', error);
      return 0;
    }
  }

  async getPerNightPricesForRoom(sheetRoomName: string, startDate: string, endDate: string): Promise<Array<{ date: string; price: number | null }>> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'A:L',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) return [];

      const roomToColIndex: { [sheetName: string]: number } = {
        '2x Single Bed Bedroom': 8,
        'Double Bed Bedroom': 9,
        'Bunk Bed Bedroom': 10,
        'Whole House': 11,
      };

      const colIndex = roomToColIndex[sheetRoomName];
      if (colIndex === undefined) {
        console.log(`Room name not found: ${sheetRoomName}`);
        return [];
      }

      const datePriceMap: { [date: string]: number } = {};
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateCell = row[0];
        if (!dateCell) continue;
        
        let formattedDate: string;
        try {
          const parts = dateCell.toString().split('/');
          if (parts.length === 3) {
            const mm = parseInt(parts[0], 10);
            const dd = parseInt(parts[1], 10);
            const yyyy = parseInt(parts[2], 10);
            const parsed = new Date(yyyy, mm - 1, dd);
            formattedDate = parsed.toISOString().split('T')[0];
          } else {
            continue;
          }
        } catch (e) {
          continue;
        }

        const cell = row[colIndex];
        if (!cell) continue;
        const price = parseFloat(cell.toString().replace(/[^\d.-]/g, ''));
        if (!isNaN(price) && price > 0) datePriceMap[formattedDate] = price;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const results: Array<{ date: string; price: number | null }> = [];
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const iso = new Date(d).toISOString().split('T')[0];
        results.push({ date: iso, price: datePriceMap[iso] ?? null });
      }

      console.log(`Loaded per-night prices for ${sheetRoomName}:`, results);
      return results;
    } catch (error) {
      console.error('Error reading per-night prices for room from Google Sheets:', error);
      return [];
    }
  }

  async getExtraGuestFeeForDateRange(startDate: string, endDate: string): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'A:M',
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in sheet for extra guest fees');
        return 0;
      }

      const headerRow = rows[0];
      let dateColumnIndex = 0;
      let extraGuestFeeColumnIndex = -1;

      headerRow.forEach((header: string, index: number) => {
        if (index === 12) {
          extraGuestFeeColumnIndex = index;
        }
      });

      if (extraGuestFeeColumnIndex === -1) {
        console.log('Column M (extra guest fee) not found');
        return 0;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      let totalExtraGuestFee = 0;
      let daysCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateValue = row[dateColumnIndex];
        if (!dateValue) continue;

        let formattedDate: string;
        try {
          const parts = dateValue.toString().split('/');
          if (parts.length === 3) {
            const mm = parseInt(parts[0]);
            const dd = parseInt(parts[1]);
            const yyyy = parseInt(parts[2]);
            const parsedDate = new Date(yyyy, mm - 1, dd);
            formattedDate = parsedDate.toISOString().split('T')[0];
          } else {
            continue;
          }
        } catch (error) {
          continue;
        }

        const currentDate = new Date(formattedDate);
        if (currentDate >= start && currentDate < end) {
          const extraGuestFeeValue = row[extraGuestFeeColumnIndex];
          if (extraGuestFeeValue) {
            const fee = parseFloat(extraGuestFeeValue.toString().replace(/[^\d.-]/g, ''));
            if (!isNaN(fee)) {
              totalExtraGuestFee += fee;
              daysCount++;
            }
          }
        }
      }

      const averageExtraGuestFee = daysCount > 0 ? totalExtraGuestFee / daysCount : 0;
      console.log(`Loaded extra guest fee for date range ${startDate} to ${endDate}: €${averageExtraGuestFee} per day (${daysCount} days)`);
      return averageExtraGuestFee;
    } catch (error) {
      console.error('Error reading extra guest fees from Google Sheets:', error);
      return 0;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
