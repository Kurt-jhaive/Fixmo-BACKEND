import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test customer credentials (make sure these exist in your database)
const testCustomer = {
    email: 'saldikurtjhaive@gmail.com',
    password: '12345678'
};

async function testCompleteRatingFlow() {
    try {
        console.log('🧪 Testing Complete Rating Creation Flow...\n');
        
        // Step 1: Login as customer to get JWT token
        console.log('1. Logging in as customer...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCustomer)
        });
        
        const loginResult = await loginResponse.json();
        console.log('Login response:', loginResponse.status, loginResult);
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed. Please check if test customer exists in database.');
            console.log('You may need to register this customer first.');
            return;
        }
        
        const token = loginResult.token;
        const customerId = loginResult.userId;
        console.log('✅ Login successful. Customer ID:', customerId);
        console.log('');
        
        // Step 2: Get rateable appointments
        console.log('2. Getting rateable appointments...');
        const rateableResponse = await fetch(`${BASE_URL}/api/ratings/rateable-appointments`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const rateableResult = await rateableResponse.json();
        console.log('Rateable appointments response:', rateableResponse.status, rateableResult);
        console.log('');
        
        if (!rateableResponse.ok || !rateableResult.data || rateableResult.data.length === 0) {
            console.log('⚠️ No rateable appointments found. Creating a test rating with sample data...');
        }
        
        // Step 3: Create a rating
        console.log('3. Creating a rating...');
        const ratingData = {
            appointment_id: 1, // Use first available appointment or test data
            provider_id: 1,    // Test provider ID
            rating_value: 5,
            rating_comment: 'Great service! Very professional and timely.'
        };
        
        const ratingResponse = await fetch(`${BASE_URL}/api/ratings/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ratingData)
        });
        
        const ratingResult = await ratingResponse.json();
        console.log('Rating creation response:', ratingResponse.status, ratingResult);
        
        if (ratingResponse.ok) {
            console.log('✅ Rating created successfully!');
        } else {
            console.log('❌ Rating creation failed:', ratingResult.message);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testCompleteRatingFlow();