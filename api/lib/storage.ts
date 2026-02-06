import { randomUUID } from 'crypto';

export interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  totalPrice: number;
  status: string;
  confirmed: boolean;
}

export interface InsertBooking {
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  totalPrice: number;
}

const bookings: Map<string, Booking> = new Map();

// Demo seed
const mock1: Booking = {
  id: randomUUID(),
  checkIn: '2024-08-25',
  checkOut: '2024-08-27',
  guests: 4,
  roomType: 'double-bed',
  guestName: 'Demo Booking',
  guestEmail: 'demo@example.com',
  guestPhone: '',
  totalPrice: 30000,
  status: 'confirmed',
  confirmed: true,
};

const mock2: Booking = {
  id: randomUUID(),
  checkIn: '2024-09-07',
  checkOut: '2024-09-08',
  guests: 2,
  roomType: 'single-bed',
  guestName: 'Demo Booking 2',
  guestEmail: 'demo2@example.com',
  guestPhone: '',
  totalPrice: 15000,
  status: 'confirmed',
  confirmed: true,
};

bookings.set(mock1.id, mock1);
bookings.set(mock2.id, mock2);

export const storage = {
  async getBookings(): Promise<Booking[]> {
    return Array.from(bookings.values());
  },
  async getBooking(id: string): Promise<Booking | undefined> {
    return bookings.get(id);
  },
  async createBooking(insert: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = {
      ...insert,
      id,
      guestPhone: insert.guestPhone || null,
      status: 'pending',
      confirmed: false,
    } as Booking;
    bookings.set(id, booking);
    return booking;
  },
  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const booking = bookings.get(id);
    if (!booking) return undefined;
    const updated = { ...booking, ...updates };
    bookings.set(id, updated as Booking);
    return updated as Booking;
  },
  async deleteBooking(id: string): Promise<boolean> {
    return bookings.delete(id);
  },
  async getBookingsByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Array.from(bookings.values()).filter(b => {
      const bStart = new Date(b.checkIn);
      const bEnd = new Date(b.checkOut);
      return bStart <= end && bEnd >= start;
    });
  }
};
