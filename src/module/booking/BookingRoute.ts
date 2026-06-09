import { Router } from 'express';
import { BookingController } from './BookingController';
import { authenticateToken, optionalAuth } from '@middleware/auth';

const router = Router();

router.post('/', authenticateToken, BookingController.createBooking);
router.get('/slots/:mentorId', optionalAuth, BookingController.getOccupiedSlots);
router.get('/analytics', authenticateToken, BookingController.getAnalytics);
router.get('/', authenticateToken, BookingController.listBookings);
router.get('/:uniqueId', authenticateToken, BookingController.getBooking);
router.post('/:uniqueId/create-order', authenticateToken, BookingController.createOrder);
router.post('/:uniqueId/verify-payment', authenticateToken, BookingController.verifyPayment);
router.patch('/:uniqueId/recording', authenticateToken, BookingController.updateRecording);
router.post('/:uniqueId/cancel', authenticateToken, BookingController.cancelBooking);
router.post('/:uniqueId/request-reschedule', authenticateToken, BookingController.requestReschedule);
router.post('/:uniqueId/meeting-link', authenticateToken, BookingController.addMeetingLink);
router.post('/:uniqueId/request-meeting-link', authenticateToken, BookingController.requestMeetingLink);
router.post('/:uniqueId/complete', authenticateToken, BookingController.completeBooking);
router.post('/:uniqueId/accept-completion', authenticateToken, BookingController.acceptCompletion);

export default router;
