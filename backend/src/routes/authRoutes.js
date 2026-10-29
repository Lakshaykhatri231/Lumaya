import express from 'express';
import { supabase } from '../utils/supabase.js';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { generateOTP, storeOTP, verifyOTP } from '../services/otpService.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/emailService.js';

const router = express.Router();

const saveSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

// Get Current User
router.get('/user', authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

// Sign Up Initiation
router.post('/signup/initiate', async (req, res) => {
  const { email, password, phoneNumber } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Optional phone number validation
  if (phoneNumber && !/^\+?[\d\s\-\(\)]{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    if (!req.session.auth) {
      req.session.auth = {};
    }

    const otp = generateOTP();
    await storeOTP(email, otp);
    await sendVerificationEmail(email, otp);

    // Store pending signup data in session (including phone number)
    req.session.auth.pendingSignup = {
      email,
      password,
      phoneNumber: phoneNumber || null
    };

    // Save explicitly so it's written to Redis before we respond
    await saveSession(req);

    res.status(200).json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Signup initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate signup' });
  }
});

// Sign Up Completion
router.post('/signup/complete', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const pendingSignup = req.session.auth?.pendingSignup;
    if (!pendingSignup) {
      return res.status(400).json({ error: 'No pending signup found' });
    }

    if (pendingSignup.email !== email) {
      return res.status(400).json({ error: 'Email mismatch' });
    }

    const isValidOtp = await verifyOTP(email, otp);
    if (!isValidOtp) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Phone number rides along as user metadata at creation time
    const { data, error } = await supabase.auth.signUp({
      email: pendingSignup.email,
      password: pendingSignup.password,
      options: pendingSignup.phoneNumber
        ? { data: { phone_number: pendingSignup.phoneNumber } }
        : undefined
    });

    if (error) throw error;

    delete req.session.auth.pendingSignup;
    await saveSession(req);

    // A failed welcome email shouldn't fail an account that was already created
    sendWelcomeEmail(email).catch((err) => console.error('Welcome email failed:', err.message));

    res.status(200).json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Signup completion error:', error);
    res.status(500).json({ error: 'Failed to complete signup' });
  }
});

// Sign In
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    res.status(200).json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Sign in error:', error.message);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Sign Out: revoke the caller's refresh tokens and drop any server-side auth state
router.post('/signout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const { error } = await supabaseAdmin.auth.admin.signOut(token);
      if (error) console.error('Token revocation failed:', error.message);
    }

    if (req.session?.auth) {
      delete req.session.auth;
    }

    res.status(200).json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({ error: 'Failed to sign out' });
  }
});

export default router;
