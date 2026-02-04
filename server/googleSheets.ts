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
        range: 'A:Z', // Get all data
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in sheet');
        return [];
      }

      const availability: SheetAvailability[] = [];
      const headerRow = rows[0];
      
      // Find room type columns (skip first column which should be dates)
      const roomColumns: { [key: string]: number } = {};
      const roomTypes = ['2x Single Bed Bedroom', 'Double Bed Bedroom', 'Bunk Bed Bedroom', 'Whole House'];
      
      headerRow.forEach((header: string, index: number) => {
        if (roomTypes.includes(header.trim())) {
          roomColumns[header.trim()] = index;
        }
      });

      // Process each data row (skip header)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateValue = row[0];
        
        if (!dateValue) continue;
        
        // Parse date - assuming format is YYYY-MM-DD or convertible
        let formattedDate: string;
        try {
          // Try to parse various date formats
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            // Try parsing DD/MM/YYYY format
            const parts = dateValue.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // Month is 0-indexed
              const year = parseInt(parts[2]);
              const parsedDate = new Date(year, month, day);
              formattedDate = parsedDate.toISOString().split('T')[0];
            } else {
              continue; // Skip invalid dates
            }
          } else {
            formattedDate = date.toISOString().split('T')[0];
          }
        } catch (error) {
          console.log(`Skipping invalid date: ${dateValue}`);
          continue;
        }

        // Check each room type column for 'x' values
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
        range: 'N2', // Read the cleaning fee from cell N2
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0 || !rows[0] || !rows[0][0]) {
        console.log('No cleaning fee found in cell N2, defaulting to 0');
        return 0;
      }

      const feeValue = rows[0][0];
      const fee = parseFloat(feeValue.toString().replace(/[^\d.-]/g, '')); // Remove any currency symbols
      
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
        range: 'O2', // Read the room cleaning fee from cell O2
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0 || !rows[0] || !rows[0][0]) {
        console.log('No room cleaning fee found in cell O2, defaulting to 0');
        return 0;
      }

      const feeValue = rows[0][0];
      const fee = parseFloat(feeValue.toString().replace(/[^\d.-]/g, '')); // Remove any currency symbols
      
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

  async getRoomNightlyPrices(): Promise<{ [roomType: string]: number }> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'A:Z', // Get all columns to find pricing
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in sheet for room pricing');
        return {};
      }

      // Log the actual header and first 3 data rows for debugging
      console.log('SHEET HEADER:', JSON.stringify(rows[0]));
      for (let i = 1; i < Math.min(rows.length, 4); i++) {
        console.log(`SHEET ROW ${i}:`, JSON.stringify(rows[i]));
      }

      const headerRow = rows[0];
      const roomTypes = ['2x Single Bed Bedroom', 'Double Bed Bedroom', 'Bunk Bed Bedroom', 'Whole House'];
      const prices: { [roomType: string]: number } = {};




        // Determine column indices for room types
        const columnIndices: { [roomType: string]: number } = {};
        roomTypes.forEach((roomType) => {
          const idx = headerRow.findIndex((header: string) => header && header.toString().trim() === roomType);
          if (idx !== -1) columnIndices[roomType] = idx;
        });

        // Scan the first several data rows for numeric pricing values in each room column
        const maxRowsToScan = Math.min(rows.length, 11); // header + up to 10 rows
        for (const roomType of roomTypes) {
          const col = columnIndices[roomType];
          if (col === undefined) continue;

          for (let r = 1; r < maxRowsToScan; r++) {
            const row = rows[r] || [];
            const cell = row[col];
            if (!cell) continue;
            const priceValue = cell.toString().trim();
            const price = parseFloat(priceValue.replace(/[^\d.-]/g, ''));
            if (!isNaN(price) && price > 0) {
              prices[roomType] = price;
              break;
            }
          }

          // If not found in rows, try parsing header text for a trailing price (e.g., "Room Name €80")
          if (prices[roomType] === undefined) {
            const headerCell = headerRow[col];
            if (headerCell) {
              const headerText = headerCell.toString();
              const m = headerText.match(/([\d,.]+)\s*€|€\s*([\d,.]+)/);
              if (m) {
                const numeric = (m[1] || m[2] || '').replace(/,/g, '.');
                const parsed = parseFloat(numeric.replace(/[^\d.-]/g, ''));
                if (!isNaN(parsed) && parsed > 0) prices[roomType] = parsed;
              }
            }
          }
        }

        if (Object.keys(prices).length > 0) {
          console.log(`Loaded room nightly prices from Google Sheets:`, prices);
          return prices;
        }

        console.log('No pricing row found in Google Sheets, using defaults');
        return {};
    } catch (error) {
      console.error('Error reading room nightly prices from Google Sheets:', error);
      return {};
    }
  }

    // Returns summed and average nightly prices for each room type within a date range
    async getRoomPricesForDateRange(startDate: string, endDate: string): Promise<{
      [roomType: string]: { total: number; average: number; days: number };
    }> {
      try {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: 'A:Z', // entire table with dates in column A
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return {};

        const headerRow = rows[0];

        // Map header columns to canonical sheet room names
        const mapping: { [sheetName: string]: number } = {};
        headerRow.forEach((h: string, idx: number) => {
          if (!h) return;
          const txt = h.toString().toLowerCase();
          if (txt.includes('single')) mapping['2x Single Bed Bedroom'] = idx;
          if (txt.includes('double')) mapping['Double Bed Bedroom'] = idx;
          if (txt.includes('bunk')) mapping['Bunk Bed Bedroom'] = idx;
          if (txt.includes('whole')) mapping['Whole House'] = idx;
        });

        const start = new Date(startDate);
        const end = new Date(endDate);

        const accum: { [sheetName: string]: { total: number; days: number } } = {};
        Object.keys(mapping).forEach((k) => (accum[k] = { total: 0, days: 0 }));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const dateCell = row[0];
          if (!dateCell) continue;

          let rowDate: Date;
          try {
            rowDate = new Date(dateCell);
            if (isNaN(rowDate.getTime())) {
              const parts = dateCell.toString().split('/');
              if (parts.length === 3) {
                rowDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              } else {
                continue;
              }
            }
          } catch (e) {
            continue;
          }

          if (rowDate < start || rowDate >= end) continue;

          // For each mapped room column, add price if present
          for (const [sheetName, col] of Object.entries(mapping)) {
            const cell = row[col];
            if (!cell) continue;
            const price = parseFloat(cell.toString().replace(/[^\d.-]/g, ''));
            if (isNaN(price)) continue;
            accum[sheetName].total += price;
            accum[sheetName].days += 1;
          }
        }

        const result: { [roomType: string]: { total: number; average: number; days: number } } = {};
        Object.entries(accum).forEach(([k, v]) => {
          if (v.days > 0) result[k] = { total: v.total, average: v.total / v.days, days: v.days };
        });

        console.log('Loaded room prices for date range:', result);
        return result;
      } catch (error) {
        console.error('Error reading room prices for date range:', error);
        return {};
      }
    }

    // Return per-night prices for a specific room sheet column between startDate (inclusive)
    // and endDate (exclusive). Returns array of { date: 'YYYY-MM-DD', price: number | null }
    async getPerNightPricesForRoom(sheetRoomName: string, startDate: string, endDate: string): Promise<Array<{ date: string; price: number | null }>> {
      try {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
        range: 'A:L', // columns A (dates) through L (last pricing column)
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) return [];

      const headerRow = rows[0];
      
      // Map sheet room names to column indices (columns I-L: indices 8-11)
      const roomToColIndex: { [sheetName: string]: number } = {
        '2x Single Bed Bedroom': 8,      // Column I
        'Double Bed Bedroom': 9,         // Column J
        'Bunk Bed Bedroom': 10,          // Column K
        'Whole House': 11,               // Column L (note: user said "Whole House Fix Pricing")
      };

      const colIndex = roomToColIndex[sheetRoomName];
      if (colIndex === undefined) return [];

      // Build a map date -> price for quick lookup
      const datePriceMap: { [date: string]: number } = {};
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateCell = row[0];
        if (!dateCell) continue;
        
        let formattedDate: string;
        try {
          // Parse MM/DD/YYYY format
          const parts = dateCell.toString().split('/');
          if (parts.length === 3) {
            const mm = parseInt(parts[0], 10);
            const dd = parseInt(parts[1], 10);
            const yyyy = parseInt(parts[2], 10);
            const parsed = new Date(yyyy, mm - 1, dd);
            formattedDate = parsed.toISOString().split('T')[0];
          } else {
            continue;
          if (!cell) continue;
          const price = parseFloat(cell.toString().replace(/[^\d.-]/g, ''));
          if (!isNaN(price)) datePriceMap[formattedDate] = price;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const results: Array<{ date: string; price: number | null }> = [];
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const iso = new Date(d).toISOString().split('T')[0];
          results.push({ date: iso, price: datePriceMap[iso] ?? null });
        }

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
        range: 'A:M', // Get data including column M for extra guest fees
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in sheet for extra guest fees');
        return 0;
      }

      const headerRow = rows[0];
      let dateColumnIndex = 0;
      let extraGuestFeeColumnIndex = -1;

      // Find column M index (extra guest fee column)
      headerRow.forEach((header: string, index: number) => {
        if (index === 12) { // Column M is index 12 (0-based)
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

      // Process each data row (skip header)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const dateValue = row[dateColumnIndex];
        
        if (!dateValue) continue;

        // Parse date
        let formattedDate: string;
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            // Try parsing DD/MM/YYYY format
            const parts = dateValue.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const year = parseInt(parts[2]);
              const parsedDate = new Date(year, month, day);
              formattedDate = parsedDate.toISOString().split('T')[0];
            } else {
              continue;
            }
          } else {
            formattedDate = date.toISOString().split('T')[0];
          }
        } catch (error) {
          continue;
        }

        // Check if date is within the booking range
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

      // Calculate average extra guest fee per day
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