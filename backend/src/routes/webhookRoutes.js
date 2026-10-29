import express from 'express';
import { Paddle } from '@paddle/paddle-node-sdk';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { applySubscriptionEvent } from '../services/subscriptionService.js';

const router = express.Router();
const paddle = new Paddle(process.env.PADDLE_API_KEY);

const PADDLE_SANDBOX_IPS = [
  '34.194.127.46',
  '54.234.237.108',
  '3.208.120.145',
  '44.226.236.210',
  '44.241.183.62',
  '100.20.172.113'
];

const PADDLE_LIVE_IPS = [
  '34.232.58.13',
  '34.195.105.136',
  '34.237.3.244',
  '35.155.119.135',
  '52.11.166.252',
  '34.212.5.7'
];

// Set PADDLE_ENV=sandbox when testing with Paddle's sandbox
const PADDLE_IPS = process.env.PADDLE_ENV === 'sandbox' ? PADDLE_SANDBOX_IPS : PADDLE_LIVE_IPS;

const verifyPaddleIP = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  if (!PADDLE_IPS.includes(clientIP)) {
    console.error(`Rejected webhook from unauthorized IP: ${clientIP}`);
    return res.status(403).json({ error: 'Unauthorized IP address' });
  }

  const userAgent = req.get('User-Agent') || '';
  if (!userAgent.includes('Paddle')) {
    console.error(`Rejected webhook with invalid User-Agent: ${userAgent}`);
    return res.status(403).json({ error: 'Unauthorized request' });
  }

  next();
};

// Signature verification needs the exact raw bytes, so this router must be mounted
// before the global JSON body parser (see app.js).
router.use('/paddle', express.raw({ type: 'application/json' }));
router.use('/paddle', verifyPaddleIP);

router.post('/paddle', async (req, res) => {
  let eventData;
  try {
    const signature = req.headers['paddle-signature'] || '';
    const rawRequestBody = req.body.toString();
    eventData = await paddle.webhooks.unmarshal(rawRequestBody, process.env.WEBHOOK_SECRET_KEY || '', signature);
  } catch (verificationError) {
    console.error('Webhook verification failed:', verificationError);
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Acknowledge first so Paddle doesn't time out and retry while we write to the database
  res.status(200).json({ success: true });

  try {
    const { event_type, data } = eventData;
    const result = await applySubscriptionEvent(supabaseAdmin, event_type, data);
    console.log(`Webhook ${event_type}:`, result);
  } catch (processingError) {
    console.error('Async webhook processing error:', processingError);
  }
});

export default router;
