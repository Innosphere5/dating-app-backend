import { Router } from 'express';
import {
  showVerifyPendingPage,
  handleVerificationCallback,
  resendVerification
} from '../controllers/verification.controller.js';
import { resendRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/auth/verify-pending', showVerifyPendingPage);
router.get('/auth/verified', handleVerificationCallback);
router.post('/auth/resend-verification', resendRateLimiter, resendVerification);

export default router;
