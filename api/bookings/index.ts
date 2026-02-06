import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../api/lib/cors';
import { storage } from '../../server/storage';
import { insertBookingSchema } from '../../shared/schema';
import { emailService } from '../../server/emailService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    try {
      const bookings = await storage.getBookings();
      return res.json(bookings);
    } catch (error) {
      return res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  }

  if (req.method === 'POST') {
    try {
      const validatedData = insertBookingSchema.parse(req.body);

      const conflictingBookings = await storage.getBookingsByDateRange(
        validatedData.checkIn,
        validatedData.checkOut
      );

      const hasConflict = conflictingBookings.some(booking => 
        booking.roomType === validatedData.roomType || 
        booking.roomType === 'whole-house' || 
        validatedData.roomType === 'whole-house'
      );

      if (hasConflict) {
        return res.status(409).json({ message: 'The selected room/dates are not available. Please choose different dates or room type.' });
      }

      const checkInDate = new Date(validatedData.checkIn);
      const checkOutDate = new Date(validatedData.checkOut);

      if (checkInDate >= checkOutDate) {
        return res.status(400).json({ message: 'Check-out date must be after check-in date' });
      }

      const today = new Date();
      today.setHours(0,0,0,0);
      if (checkInDate < today) {
        return res.status(400).json({ message: 'Check-in date must be in the future' });
      }

      const booking = await storage.createBooking(validatedData as any);

      // send notification asynchronously
      emailService.sendBookingNotification(booking).catch(err => console.error('Email error', err));

      return res.status(201).json(booking);
    } catch (error: any) {
      if (error?.errors) {
        return res.status(400).json({ message: 'Invalid booking data', errors: error.errors });
      }
      console.error('Create booking error', error);
      return res.status(500).json({ message: 'Failed to create booking' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

