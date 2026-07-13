import { Router } from 'express';
import {
  showLoginPage,
  showRegisterPage,
  showForgotPasswordPage,
  showResetPasswordPage,
  register,
  login,
  googleLogin,
  googleCallback,
  googleSessionCallback,
  logout,
  forgotPassword,
  resetPassword,
  dashboard,
  showUploadPage,
  showVerifyPage,
  verifySession
} from '../controllers/auth.controller.js';
import { requireAuth, redirectIfAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/auth/login', redirectIfAuthenticated, showLoginPage);
router.post('/auth/login', login);

router.get('/auth/register', redirectIfAuthenticated, showRegisterPage);
router.post('/auth/register', register);

router.get('/auth/google', googleLogin);
router.get('/auth/google/callback', googleCallback);
router.post('/auth/google/session', googleSessionCallback);

router.post('/auth/logout', requireAuth, logout);

router.get('/auth/forgot-password', showForgotPasswordPage);
router.post('/auth/forgot-password', forgotPassword);

router.get('/auth/reset-password', showResetPasswordPage);
router.post('/auth/reset-password', resetPassword);

router.get('/dashboard', requireAuth, dashboard);
router.get('/upload', requireAuth, showUploadPage);

router.get('/auth/verify', showVerifyPage);
router.post('/auth/verify/session', verifySession);

export default router;
