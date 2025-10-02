import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testRatingCreation() {
    try {
        console.log('Testing rating creation...\n');
        
        // First, let's try to create a rating without authentication
        console.log('1. Testing without authentication:');
        const response1 = await fetch(`${BASE_URL}/api/ratings/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                appointment_id: 1,
                provider_id: 1,
                rating_value: 5,
                rating_comment: 'Great service! Very professional and timely.'
            })
        });
        
        const result1 = await response1.json();
        console.log('Response:', response1.status, result1);
        console.log('');
        
        // Now let's test with a sample JWT token (you'll need to replace this with actual token)
        console.log('2. Testing with Bearer token (you need to provide a valid token):');
        console.log('Please provide a valid JWT token to test authenticated request');
        
        // Test to get rateable appointments first to see what's available
        console.log('3. Testing rateable appointments endpoint:');
        const response3 = await fetch(`${BASE_URL}/api/ratings/rateable-appointments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result3 = await response3.json();
        console.log('Response:', response3.status, result3);
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testRatingCreation();