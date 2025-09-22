import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';

async function testProviderRegistration() {
    try {
        const formData = new FormData();
        
        // Add required fields
        formData.append('provider_first_name', 'Test');
        formData.append('provider_last_name', 'Provider');
        formData.append('provider_email', 'testprovider@example.com');
        formData.append('provider_password', 'password123');
        formData.append('provider_userName', 'testprovider123');
        formData.append('provider_phone_number', '+639123456789');
        formData.append('provider_birthday', '1990-01-01');
        formData.append('provider_location', 'Manila, Philippines');
        formData.append('provider_exact_location', 'Makati City');
        formData.append('provider_uli', 'ULI123456789');
        formData.append('otp', '123456'); // Dummy OTP for testing
        
        // Add professions and experiences as JSON strings
        const professions = ['Plumber', 'Electrician'];
        const experiences = ['5 years experience', '3 years experience'];
        
        formData.append('professions', JSON.stringify(professions));
        formData.append('experiences', JSON.stringify(experiences));
        
        // Create dummy image buffers for testing
        const imageBuffer = Buffer.from('fake-image-data');
        formData.append('provider_profile_photo', imageBuffer, {
            filename: 'profile.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('provider_valid_id', imageBuffer, {
            filename: 'id.jpg',
            contentType: 'image/jpeg'
        });

        console.log('Sending provider registration request...');
        console.log('Professions:', professions);
        console.log('Experiences:', experiences);

        const response = await fetch('http://localhost:3000/auth/provider-verify-register', {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        const result = await response.text();
        console.log('Response status:', response.status);
        console.log('Response:', result);

        if (response.ok) {
            const data = JSON.parse(result);
            console.log('\n✅ Registration successful!');
            console.log('Provider ID:', data.providerId);
            console.log('Professions created:', data.professions);
            console.log('Number of professions:', data.professions?.length || 0);
        } else {
            console.log('\n❌ Registration failed');
        }

    } catch (error) {
        console.error('Error testing provider registration:', error);
    }
}

testProviderRegistration();