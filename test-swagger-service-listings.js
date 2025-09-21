// Test Swagger Documentation for Service Listings Date Filter
// This test verifies that the Swagger documentation is properly configured

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function testSwaggerDocumentation() {
    console.log('🧪 Testing Swagger Documentation for Enhanced Service Listings\n');

    try {
        // Test 1: Check if Swagger JSON is accessible
        console.log('1️⃣ Checking Swagger JSON endpoint...');
        const swaggerResponse = await axios.get(`${API_BASE}/api-docs.json`);
        
        console.log('✅ Swagger JSON accessible');
        console.log('API Title:', swaggerResponse.data.info.title);
        console.log('API Version:', swaggerResponse.data.info.version);

        // Test 2: Check if the new Customer Services tag exists
        console.log('\n2️⃣ Checking Customer Services tag...');
        const tags = swaggerResponse.data.tags || [];
        const customerServicesTag = tags.find(tag => tag.name === 'Customer Services');
        
        if (customerServicesTag) {
            console.log('✅ Customer Services tag found:', customerServicesTag.description);
        } else {
            console.log('❌ Customer Services tag not found in tags array');
        }

        // Test 3: Check if the service listings endpoint is documented
        console.log('\n3️⃣ Checking service listings endpoint documentation...');
        const paths = swaggerResponse.data.paths || {};
        const serviceListingsPath = paths['/auth/service-listings'];
        
        if (serviceListingsPath) {
            console.log('✅ Service listings endpoint documented');
            
            // Check if GET method exists
            if (serviceListingsPath.get) {
                console.log('✅ GET method documented');
                console.log('Summary:', serviceListingsPath.get.summary);
                
                // Check for date parameter
                const parameters = serviceListingsPath.get.parameters || [];
                const dateParam = parameters.find(param => param.name === 'date');
                
                if (dateParam) {
                    console.log('✅ Date parameter documented:', dateParam.description);
                } else {
                    console.log('❌ Date parameter not found in documentation');
                }
                
                // Check for responses
                const responses = serviceListingsPath.get.responses || {};
                if (responses['200']) {
                    console.log('✅ Success response (200) documented');
                    
                    // Check if response includes dateFilter and availability properties
                    const responseSchema = responses['200'].content?.['application/json']?.schema;
                    if (responseSchema?.properties?.dateFilter) {
                        console.log('✅ dateFilter property documented in response');
                    }
                    
                    const listingsItems = responseSchema?.properties?.listings?.items;
                    if (listingsItems?.properties?.availability) {
                        console.log('✅ availability property documented in listings items');
                    }
                } else {
                    console.log('❌ Success response (200) not documented');
                }
            } else {
                console.log('❌ GET method not documented');
            }
        } else {
            console.log('❌ Service listings endpoint not found in documentation');
        }

        // Test 4: Check if new features are mentioned in the description
        console.log('\n4️⃣ Checking API description for new features...');
        const description = swaggerResponse.data.info.description || '';
        
        if (description.includes('Date-Based Provider Filtering')) {
            console.log('✅ Date-based filtering feature mentioned in API description');
        } else {
            console.log('❌ Date-based filtering feature not mentioned in API description');
        }

        // Test 5: Check if Swagger UI is accessible
        console.log('\n5️⃣ Testing Swagger UI accessibility...');
        try {
            const swaggerUIResponse = await axios.get(`${API_BASE}/api-docs`);
            if (swaggerUIResponse.status === 200) {
                console.log('✅ Swagger UI accessible at /api-docs');
            }
        } catch (uiError) {
            console.log('⚠️ Swagger UI test failed:', uiError.message);
        }

        console.log('\n🎉 Swagger documentation tests completed!');
        console.log('\n📚 How to test in Swagger UI:');
        console.log('1. Open http://localhost:3000/api-docs in your browser');
        console.log('2. Look for "Customer Services" section');
        console.log('3. Find "Get service listings with optional date-based availability filtering"');
        console.log('4. Try the endpoint with and without the date parameter');
        console.log('5. Observe the different response formats');

        console.log('\n📋 Expected Parameters:');
        console.log('- page (integer): Page number');
        console.log('- limit (integer): Results per page');
        console.log('- search (string): Search term');
        console.log('- category (string): Service category');
        console.log('- location (string): Provider location');
        console.log('- sortBy (string): Sort order');
        console.log('- date (string): 🆕 Date filter (YYYY-MM-DD)');

    } catch (error) {
        console.error('❌ Swagger documentation test failed:', {
            message: error.response?.data?.message || error.message,
            status: error.response?.status,
            url: error.config?.url
        });
    }
}

// Test specific API endpoint documentation
async function testEndpointExample() {
    console.log('\n🧪 Testing Example API Calls from Swagger Documentation\n');

    const exampleCalls = [
        {
            name: 'Normal service listings',
            url: '/auth/service-listings?page=1&limit=5'
        },
        {
            name: 'Service listings with date filter',
            url: '/auth/service-listings?date=2025-09-25&page=1&limit=5'
        },
        {
            name: 'Combined filters with date',
            url: '/auth/service-listings?date=2025-09-25&search=repair&location=manila&page=1&limit=5'
        }
    ];

    for (const call of exampleCalls) {
        try {
            console.log(`📞 Testing: ${call.name}`);
            console.log(`   URL: ${call.url}`);
            
            const response = await axios.get(`${API_BASE}${call.url}`);
            
            console.log(`   ✅ Status: ${response.status}`);
            console.log(`   📊 Results: ${response.data.listings?.length || 0} listings`);
            
            if (response.data.dateFilter) {
                console.log(`   🗓️ Date filter applied: ${response.data.dateFilter.requestedDate}`);
                console.log(`   📈 Before filtering: ${response.data.dateFilter.totalProvidersBeforeFiltering}`);
                console.log(`   📉 After filtering: ${response.data.dateFilter.availableProvidersAfterFiltering}`);
            }
            
            console.log('');
        } catch (error) {
            console.log(`   ❌ Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
            console.log('');
        }
    }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testSwaggerDocumentation();
    testEndpointExample();
}

export { testSwaggerDocumentation, testEndpointExample };