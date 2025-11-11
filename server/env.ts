/**
 * Environment variable loader
 * Ensures environment variables are available before the app starts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only try to load .env file in development
// In production (Railway), environment variables are injected directly
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.resolve(__dirname, '..', '.env');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.warn('⚠️  No .env file found at:', envPath);
    console.warn('⚠️  Using environment variables from system');
  } else {
    console.log('✅ Loaded .env file from:', envPath);
  }
} else {
  console.log('🚀 Production mode: Using Railway injected environment variables');
}

// Log environment loading status
console.log('📋 Environment Variables Loading Status:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('   PORT:', process.env.PORT || 'not set (will default to 5000)');

// Export a function to validate critical environment variables
export function validateEnvironment() {
  const issues: string[] = [];

  // Check OAuth variables
  if (!process.env.GOOGLE_CLIENT_ID) {
    issues.push('GOOGLE_CLIENT_ID is not set');
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    issues.push('GOOGLE_CLIENT_SECRET is not set');
  }
  if (!process.env.GOOGLE_CALLBACK_URL) {
    issues.push('GOOGLE_CALLBACK_URL is not set');
  }

  // Check session secret
  if (!process.env.SESSION_SECRET) {
    issues.push('SESSION_SECRET is not set (will use random value)');
  }

  // Check database
  if (!process.env.DATABASE_URL) {
    issues.push('DATABASE_URL is not set (some features may be limited)');
  }

  return {
    hasIssues: issues.length > 0,
    issues,
    oauthConfigured: !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CALLBACK_URL
    ),
    databaseConfigured: !!process.env.DATABASE_URL,
    sessionConfigured: !!process.env.SESSION_SECRET
  };
}

// Validate on load
const validation = validateEnvironment();
if (validation.hasIssues) {
  console.log('⚠️  Environment validation issues found:');
  validation.issues.forEach(issue => console.log(`   - ${issue}`));
}

export default validation;