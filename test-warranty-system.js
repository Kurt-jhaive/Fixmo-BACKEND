#!/usr/bin/env node

/**
 * Test Script for Fixmo Warranty Conversation System
 * 
 * Usage:
 *   node test-warranty-system.js
 *   
 * This script tests all warranty conversation functionality
 */

import 'dotenv/config';
import { runAllExamples } from './src/services/warrantyExamples.js';

console.log('🧪 Testing Fixmo Warranty Conversation System');
console.log('⏰ Started at:', new Date().toISOString());
console.log('');

// Run all examples
await runAllExamples();

console.log('');
console.log('⏰ Finished at:', new Date().toISOString());
console.log('🎉 Test completed!');