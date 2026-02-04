# Pricing Implementation - Complete Setup

## Overview
This document describes the complete pricing implementation from Google Sheets integration to client-side display.

## Architecture

### 1. Google Sheets Service (`server/googleSheets.ts`)
Handles all communication with Google Sheets API v4.

**Environment Variables Required:**
- `GOOGLE_SHEETS_ID` - Your Google Sheet ID
- `GOOGLE_SHEETS_API_KEY` - Google Sheets API key (read-only)

**Sheet Structure:**
- **Column A**: Dates in MM/DD/YYYY format
- **Column I** (index 8): 2x Single Bed Bedroom - nightly price
- **Column J** (index 9): Double Bed Bedroom - nightly price
- **Column K** (index 10): Bunk Bed Bedroom - nightly price
- **Column L** (index 11): Whole House - nightly price
- **Column M** (index 12): Extra guest fee per night (applies to Whole House, guests > 6)
- **Column N** (index 13): Whole House cleaning fee (applied once per booking)
- **Column O** (index 14): Room cleaning fee (applied once per booking)
- **Columns P+**: DO NOT USE (ignored by system)

**Public Methods:**

```typescript
getPerNightPricesForRoom(roomName: string, startDate: string, endDate: string): Promise<{date: string, price: number | null}[]>
```
Returns an array of per-night prices for a given room type across a date range.
- `roomName`: One of "2x Single Bed Bedroom", "Double Bed Bedroom", "Bunk Bed Bedroom", "Whole House"
- `startDate`, `endDate`: ISO format (yyyy-mm-dd)
- Returns: Array where index corresponds to date (starting from startDate)

```typescript
getCleaningFee(roomType: "single-bed" | "double-bed" | "bunk-bed" | "whole-house"): Promise<number>
```
Returns cleaning fee for the room type.
- Whole House uses Column N
- Individual rooms use Column O

```typescript
getExtraGuestFeePerNight(startDate: string, endDate: string): Promise<number>
```
Returns average extra guest fee per night (Column M) across the date range.

### 2. Pricing Logic (`server/pricing.ts`)
Pure business logic for computing booking prices.

**Input (`PriceRequest`):**
```typescript
{
  roomType: string;      // "single-bed", "double-bed", "bunk-bed", "whole-house"
  checkIn: string;       // yyyy-mm-dd
  checkOut: string;      // yyyy-mm-dd
  guests: number;        // 1 or more
}
```

**Output (`PriceBreakdown`):**
```typescript
{
  nights: number;                    // Number of nights
  pricePerNight: number;             // Average nightly rate for display
  roomCost: number;                  // Sum of per-night prices × nights
  cleaningFee: number;               // One-time fee (Column N or O)
  extraGuestFeePerNight: number;     // Per guest per night (Column M)
  extraGuests: number;               // (guests - 6) if applicable, else 0
  extraGuestFeeTotal: number;        // extraGuests × extraGuestFeePerNight × nights
  total: number;                     // roomCost + cleaningFee + extraGuestFeeTotal
}
```

**Pricing Rules:**
1. **Room Cost**: Sum of per-night prices from Google Sheet
2. **Cleaning Fee**: Applied once per booking
   - Whole House: Uses Column N
   - Individual rooms: Uses Column O
3. **Extra Guest Fees**: Only applies to Whole House bookings with guests > 6
   - Extra guests = guests - 6
   - Fee per guest per night fetched from Column M
   - Total extra fee = extraGuests × extraGuestFeePerNight × nights

### 3. API Endpoint (`server/routes.ts`)

#### GET /api/price
Fetches pricing breakdown for a specific booking configuration.

**Query Parameters:**
- `roomType` (required): "single-bed", "double-bed", "bunk-bed", or "whole-house"
- `checkIn` (required): yyyy-mm-dd format
- `checkOut` (required): yyyy-mm-dd format
- `guests` (required): integer ≥ 1

**Response:** `PriceBreakdown` JSON

**Example:**
```
GET /api/price?roomType=whole-house&checkIn=2026-02-05&checkOut=2026-02-07&guests=8
```

Response:
```json
{
  "nights": 2,
  "pricePerNight": 150,
  "roomCost": 300,
  "cleaningFee": 50,
  "extraGuestFeePerNight": 30,
  "extraGuests": 2,
  "extraGuestFeeTotal": 120,
  "total": 470
}
```

#### POST /api/bookings
Creates a new booking. **Server-side price recomputation is automatic.**

- Client submits booking with `totalPrice`
- Server recomputes authoritative price using `computePrice()`
- Server overrides `totalPrice` with computed value (in cents)
- This prevents client-side price manipulation

### 4. Client Integration (`client/src/components/booking-section.tsx`)

**Live Price Fetching:**
- `useEffect` hook triggers when: `checkInDate`, `checkOutDate`, `selectedRoom`, or `guests` changes
- Fetches `/api/price` with current selections
- Updates local state with `serverPrice`
- Displays "loading..." indicator during fetch

**Display:**
- Price per night shown in room cards and summary
- Breakdown itemization:
  - Room cost (pricePerNight × nights)
  - Cleaning fee (if applicable)
  - Extra guest fees (Whole House only, guests > 6)
- Total cost always from server if available, else calculated client-side

**Error Handling:**
- Network errors gracefully fall back to hardcoded prices
- Loading state prevents double-submission

## Environment Variables

Required environment variables for production:

```bash
# Google Sheets API
GOOGLE_SHEETS_ID=your_sheet_id_here
GOOGLE_SHEETS_API_KEY=your_api_key_here

# Email notifications (optional - email service checks for these)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_HOST=smtp.gmail.com  # optional, defaults to smtp.gmail.com
EMAIL_PORT=587             # optional, defaults to 587
```

## Testing

### Manual API Test
```bash
curl "http://localhost:5000/api/price?roomType=single-bed&checkIn=2026-02-05&checkOut=2026-02-07&guests=2"
```

### Browser Test
1. Navigate to booking form
2. Select a room
3. Select check-in and check-out dates
4. Adjust guest count
5. Observe pricing updates in real-time
6. Check browser console for fetch calls

## Error Handling

**Missing Env Vars:**
- If `GOOGLE_SHEETS_ID` or `GOOGLE_SHEETS_API_KEY` missing: warnings logged, prices default to fallback values
- Email service gracefully disables if credentials missing

**API Errors:**
- Invalid dates or room types: 400 Bad Request
- Google Sheets unavailable: returns error, client falls back to hardcoded prices
- Network issues: caught and handled gracefully

**Data Issues:**
- Missing prices in Google Sheet: treated as null, skipped in calculations
- Invalid date format: throws error, operation fails

## Development Notes

1. **Date Conversion**: Google Sheet uses MM/DD/YYYY, system uses ISO yyyy-mm-dd internally
2. **Column Indices**: Using indices (8-14) not header names for robustness
3. **Server-Side Security**: Price recomputation happens server-side to prevent tampering
4. **Fallback Pricing**: Hardcoded prices in room definitions serve as fallback when Google Sheets unavailable
5. **Separation of Concerns**: GoogleSheetsService handles data, pricing.ts handles logic, routes.ts handles API

## Future Enhancements

1. Cache pricing data to reduce API calls
2. Bulk availability checks from Google Sheets
3. Dynamic pricing rules (seasonal, weekday vs weekend, etc.)
4. Admin dashboard for price management
5. Discount codes support
6. Payment processing integration
