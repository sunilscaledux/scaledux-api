import { Router } from 'express';
import { listBookings, getBooking, updateBookingStatus } from './BookingController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.BOOKINGS_VIEW), listBookings);
router.get('/:uniqueId', requirePermission(PERMISSIONS.BOOKINGS_VIEW), getBooking);
router.patch('/:id/status', requirePermission(PERMISSIONS.BOOKINGS_MANAGE), updateBookingStatus);

export default router;
