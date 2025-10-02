// Test script for the new service listings by title endpoint
const testServiceTitle = async () => {
    try {
        // Test with a service title - replace with actual service title from your database
        const testTitle = "Network Setup"; // Change this to an actual service title in your database
        
        console.log(`Testing service lookup for title: "${testTitle}"`);
        console.log('---------------------------------------------------');
        
        const response = await fetch(`http://localhost:3000/api/serviceProvider/services/by-title?title=${encodeURIComponent(testTitle)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ Response Status:', response.status);
        console.log('✅ Success:', data.success);
        console.log('✅ Message:', data.message);
        console.log('✅ Count:', data.count);
        console.log('✅ Search Title:', data.search_title);
        
        if (data.data && data.data.length > 0) {
            console.log('\n📋 Found Services:');
            data.data.forEach((service, index) => {
                console.log(`\n${index + 1}. Service ID: ${service.service_id}`);
                console.log(`   Title: ${service.service_title}`);
                console.log(`   Price: $${service.service_startingprice}`);
                console.log(`   Provider: ${service.provider.provider_name}`);
                console.log(`   Location: ${service.provider.provider_location}`);
                console.log(`   Rating: ${service.provider.provider_rating}/5`);
                console.log(`   Verified: ${service.provider.provider_isVerified ? 'Yes' : 'No'}`);
                if (service.categories.length > 0) {
                    console.log(`   Categories: ${service.categories.map(cat => cat.category_name).join(', ')}`);
                }
            });
        } else {
            console.log('\n❌ No services found for this title');
        }
        
        console.log('\n---------------------------------------------------');
        console.log('Full Response Data:');
        console.log(JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('❌ Error testing endpoint:', error.message);
    }
};

// Test missing title parameter
const testMissingTitle = async () => {
    try {
        console.log('\n\nTesting missing title parameter...');
        console.log('---------------------------------------------------');
        
        const response = await fetch('http://localhost:3000/api/serviceProvider/services/by-title');
        const data = await response.json();
        
        console.log('Response Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Error testing missing title:', error.message);
    }
};

// Test empty title
const testEmptyTitle = async () => {
    try {
        console.log('\n\nTesting empty title parameter...');
        console.log('---------------------------------------------------');
        
        const response = await fetch('http://localhost:3000/api/serviceProvider/services/by-title?title=');
        const data = await response.json();
        
        console.log('Response Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Error testing empty title:', error.message);
    }
};

// Run all tests
const runAllTests = async () => {
    console.log('🧪 Starting Service By Title Endpoint Tests');
    console.log('=================================================');
    
    await testServiceTitle();
    await testMissingTitle();
    await testEmptyTitle();
    
    console.log('\n🏁 All tests completed!');
};

// Run the tests
runAllTests();
