import FormData from 'form-data';
import fetch from 'node-fetch';

async function testProviderRegistrationWithProfessions() {
    try {
        console.log('🧪 Testing Provider Registration with Professions');
        console.log('================================================');
        
        const formData = new FormData();
        
        // Generate unique data to avoid conflicts
        const timestamp = Date.now();
        const uniqueEmail = `testprovider@example.com`;
        const uniqueUserName = `testprovider${timestamp}`;
        const uniquePhone = `+6391234${timestamp.toString().slice(-5)}`;
        const uniqueULI = `ULI${timestamp}`;
        
        // Add required fields
        formData.append('provider_first_name', 'Test');
        formData.append('provider_last_name', 'Provider');
        formData.append('provider_email', uniqueEmail);
        formData.append('provider_password', 'password123');
        formData.append('provider_userName', uniqueUserName);
        formData.append('provider_phone_number', uniquePhone);
        formData.append('provider_birthday', '1990-01-01');
        formData.append('provider_location', 'Manila, Philippines');
        formData.append('provider_exact_location', 'Makati City');
        formData.append('provider_uli', uniqueULI);
        formData.append('otp', '988212'); // Dummy OTP for testing
        
        // Add professions and experiences as JSON strings
        const professions = ['Electrician', 'Plumber', 'Carpenter'];
        const experiences = ['5 years electrical work', '3 years plumbing', '2 years carpentry'];
        
        console.log('Sending professions:', professions);
        console.log('Sending experiences:', experiences);
        
        formData.append('professions', JSON.stringify(professions));
        formData.append('experiences', JSON.stringify(experiences));
        
        // Create dummy image buffers for testing
        const imageBuffer = Buffer.from('fake-image-data-for-testing');
        formData.append('provider_profile_photo', imageBuffer, {
            filename: 'profile.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('provider_valid_id', imageBuffer, {
            filename: 'id.jpg',
            contentType: 'image/jpeg'
        });

        console.log('\n📤 Sending registration request...');

        const response = await fetch('http://localhost:3000/auth/provider-verify-register', {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        const result = await response.text();
        console.log('\n📥 Response received');
        console.log('Status:', response.status);
        console.log('Response:', result);

        if (response.ok) {
            const data = JSON.parse(result);
            console.log('\n✅ Registration successful!');
            console.log('Provider ID:', data.providerId);
            console.log('Professions created:', data.professions?.length || 0);
            
            if (data.professions && data.professions.length > 0) {
                console.log('📋 Professions details:');
                data.professions.forEach((prof, index) => {
                    console.log(`  ${index + 1}. ${prof.profession} - ${prof.experience}`);
                });
            } else {
                console.log('⚠️  No professions were created!');
            }
        } else {
            console.log('\n❌ Registration failed');
            try {
                const errorData = JSON.parse(result);
                console.log('Error message:', errorData.message);
            } catch (e) {
                console.log('Raw error:', result);
            }
        }

    } catch (error) {
        console.error('❌ Error testing provider registration:', error);
    }
}

// Check if server is running first
async function checkServerStatus() {
    try {
        // Try the actual registration endpoint with a simple GET to see if it responds
        const response = await fetch('http://localhost:3000/auth/provider-verify-register', {
            method: 'GET'
        });
        return true; // If we get any response, server is running
    } catch (error) {
        return false;
    }
}

async function runTest() {
    console.log('🚀 Starting provider registration test...');
    await testProviderRegistrationWithProfessions();
}

runTest();