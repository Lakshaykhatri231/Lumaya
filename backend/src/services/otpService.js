import { createClient } from 'redis';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis OTP Service Error:', err);
});

// Track connection state
let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    await redisClient.connect();
    isConnected = true;
    console.log('OTP Service: Redis connected');
  }
}

const MAX_OTP_ATTEMPTS = 5;

export const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const storeOTP = async (email, otp) => {
  await ensureConnection();
  
  // Store OTP with 10 minute expiration
  await redisClient.set(`otp:${email}`, otp, {
    EX: 600 // 10 minutes in seconds
  });
  // A fresh code resets the guess counter
  await redisClient.del(`otp_attempts:${email}`);
  
  console.log(`OTP stored for ${email}`);
};

export const verifyOTP = async (email, otp) => {
  await ensureConnection();
  
  const storedOTP = await redisClient.get(`otp:${email}`);
  
  if (!storedOTP) {
    console.log(`No OTP found for ${email}`);
    return false;
  }
  
  const isValid = storedOTP === String(otp);
  
  if (isValid) {
    // Remove the OTP after successful verification
    await redisClient.del([`otp:${email}`, `otp_attempts:${email}`]);
    console.log(`OTP verified and removed for ${email}`);
  } else {
    console.log(`Invalid OTP submitted for ${email}`);
    // Burn the code after too many wrong guesses so a 6-digit code can't be brute-forced
    const attempts = await redisClient.incr(`otp_attempts:${email}`);
    if (attempts === 1) await redisClient.expire(`otp_attempts:${email}`, 600);
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await redisClient.del([`otp:${email}`, `otp_attempts:${email}`]);
      console.log(`OTP for ${email} invalidated after ${attempts} failed attempts`);
    }
  }
  
  return isValid;
};

// Graceful shutdown function
export const closeConnection = async () => {
  if (isConnected) {
    await redisClient.quit();
    isConnected = false;
    console.log('OTP Service: Redis connection closed');
  }
};