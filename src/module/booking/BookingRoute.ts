import { Router } from 'express';
import { BookingController } from './BookingController';
import { authenticateToken } from '@middleware/auth';

const router = Router();

router.post('/', authenticateToken, BookingController.createBooking);
router.get('/', authenticateToken, BookingController.listBookings);
router.get('/:uniqueId', authenticateToken, BookingController.getBooking);
router.post('/:uniqueId/create-order', authenticateToken, BookingController.createOrder);
router.post('/:uniqueId/verify-payment', authenticateToken, BookingController.verifyPayment);
router.post('/:uniqueId/cancel', authenticateToken, BookingController.cancelBooking);

export default router;
