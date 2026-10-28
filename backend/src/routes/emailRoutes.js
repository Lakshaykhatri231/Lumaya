import express from 'express';
const router = express.Router();
import { sendVerificationEmail, sendEmailNotification } from '../services/emailService.js';

// Endpoint to send verification email
router.post('/send-email', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    await sendVerificationEmail(email, otp);
    res.status(200).json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Endpoint to send transaction notification email
router.post('/send-transaction-email', async (req, res) => {
  const { transactionDetails, recipientEmail } = req.body;

  if (!transactionDetails || !recipientEmail) {
    return res.status(400).json({ error: 'Transaction details and recipient email are required' });
  }

  try {
    await sendEmailNotification(transactionDetails, recipientEmail);
    res.status(200).json({ message: 'Transaction notification email sent successfully' });
  } catch (error) {
    console.error('Error sending transaction email:', error);
    res.status(500).json({ error: 'Failed to send transaction notification email' });
  }
});

export default router;
