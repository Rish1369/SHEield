// This file centralizes all configuration variables
require('dotenv').config(); // Loads variables from your .env file

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 8000,
    env: process.env.NODE_ENV || 'development',
  },

  // Database configuration
  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  // API Keys from environment variables
  apiKeys: {
    gemini: process.env.GEMINI_API_KEY,
    googleMaps: process.env.GOOGLE_MAPS_API_KEY,
  },

  // --- ✅ ADDED: Twilio Configuration ---
  // This section was missing, causing the crash.
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // --- ✅ ADDED: Cloudinary Configuration ---
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // Emergency settings
  emergency: {
    responseTimeout: 30000,
    maxNotificationRetries: 3,
  },
};