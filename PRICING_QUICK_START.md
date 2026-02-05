# Quick Start: Pricing System Setup

## What Was Implemented

A complete pricing system that reads nightly rates and fees from a Google Sheet and displays live pricing in the booking form.

## What You Need to Do

### 1. Set Up Google Sheets

1. Open your Google Sheet with pricing data
2. Verify the structure:
   - **Column A**: Dates in MM/DD/YYYY format
   - **Column I**: 2x Single Bed Bedroom nightly price
   - **Column J**: Double Bed Bedroom nightly price
   - **Column K**: Bunk Bed Bedroom nightly price
   - **Column L**: Whole House nightly price
   - **Column M**: Extra guest fee per night (for Whole House)
   - **Column N**: Whole House cleaning fee
   - **Column O**: Room cleaning fee

### 2. Get API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable Google Sheets API
4. Create an API Key (not OAuth) - this is your `GOOGLE_SHEETS_API_KEY`
5. Get your Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/`

### 3. Set Environment Variables

Create a `.env` file in the project root (or set via Vercel/deployment platform):

```env
# Required
GOOGLE_SHEETS_ID=your_sheet_id_here
GOOGLE_SHEETS_API_KEY=your_api_key_here

# Optional (for email notifications)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### 4. Test It

#### Option A: Local Testing
```bash
npm run build
npm start
```
Then visit `http://localhost:5000` and test the booking form.

#### Option B: API Testing
```bash
curl "http://localhost:5000/api/price?roomType=single-bed&checkIn=2026-02-05&checkOut=2026-02-07&guests=2"
```

Expected response:
```json
{
  "nights": 2,
  "pricePerNight": 80,
  "roomCost": 160,
  "cleaningFee": 30,
  "extraGuestFeePerNight": 0,
  "extraGuests": 0,
  "extraGuestFeeTotal": 0,
  "total": 190
}
```

### 5. Deploy

On Vercel/Netlify, add environment variables:
1. Dashboard → Project Settings → Environment Variables
2. Add:
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SHEETS_API_KEY`
   - `EMAIL_USER` (optional)
   - `EMAIL_PASS` (optional)

## How It Works

### Client Side
1. User selects a room and dates
2. JavaScript fetches `/api/price` with selection details
3. Server returns price breakdown
4. Component displays pricing in real-time
5. User submits booking

### Server Side
1. Client sends booking request
2. Server recomputes price (to prevent tampering)
3. Server uses computed price instead of client price
4. Booking is saved with authoritative price

## Example Sheet Structure

| Column | Header | Values | Example |
|--------|--------|--------|---------|
| A | Date | MM/DD/YYYY | 02/05/2026 |
| I | 2x Single Bed | €/night | 80 |
| J | Double Bed | €/night | 100 |
| K | Bunk Bed | €/night | 90 |
| L | Whole House | €/night | 150 |
| M | Extra Guest Fee | €/night | 30 |
| N | WH Cleaning | €/booking | 50 |
| O | Room Cleaning | €/booking | 25 |

## Pricing Logic Examples

### Single Room Booking
- 2 nights, Single Bed @ €80/night, €25 cleaning
- Total: (80 × 2) + 25 = €185

### Whole House for 8 People
- 2 nights, Whole House @ €150/night, €50 cleaning
- 2 extra guests @ €30/night
- Total: (150 × 2) + 50 + (2 × 30 × 2) = €420

### Whole House for 4 People
- No extra guest fees (must be > 6 guests)
- 2 nights, Whole House @ €150/night, €50 cleaning
- Total: (150 × 2) + 50 = €350

## Troubleshooting

### Prices Not Updating
- Check browser console for fetch errors
- Verify `GOOGLE_SHEETS_ID` and `GOOGLE_SHEETS_API_KEY` are set
- Check Google Sheets data format (dates must be MM/DD/YYYY)

### Fallback Prices Showing
- Google Sheets API error (check sheet permissions)
- Missing environment variables
- Check server logs for errors

### Email Not Sending
- This is optional; email service gracefully disables if credentials missing
- No impact on booking functionality

## File Structure

```
server/
  ├── googleSheets.ts    # Google Sheets API integration
  ├── pricing.ts         # Pricing computation logic
  └── routes.ts          # /api/price endpoint (updated)

client/src/components/
  └── booking-section.tsx # Live pricing fetching (updated)
```

## API Reference

### GET /api/price
Compute price for a booking configuration.

**Parameters:**
- `roomType` - "single-bed" | "double-bed" | "bunk-bed" | "whole-house"
- `checkIn` - yyyy-mm-dd
- `checkOut` - yyyy-mm-dd  
- `guests` - integer ≥ 1

**Response:** PriceBreakdown JSON

### POST /api/bookings
Create booking (prices recomputed server-side automatically).

See [PRICING_IMPLEMENTATION.md](PRICING_IMPLEMENTATION.md) for complete documentation.
