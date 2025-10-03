/**
 * Test script for verification resubmission with file uploads
 * Tests both customer and provider resubmission endpoints with multer
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000/api';

// You'll need to replace these with actual tokens
const CUSTOMER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with real customer token
const PROVIDER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with real provider token

/**
 * Test Customer Resubmission with File Upload
 */
async function testCustomerFileUpload() {
    console.log('\n📤 Testing Customer Resubmission with File Upload...\n');

    try {
        const formData = new FormData();

        // Create test image buffers (or use actual files)
        const testImagePath = path.join(process.cwd(), 'test-image.jpg');
        
        // Check if test image exists, otherwise skip
        if (!fs.existsSync(testImagePath)) {
            console.log('⚠️  No test image found. Skipping file upload test.');
            console.log('   Create a test-image.jpg in the root directory to test file uploads.\n');
            return;
        }

        formData.append('valid_id', fs.createReadStream(testImagePath));
        formData.append('profile_photo', fs.createReadStream(testImagePath));

        const response = await fetch(`${API_BASE}/verification/customer/resubmit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CUSTOMER_TOKEN}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Customer file upload successful!');
            console.log('Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Customer file upload failed!');
            console.log('Status:', response.status);
            console.log('Error:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.log('❌ Error testing customer file upload:', error.message);
    }
}

/**
 * Test Customer Resubmission with URL
 */
async function testCustomerUrlSubmission() {
    console.log('\n🔗 Testing Customer Resubmission with URL...\n');

    try {
        const response = await fetch(`${API_BASE}/verification/customer/resubmit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CUSTOMER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                valid_id_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                profile_photo_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Customer URL submission successful!');
            console.log('Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Customer URL submission failed!');
            console.log('Status:', response.status);
            console.log('Error:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.log('❌ Error testing customer URL submission:', error.message);
    }
}

/**
 * Test Provider Resubmission with File Upload
 */
async function testProviderFileUpload() {
    console.log('\n📤 Testing Provider Resubmission with File Upload...\n');

    try {
        const formData = new FormData();

        const testImagePath = path.join(process.cwd(), 'test-image.jpg');
        
        if (!fs.existsSync(testImagePath)) {
            console.log('⚠️  No test image found. Skipping file upload test.');
            console.log('   Create a test-image.jpg in the root directory to test file uploads.\n');
            return;
        }

        formData.append('valid_id', fs.createReadStream(testImagePath));
        formData.append('profile_photo', fs.createReadStream(testImagePath));
        formData.append('certificates', fs.createReadStream(testImagePath));

        const response = await fetch(`${API_BASE}/verification/provider/resubmit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PROVIDER_TOKEN}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Provider file upload successful!');
            console.log('Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Provider file upload failed!');
            console.log('Status:', response.status);
            console.log('Error:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.log('❌ Error testing provider file upload:', error.message);
    }
}

/**
 * Test Provider Resubmission with URL
 */
async function testProviderUrlSubmission() {
    console.log('\n🔗 Testing Provider Resubmission with URL...\n');

    try {
        const response = await fetch(`${API_BASE}/verification/provider/resubmit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PROVIDER_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                valid_id_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                profile_photo_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                certificate_urls: [
                    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                    'https://res.cloudinary.com/demo/image/upload/sample.jpg'
                ]
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Provider URL submission successful!');
            console.log('Response:', JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Provider URL submission failed!');
            console.log('Status:', response.status);
            console.log('Error:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.log('❌ Error testing provider URL submission:', error.message);
    }
}

/**
 * Test Endpoint Availability
 */
async function testEndpointAvailability() {
    console.log('\n🔍 Checking endpoint availability...\n');

    try {
        // Test with invalid token to see if endpoint exists
        const response = await fetch(`${API_BASE}/verification/customer/resubmit`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer invalid_token_for_testing'
            }
        });

        if (response.status === 401) {
            console.log('✅ Customer resubmission endpoint is available (returned 401 as expected for invalid token)');
        } else {
            console.log(`⚠️  Customer resubmission endpoint returned status: ${response.status}`);
        }

        const response2 = await fetch(`${API_BASE}/verification/provider/resubmit`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer invalid_token_for_testing'
            }
        });

        if (response2.status === 401) {
            console.log('✅ Provider resubmission endpoint is available (returned 401 as expected for invalid token)');
        } else {
            console.log(`⚠️  Provider resubmission endpoint returned status: ${response2.status}`);
        }
    } catch (error) {
        console.log('❌ Error checking endpoint availability:', error.message);
    }
}

// Run tests
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  Verification Resubmission with Multer - Test Suite         ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

(async () => {
    await testEndpointAvailability();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  NOTE: To test with actual uploads, you need:');
    console.log('   1. Valid customer/provider JWT tokens');
    console.log('   2. A test-image.jpg file in the root directory');
    console.log('   3. Update CUSTOMER_TOKEN and PROVIDER_TOKEN in this script');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Uncomment these when you have valid tokens and test images:
    // await testCustomerFileUpload();
    // await testCustomerUrlSubmission();
    // await testProviderFileUpload();
    // await testProviderUrlSubmission();

    console.log('\n✅ Basic endpoint availability test completed!\n');
})();
