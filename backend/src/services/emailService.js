import { Resend } from 'resend';
import { config, initializeConfig } from '../config/index.js'; // Ensure correct import path


const sendWelcomeEmail = async (email) => {
  try {
    // Wait for the config to be initialized
    await initializeConfig();

    // Initialize Resend with the API key from config
    const resend = new Resend(config.resend.apiKey);

    const subject = 'Welcome to LUMAYA!';
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333;">Welcome to Lumaya 🌿</h1>
        <p>We're so glad you're here. Your account has been successfully created.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">About Lumaya</h2>
          <p>At Lumaya, we believe that mental health support should be accessible, consistent, and stigma-free. Our AI-powered chat companion offers a safe space to express yourself, reflect, and feel heard — anytime you need it. While we don't replace real therapy, we aim to bridge the gap by offering emotional support and helpful conversation in moments where professional help isn’t immediately available.</p>
        </div>
        
        <h2 style="color: #333;">What You Can Expect</h2>
        <ul style="list-style-type: none; padding: 0;">
          <li style="margin-bottom: 10px;">
            <strong>💬 Thoughtful Conversations</strong>
            <p>Talk freely with an AI that listens, responds with empathy, and adapts to your emotional tone</p>
          </li>
          <li style="margin-bottom: 10px;">
            <strong>🧭 Emotional Guidance</strong>
            <p>Receive gentle nudges and questions to help you explore what you’re feeling and why</p>
          </li>
          <li style="margin-bottom: 10px;">
            <strong>🔐 Your Privacy Matters</strong>
            <p>Your conversations are private and secure — always</p>
          </li>
        </ul>
        
        <p>Thank you for trusting Lumaya. We're here for you, one message at a time.</p>
        <p>- The Lumaya Team</p>
      </div>
    `;


    // Send the email
    await resend.emails.send({
      from: 'Lumaya <support@thelumaya.com>',
      to: email,
      subject: subject,
      html: content,
    });

    console.log(`Welcome email sent successfully to ${email}`);
  } catch (error) {
    console.error(`Error sending welcome email:`, error.message);
    throw new Error(`Failed to send welcome email`);
  }
};


// Define the sendVerificationEmail function
const sendVerificationEmail = async (email, otp) => {
  try {
    // Wait for the config to be initialized
    await initializeConfig();

    // Initialize Resend with the API key from config
    const resend = new Resend(config.resend.apiKey);

    // Send the email
    await resend.emails.send({
      from: 'Lumaya <support@thelumaya.com>',
      to: email,
      subject: 'Verify Your Email – Welcome to Lumaya',
      html: `
        <h1>Verify Your Email</h1>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    });

    console.log('Verification email sent successfully');
  } catch (error) {
    console.error('Error sending verification email:', error.message);
    throw new Error('Failed to send verification email');
  }
};

export { sendVerificationEmail, sendWelcomeEmail };
