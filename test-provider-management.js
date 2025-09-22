import FormData from 'form-data';
import fetch from 'node-fetch';

// Test script for provider management endpoints
console.log('🧪 Provider Management Endpoints Test');
console.log('=======================================');

// Test 1: Get Provider Professions (Public endpoint)
async function testGetProviderProfessions() {
    try {
        const providerId = 1; // Update with actual provider ID
        
        console.log(`\n1. Testing GET /api/service-providers/professions/${providerId}`);
        
        const response = await fetch(`http://localhost:3000/api/service-providers/professions/${providerId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.text();
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = JSON.parse(result);
            console.log('✅ Provider professions retrieved successfully!');
            console.log('Provider name:', data.data.provider_name);
            console.log('Total professions:', data.data.total_professions);
            console.log('Professions:', data.data.professions.map(p => `${p.profession} (${p.experience})`));
        } else {
            console.log('❌ Failed to get provider professions');
            console.log('Response:', result);
        }

    } catch (error) {
        console.error('Error testing provider professions:', error);
    }
}

// Test 2: Get Provider Details (Authenticated endpoint)
async function testGetProviderDetails() {
    try {
        const token = 'your-provider-jwt-token-here'; // Update with actual token
        
        console.log(`\n2. Testing GET /api/service-providers/details`);
        
        const response = await fetch(`http://localhost:3000/api/service-providers/details`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.text();
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = JSON.parse(result);
            console.log('✅ Provider details retrieved successfully!');
            console.log('Provider name:', data.data.provider_full_name);
            console.log('Email:', data.data.provider_email);
            console.log('Rating:', data.data.provider_rating);
            console.log('Verified:', data.data.provider_isVerified);
            console.log('Total professions:', data.data.total_professions);
            console.log('Total certificates:', data.data.total_certificates);
            console.log('Total services:', data.data.total_services);
        } else {
            console.log('❌ Failed to get provider details');
            console.log('Response:', result);
        }

    } catch (error) {
        console.error('Error testing provider details:', error);
    }
}

// Test 3: Update Provider Details (Authenticated endpoint)
async function testUpdateProviderDetails() {
    try {
        const token = 'your-provider-jwt-token-here'; // Update with actual token
        
        console.log(`\n3. Testing PUT /api/service-providers/details`);
        
        const formData = new FormData();
        
        // Update basic information
        formData.append('provider_first_name', 'John Updated');
        formData.append('provider_last_name', 'Smith Updated');
        formData.append('provider_phone_number', '+639987654321');
        formData.append('provider_location', 'Quezon City, Philippines');
        formData.append('provider_exact_location', 'Diliman, Quezon City');
        
        // Update professions
        const professions = [
            {
                profession: "Master Electrician",
                experience: "10 years of electrical work experience"
            },
            {
                profession: "Certified Plumber",
                experience: "5 years of plumbing experience"
            },
            {
                profession: "HVAC Technician",
                experience: "3 years of HVAC maintenance experience"
            }
        ];
        formData.append('professions', JSON.stringify(professions));
        
        // Note: For file uploads, you would add actual file buffers here
        // formData.append('provider_profile_photo', fileBuffer, { filename: 'profile.jpg' });
        // formData.append('provider_valid_id', fileBuffer, { filename: 'id.jpg' });
        
        const response = await fetch(`http://localhost:3000/api/service-providers/details`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const result = await response.text();
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = JSON.parse(result);
            console.log('✅ Provider details updated successfully!');
            console.log('Updated name:', data.data.provider_full_name);
            console.log('Updated phone:', data.data.provider_phone_number);
            console.log('Updated location:', data.data.provider_location);
            console.log('Updated professions:', data.data.professions.length);
            data.data.professions.forEach((prof, index) => {
                console.log(`  ${index + 1}. ${prof.profession} - ${prof.experience}`);
            });
        } else {
            console.log('❌ Failed to update provider details');
            console.log('Response:', result);
        }

    } catch (error) {
        console.error('Error testing provider details update:', error);
    }
}

// Test 4: Test Error Handling (Non-existent provider)
async function testErrorHandling() {
    try {
        const nonExistentProviderId = 99999;
        
        console.log(`\n4. Testing Error Handling - Non-existent Provider ID: ${nonExistentProviderId}`);
        
        const response = await fetch(`http://localhost:3000/api/service-providers/professions/${nonExistentProviderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.text();
        console.log('Response status:', response.status);
        
        if (response.status === 404) {
            const data = JSON.parse(result);
            console.log('✅ Error handling works correctly!');
            console.log('Error message:', data.message);
        } else {
            console.log('❌ Unexpected response for non-existent provider');
            console.log('Response:', result);
        }

    } catch (error) {
        console.error('Error testing error handling:', error);
    }
}

// Main test execution
async function runAllTests() {
    console.log('\n⚠️  Please update the token and provider ID variables before running tests.\n');
    
    // Uncomment the lines below after updating the tokens and IDs
    // await testGetProviderProfessions();
    // await testGetProviderDetails();
    // await testUpdateProviderDetails();
    // await testErrorHandling();
    
    console.log('\n🏁 Test execution completed!');
    console.log('\nEndpoints Summary:');
    console.log('- GET /api/service-providers/professions/{providerId} - Get provider professions (Public)');
    console.log('- GET /api/service-providers/details - Get own provider details (Auth required)');
    console.log('- PUT /api/service-providers/details - Update own provider details (Auth required)');
}

runAllTests();