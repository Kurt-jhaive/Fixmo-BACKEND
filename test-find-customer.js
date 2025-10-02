import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test customer data for registration
const testCustomer = {
    first_name: 'Test',
    last_name: 'Customer',
    email: 'customer@test.com',
    phone_number: '1234567890',
    password: 'password123',
    userName: 'testcustomer',
    birthday: '1990-01-01',
    user_location: 'Test City'
};

async function registerTestCustomer() {
    try {
        console.log('🧪 Registering Test Customer...\n');
        
        // Step 1: Request OTP
        console.log('1. Requesting OTP...');
        const otpResponse = await fetch(`${BASE_URL}/auth/request-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: testCustomer.email
            })
        });
        
        const otpResult = await otpResponse.json();
        console.log('OTP request response:', otpResponse.status, otpResult);
        
        if (!otpResponse.ok) {
            if (otpResult.message && otpResult.message.includes('already exists')) {
                console.log('✅ Customer already exists. Can proceed with login test.');
                return true;
            }
            console.log('❌ OTP request failed');
            return false;
        }
        
        console.log('✅ OTP sent successfully');
        console.log('⚠️ Manual step required: Check email for OTP and complete registration');
        console.log('Registration data to use:', JSON.stringify(testCustomer, null, 2));
        
        return false; // Manual completion required
        
    } catch (error) {
        console.error('Registration failed:', error);
        return false;
    }
}

// Alternative: Try to login with existing test credentials
async function tryExistingLogins() {
    console.log('\n🧪 Trying common test credentials...\n');
    
    const commonTestCredentials = [
        { email: 'test@test.com', password: 'password' },
        { email: 'customer@test.com', password: 'password' },
        { email: 'user@example.com', password: 'password123' },
        { email: 'john@example.com', password: 'password123' },
        { email: 'customer@example.com', password: 'password123' }
    ];
    
    for (const creds of commonTestCredentials) {
        console.log(`Trying ${creds.email}...`);
        
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(creds)
        });
        
        const loginResult = await loginResponse.json();
        
        if (loginResponse.ok) {
            console.log('✅ Found working credentials:', creds);
            console.log('Login result:', loginResult);
            return { token: loginResult.token, userId: loginResult.userId, credentials: creds };
        } else {
            console.log('❌ Failed:', loginResult.message);
        }
    }
    
    return null;
}

async function main() {
    // First try existing credentials
    const existingLogin = await tryExistingLogins();
    
    if (existingLogin) {
        console.log('\n🎉 Found working customer credentials!');
        console.log('Use these credentials in your rating test:', existingLogin.credentials);
        
        // Now test rating creation with this token
        console.log('\n🧪 Testing rating creation with found credentials...');
        
        const ratingData = {
            appointment_id: 1,
            provider_id: 1,
            rating_value: 5,
            rating_comment: 'Great service! Very professional and timely.'
        };
        
        const ratingResponse = await fetch(`${BASE_URL}/api/ratings/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${existingLogin.token}`
            },
            body: JSON.stringify(ratingData)
        });
        
        const ratingResult = await ratingResponse.json();
        console.log('Rating creation response:', ratingResponse.status, ratingResult);
        
        if (ratingResponse.ok) {
            console.log('✅ Rating created successfully with authentication fix!');
        } else {
            console.log('❌ Rating creation still failed:', ratingResult.message);
        }
        
    } else {
        console.log('\n⚠️ No existing customers found. Attempting registration...');
        await registerTestCustomer();
    }
}

main();