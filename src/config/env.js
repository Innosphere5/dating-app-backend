import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    apiKey: process.env.FIREBASE_API_KEY
  },
  mail: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM || 'Dating App <noreply@datingapp.com>',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS
  },
  session: {
    secret: process.env.SESSION_SECRET || 'fallback_session_secret_32chars_long'
  }
};

export default config;
