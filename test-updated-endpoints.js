import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

// Test provider credentials (update these with real credentials)
const testProvider = {
    provider_email: 'saldikurtjhaive@gmail.com',
    provider_password: '12345678'
};

// Create a test image buffer for testing
const createTestImageBuffer = () => {
    // Create a minimal PNG image buffer (1x1 pixel)
    const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
        0x08, 0x02, // Bit depth: 8, Color type: 2 (RGB)
        0x00, 0x00, 0x00, // Compression, filter, interlace
        0x90, 0x77, 0x53, 0xDE, // CRC
        0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, // Image data
        0x02, 0x00, 0x01, // End
        0xE2, 0x21, 0xBC, 0x33, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    return pngBuffer;
};

async function testProviderRegistrationWithProfessions() {
    try {
        console.log('🧪 Testing Provider Registration with Professions...\n');
        
        // Step 1: Request OTP
        console.log('1. Requesting OTP for provider registration...');
        const otpResponse = await fetch(`${BASE_URL}/api/service-providers/request-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider_email: 'newprovider@test.com'
            })
        });
        
        const otpResult = await otpResponse.json();
        console.log('OTP request response:', otpResponse.status, otpResult);
        
        if (!otpResponse.ok) {
            console.log('⚠️ OTP request failed, this may be expected if provider already exists');
        }
        
        // Step 2: Register provider with professions
        console.log('\\n2. Registering provider with professions...');
        
        const formData = new FormData();
        formData.append('provider_first_name', 'John');
        formData.append('provider_last_name', 'Doe');
        formData.append('provider_email', 'newprovider@test.com');
        formData.append('provider_password', 'password123');
        formData.append('provider_userName', 'johndoe_test');
        formData.append('provider_phone_number', '1234567890');
        formData.append('provider_location', 'Test City');
        formData.append('provider_uli', 'ULI123456');
        formData.append('otp', '123456'); // Using dummy OTP
        
        // Add professions and experiences
        formData.append('professions', JSON.stringify(['Electrician', 'Plumber']));
        formData.append('experiences', JSON.stringify(['5 years', '3 years']));
        
        // Add test images
        formData.append('provider_profile_photo', createTestImageBuffer(), 'profile.png');
        formData.append('provider_valid_id', createTestImageBuffer(), 'id.png');
        
        const registerResponse = await fetch(`${BASE_URL}/api/service-providers/verify-otp-and-register`, {
            method: 'POST',
            body: formData
        });
        
        const registerResult = await registerResponse.json();
        console.log('Registration response:', registerResponse.status, registerResult);
        
        if (registerResponse.ok) {
            console.log('✅ Provider registration with professions successful!');
        } else {
            console.log('❌ Provider registration failed:', registerResult.message);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

async function testMultiplePhotoServiceListing() {
    try {
        console.log('\\n\\n🧪 Testing Service Listing with Multiple Photos..\\n');
        
        // First, login as provider to get JWT token
        console.log('1. Logging in as provider...');
        const loginResponse = await fetch(`${BASE_URL}/api/service-providers/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testProvider)
        });
        
        const loginResult = await loginResponse.json();
        console.log('Login response:', loginResponse.status, loginResult);
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed. Please check provider credentials.');
            return;
        }
        
        const token = loginResult.token;
        console.log('✅ Login successful');
        
        // Step 2: Get provider certificates
        console.log('\\n2. Getting provider certificates...');
        const certsResponse = await fetch(`${BASE_URL}/api/provider/certificates`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const certsResult = await certsResponse.json();
        console.log('Certificates response:', certsResponse.status, certsResult);
        
        if (!certsResponse.ok || !certsResult.data || certsResult.data.length === 0) {
            console.log('⚠️ No certificates found. Please add certificates first.');
            return;
        }
        
        const certificateId = certsResult.data[0].certificate_id;
        console.log('Using certificate ID:', certificateId);
        
        // Step 3: Create service listing with multiple photos
        console.log('\\n3. Creating service listing with multiple photos...');
        
        const serviceFormData = new FormData();
        serviceFormData.append('certificate_id', certificateId.toString());
        serviceFormData.append('service_title', 'Test Service with Multiple Photos');
        serviceFormData.append('service_description', 'This is a test service with multiple photos');
        serviceFormData.append('service_startingprice', '100.00');
        
        // Add multiple test photos (max 5)
        for (let i = 0; i < 3; i++) {
            serviceFormData.append('service_photos', createTestImageBuffer(), `photo${i + 1}.png`);
        }
        
        const serviceResponse = await fetch(`${BASE_URL}/api/provider/services`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: serviceFormData
        });
        
        const serviceResult = await serviceResponse.json();
        console.log('Service creation response:', serviceResponse.status, serviceResult);
        
        if (serviceResponse.ok) {
            console.log('✅ Service listing with multiple photos created successfully!');
            console.log('Service ID:', serviceResult.data.service_id);
            console.log('Photos count:', serviceResult.data.service_photos?.length || 0);
        } else {
            console.log('❌ Service creation failed:', serviceResult.message);
        }
        
        // Step 4: Retrieve service listings to verify photos
        console.log('\\n4. Retrieving service listings...');
        const servicesResponse = await fetch(`${BASE_URL}/api/provider/services`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const servicesResult = await servicesResponse.json();
        console.log('Services retrieval response:', servicesResponse.status);
        
        if (servicesResponse.ok && servicesResult.data) {
            console.log('✅ Service listings retrieved successfully!');
            console.log('Total services:', servicesResult.count);
            
            // Show photo information for each service
            servicesResult.data.forEach((service, index) => {
                console.log(`Service ${index + 1}: ${service.service_title}`);
                console.log(`  Photos: ${service.service_photos?.length || 0}`);
                if (service.service_photos && service.service_photos.length > 0) {
                    service.service_photos.forEach((photo, photoIndex) => {
                        console.log(`    Photo ${photoIndex + 1}: ${photo.imageUrl}`);
                    });
                }
            });
        } else {
            console.log('❌ Service retrieval failed:', servicesResult.message);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

async function testCustomerServiceListingsWithPhotos() {
    try {
        console.log('\\n\\n🧪 Testing Customer Service Listings with Photos..\\n');
        
        const response = await fetch(`${BASE_URL}/auth/service-listings?page=1&limit=5`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        console.log('Customer service listings response:', response.status);
        
        if (response.ok && result.listings) {
            console.log('✅ Customer service listings retrieved successfully!');
            console.log('Total listings:', result.listings.length);
            
            // Show photo information for each listing
            result.listings.forEach((listing, index) => {
                console.log(`Listing ${index + 1}: ${listing.title}`);
                console.log(`  Provider: ${listing.provider.name}`);
                console.log(`  Photos: ${listing.service_photos?.length || 0}`);
                if (listing.service_photos && listing.service_photos.length > 0) {
                    listing.service_photos.forEach((photo, photoIndex) => {
                        console.log(`    Photo ${photoIndex + 1}: ${photo.imageUrl}`);
                    });
                }
            });
        } else {
            console.log('❌ Customer service listings failed:', result.message);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Comprehensive Tests for Updated Endpoints\\n');
    console.log('================================================\\n');
    
    // Test 1: Provider registration with professions
    await testProviderRegistrationWithProfessions();
    
    // Test 2: Service listing with multiple photos
    await testMultiplePhotoServiceListing();
    
    // Test 3: Customer service listings with photos
    await testCustomerServiceListingsWithPhotos();
    
    console.log('\\n\\n🏁 All tests completed!');
}

// Run the tests
runAllTests();