import { createClient } from 'redis';
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

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTP = async (email, otp) => {
  await ensureConnection();
  
  // Store OTP with 10 minute expiration
  await redisClient.set(`otp:${email}`, otp, {
    EX: 600 // 10 minutes in seconds
  });
  
  console.log(`OTP stored for ${email}`);
};

export const verifyOTP = async (email, otp) => {
  await ensureConnection();
  
  const storedOTP = await redisClient.get(`otp:${email}`);
  
  if (!storedOTP) {
    console.log(`No OTP found for ${email}`);
    return false;
  }
  
  const isValid = storedOTP === otp;
  
  if (isValid) {
    // Remove the OTP after successful verification
    await redisClient.del(`otp:${email}`);
    console.log(`OTP verified and removed for ${email}`);
  } else {
    console.log(`Invalid OTP submitted for ${email}`);
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