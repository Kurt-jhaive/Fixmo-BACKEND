/**
 * Test script for verification resubmit feature
 * Tests the ability for rejected users to resubmit verification documents
 */

import axios from 'axios';

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:3000';

async function testVerificationResubmit() {
    console.log('🧪 Testing Verification Resubmit Feature\n');

    try {
        // Test 1: Check customer verification status
        console.log('1️⃣ Testing: Get customer verification status');
        console.log('Endpoint: GET /api/verification/customer/status');
        console.log('Required: Valid customer JWT token');
        console.log('Expected: Returns verification status, rejection reason if rejected\n');

        // Test 2: Resubmit verification (for rejected accounts)
        console.log('2️⃣ Testing: Resubmit verification after rejection');
        console.log('Endpoint: POST /api/verification/customer/resubmit');
        console.log('Required Headers: Authorization: Bearer <customer_token>');
        console.log('Required Body: { valid_id_url: "https://cloudinary.com/..." }');
        console.log('Expected Response:');
        console.log('  - Changes verification_status from "rejected" to "pending"');
        console.log('  - Clears rejection_reason');
        console.log('  - Sets verification_submitted_at to current timestamp');
        console.log('  - Admin must approve again\n');

        console.log('📝 API Documentation:\n');
        console.log('Customer Verification Status:');
        console.log('  GET /api/verification/customer/status');
        console.log('  Headers: Authorization: Bearer <customer_token>');
        console.log('  Response: {');
        console.log('    success: true,');
        console.log('    message: "Verification status retrieved successfully",');
        console.log('    data: {');
        console.log('      user_id: number,');
        console.log('      first_name: string,');
        console.log('      last_name: string,');
        console.log('      email: string,');
        console.log('      is_verified: boolean,');
        console.log('      verification_status: "pending" | "approved" | "rejected",');
        console.log('      rejection_reason: string | null,');
        console.log('      verification_submitted_at: datetime,');
        console.log('      verification_reviewed_at: datetime,');
        console.log('      valid_id: string,');
        console.log('      profile_photo: string');
        console.log('    }');
        console.log('  }\n');

        console.log('Resubmit Verification:');
        console.log('  POST /api/verification/customer/resubmit');
        console.log('  Headers: Authorization: Bearer <customer_token>');
        console.log('  Body: {');
        console.log('    valid_id_url: string (Cloudinary URL of new valid ID)');
        console.log('  }');
        console.log('  Response: {');
        console.log('    success: true,');
        console.log('    message: "Verification documents re-submitted successfully...",');
        console.log('    data: {');
        console.log('      user_id: number,');
        console.log('      verification_status: "pending",');
        console.log('      verification_submitted_at: datetime');
        console.log('    }');
        console.log('  }\n');

        console.log('⚠️ Important Notes:');
        console.log('  - Only accounts with verification_status = "rejected" can resubmit');
        console.log('  - Accounts with verification_status = "approved" will get error');
        console.log('  - Must provide valid_id_url (upload to Cloudinary first)');
        console.log('  - After resubmission, admin must review and approve/reject again');
        console.log('  - Rejection reason is cleared upon resubmission\n');

        console.log('✅ Testing guide complete!');
        console.log('\n📚 For more details, see VERIFICATION_SYSTEM_DOCUMENTATION.md');

    } catch (error) {
        console.error('❌ Test error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testVerificationResubmit().catch(console.error);
