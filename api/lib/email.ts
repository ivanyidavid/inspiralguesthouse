import nodemailer from 'nodemailer';
import { format, differenceInDays } from 'date-fns';

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  totalPrice: number;
  status: string;
  confirmed: boolean;
}

function createTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = parseInt(process.env.EMAIL_PORT || '587');

  if (!emailUser || !emailPass) {
    console.log('Email credentials not provided. Email notifications disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
}

export async function sendBookingNotification(booking: Booking): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. Skipping email notification.');
    return false;
  }

  try {
    const roomTypeMap: { [key: string]: string } = {
      "single-bed": "2x Single Bed Bedroom",
      "double-bed": "Double Bed Bedroom", 
      "bunk-bed": "Bunk Bed Bedroom",
      "whole-house": "Whole House"
    };

    const roomName = roomTypeMap[booking.roomType] || booking.roomType;
    
    // Parse dates safely using date-fns
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    
    const checkInFormatted = format(checkInDate, 'EEEE, MMMM d, yyyy');
    const checkOutFormatted = format(checkOutDate, 'EEEE, MMMM d, yyyy');
    
    // Calculate number of nights (add 1 day to account for full day difference)
    const nights = Math.max(1, differenceInDays(checkOutDate, checkInDate));
    
    const totalPrice = booking.totalPrice && booking.totalPrice > 0 ? booking.totalPrice / 100 : null;

    const emailContent = `
🏠 New Booking Received - InSpiral Guest House

📋 BOOKING DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━
• Booking ID: ${booking.id}
• Room Type: ${roomName}
• Guest Name: ${booking.guestName}
• Email: ${booking.guestEmail}
• Phone: ${booking.guestPhone || 'Not provided'}
• Number of Guests: ${booking.guests}

📅 DATES:
━━━━━━━━━━━━━━━━━━━━━━━━━━
• Check-in: ${checkInFormatted}
• Check-out: ${checkOutFormatted}
• Duration: ${nights} night${nights > 1 ? 's' : ''}

💰 PRICING:
━━━━━━━━━━━━━━━━━━━━━━━━━━
• Rate: See pricing table on the website
• Total: ${totalPrice !== null ? `€${totalPrice}` : 'See pricing table'}

⏰ Booking submitted: ${format(new Date(), 'PPpp')}

Please contact the guest to confirm their booking and arrange payment details.
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'ivanyi.david96@gmail.com',
      subject: `🏠 New Booking: ${booking.guestName} - ${roomName}`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>').replace(/━/g, '─')
    };

    await transporter.sendMail(mailOptions);
    console.log(`Booking notification email sent for booking ${booking.id}`);
    return true;
  } catch (error) {
    console.error('Error sending booking notification email:', error);
    return false;
  }
}
