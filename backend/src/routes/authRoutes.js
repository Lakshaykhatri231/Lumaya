import express from 'express';
import { supabase } from '../utils/supabase.js';
import { generateOTP, storeOTP, verifyOTP } from '../services/otpService.js';
import { sendVerificationEmail,sendEmailNotification,sendWelcomeEmail } from '../services/emailService.js';

const router = express.Router();

// Get Current User
router.get('/user', async (req, res) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Not authenticated' });
  }
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
    // Initialize session object if it doesn't exist
    if (!req.session.auth) {
      req.session.auth = {};
    }
    
    const otp = generateOTP();
    await sendVerificationEmail(email, otp);
    storeOTP(email, otp);
    
    // Store pending signup data in session (including phone number)
    req.session.auth.pendingSignup = { 
      email, 
      password, 
      phoneNumber: phoneNumber || null 
    };
    
    // Save the session explicitly to ensure it's written to Redis
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        resolve();
      });
    });
    
    console.log('Session saved with pending signup:', email);
    res.status(200).json({ message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Signup initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate signup' });
  }
});

// Modified signup completion route
router.post('/signup/complete', async (req, res) => {
  const { email, otp } = req.body;
  
  try {
    console.log('Session data on complete:', req.session);
    
    if (!req.session.auth?.pendingSignup) {
      console.error('No pending signup found in session for:', email);
      return res.status(400).json({ error: 'No pending signup found' });
    }
    
    const pendingSignup = req.session.auth.pendingSignup;
    console.log('Found pending signup for:', pendingSignup.email);
    
    if (pendingSignup.email !== email) {
      return res.status(400).json({ error: 'Email mismatch' });
    }
    
    const isValidOtp = await verifyOTP(email, otp);
    if (!isValidOtp) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Create user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email: pendingSignup.email,
      password: pendingSignup.password,
    });
    
    if (error) throw error;
    
    // If phone number was provided, update user metadata
    if (pendingSignup.phoneNumber && data.user) {
      try {
        // Update user metadata with phone number
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            phone_number: pendingSignup.phoneNumber 
          }
        });
        
        if (updateError) {
          console.error('Error updating user metadata:', updateError);
          // Don't fail the signup if metadata update fails
        } else {
          console.log('Phone number saved successfully:', pendingSignup.phoneNumber);
        }
        
        // Alternatively, if you have a custom users table, insert the phone number there
        // const { error: insertError } = await supabase
        //   .from('users')
        //   .insert({
        //     id: data.user.id,
        //     email: data.user.email,
        //     phone_number: pendingSignup.phoneNumber,
        //     created_at: new Date().toISOString()
        //   });
        
      } catch (metadataError) {
        console.error('Error saving phone number:', metadataError);
        // Continue with signup even if phone number storage fails
      }
    }
    
    // Clear pending signup data
    delete req.session.auth.pendingSignup;
    
    // Save the session explicitly again after removal
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        resolve();
      });
    });
    
    // Send welcome email
    await sendWelcomeEmail(email);
    
    // Return both user and session data
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
    console.error('Sign in error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Password Reset Initiation
// Server-side routes
// router.post('/password/reset/initiate', async (req, res) => {
//     const { email } = req.body;
  
//     if (!email) {
//       return res.status(400).json({ error: 'Email is required' });
//     }
  
//     try {
//       const origin = process.env.NODE_ENV === 'production'
//         ? process.env.FRONTEND_URL
//         : 'http://localhost:5173';
  
//       // Using Supabase's PKCE flow for password reset
//       const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
//         redirectTo: `${origin}/auth`, // Page where user will set new password
//       });
  
//       if (error) throw error;
  
//       res.status(200).json({ 
//         message: 'Password reset instructions sent successfully'
//       });
//     } catch (error) {
//       console.error('Password reset initiation error:', error);
//       res.status(500).json({ error: 'Failed to initiate password reset' });
//     }
//   });
  
//   // Updated route for completing password reset
//   router.post('/password/reset/complete', async (req, res) => {
//     const { newPassword } = req.body;
  
//     if (!newPassword) {
//       return res.status(400).json({ 
//         error: 'New password is required' 
//       });
//     }
  
//     try {
//       // Update user's password
//       const { data, error } = await supabase.auth.updateUser({
//         password: newPassword
//       });
  
//       if (error) throw error;
  
//       res.status(200).json({ message: 'Password reset successful' });
//     } catch (error) {
//       console.error('Password reset completion error:', error);
//       res.status(500).json({ error: error.message || 'Failed to reset password' });
//     }
//   });

// Get all users with phone numbers (admin function for messaging)
router.get('/users/phone-numbers', async (req, res) => {
  try {
    // This should be protected - only allow admin access
    // Add your admin authentication check here
    
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    
    // Filter and map users who have phone numbers
    const usersWithPhones = users
      .filter(user => user.user_metadata?.phone_number)
      .map(user => ({
        id: user.id,
        email: user.email,
        phone_number: user.user_metadata.phone_number,
        created_at: user.created_at
      }));
    
    res.status(200).json({ users: usersWithPhones });
  } catch (error) {
    console.error('Error getting users with phone numbers:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Sign Out
router.post('/signout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear any auth-related session data
    if (req.session.auth) {
      delete req.session.auth;
    }
    
    res.status(200).json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({ error: 'Failed to sign out' });
  }
});

export default router;