#!/usr/bin/env node

/**
 * Generate a secure session secret for production use
 */

import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('hex');

console.log('Generated SESSION_SECRET:');
console.log('========================');
console.log(secret);
console.log('========================');
console.log('\nAdd this to your Railway environment variables:');
console.log(`SESSION_SECRET=${secret}`);