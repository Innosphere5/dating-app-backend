import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import config from './env.js';

let resendClient = null;
if (config.mail.resendApiKey && !config.mail.resendApiKey.includes('placeholder')) {
  resendClient = new Resend(config.mail.resendApiKey);
}

let nodemailerTransport = null;
if (config.mail.smtpHost && config.mail.smtpUser) {
  nodemailerTransport = nodemailer.createTransport({
    host: config.mail.smtpHost,
    port: config.mail.smtpPort,
    secure: config.mail.smtpPort === 465,
    auth: {
      user: config.mail.smtpUser,
      pass: config.mail.smtpPass
    }
  });
}

export { resendClient, nodemailerTransport };
