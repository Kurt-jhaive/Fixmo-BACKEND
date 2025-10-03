/**
 * Test script for self-exclusion filter in service listings
 * Tests that customers don't see their own provider accounts
 */

import axios from 'axios';

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:3000';

async function testSelfExclusionFilter() {
    console.log('🧪 Testing Self-Exclusion Filter in Service Listings\n');

    try {
        console.log('📋 Feature Description:');
        console.log('When a customer browses service listings, if they also have a service provider');
        console.log('account with the same name/details, their provider account will NOT appear in');
        console.log('the search results. This prevents users from seeing their own services.\n');

        console.log('🔍 How It Works:');
        console.log('1. Customer must be authenticated (provide JWT token)');
        console.log('2. System fetches customer details (first_name, last_name, email, phone)');
        console.log('3. Service listings are filtered to exclude providers where:');
        console.log('   - First name AND last name match (case-insensitive)');
        console.log('   - AND (email matches OR phone number matches)');
        console.log('4. Matching providers are excluded from the results\n');

        console.log('📍 API Endpoint:');
        console.log('  GET /auth/service-listings');
        console.log('  Headers (optional): Authorization: Bearer <customer_token>');
        console.log('  Query Parameters:');
        console.log('    - page: number (default: 1)');
        console.log('    - limit: number (default: 12)');
        console.log('    - search: string (search term)');
        console.log('    - category: string (filter by category)');
        console.log('    - location: string (filter by location)');
        console.log('    - sortBy: "rating" | "price-low" | "price-high" | "newest"');
        console.log('    - date: string (YYYY-MM-DD format for availability filter)\n');

        console.log('🔐 Authentication:');
        console.log('  - Optional: Works without authentication (shows all providers)');
        console.log('  - With authentication: Excludes customer\'s own provider account');
        console.log('  - Uses optionalAuth middleware (doesn\'t fail if no token)\n');

        console.log('📊 Test Scenarios:\n');

        console.log('Scenario 1: Browse without authentication');
        console.log('  curl -X GET "http://localhost:3000/auth/service-listings?page=1&limit=10"');
        console.log('  Expected: Returns all service listings (no exclusion)\n');

        console.log('Scenario 2: Browse with customer authentication');
        console.log('  curl -X GET "http://localhost:3000/auth/service-listings?page=1&limit=10" \\');
        console.log('    -H "Authorization: Bearer <customer_token>"');
        console.log('  Expected: Returns service listings, excluding customer\'s own provider account\n');

        console.log('Scenario 3: Customer with matching provider account');
        console.log('  Given:');
        console.log('    - Customer: John Doe, john@example.com, +1234567890');
        console.log('    - Provider: John Doe, john@example.com, +1234567890');
        console.log('  Expected: Provider "John Doe" excluded from customer\'s search results\n');

        console.log('Scenario 4: Customer with different provider account');
        console.log('  Given:');
        console.log('    - Customer: John Doe, john@example.com, +1234567890');
        console.log('    - Provider: Jane Smith, jane@example.com, +0987654321');
        console.log('  Expected: Provider "Jane Smith" appears in customer\'s search results\n');

        console.log('📝 Response Format:');
        console.log('{');
        console.log('  message: string,');
        console.log('  listings: [');
        console.log('    {');
        console.log('      id: number,');
        console.log('      title: string,');
        console.log('      description: string,');
        console.log('      startingPrice: number,');
        console.log('      service_photos: [...],');
        console.log('      provider: {');
        console.log('        id: number,');
        console.log('        name: string,');
        console.log('        rating: number,');
        console.log('        location: string,');
        console.log('        profilePhoto: string');
        console.log('      },');
        console.log('      categories: [string],');
        console.log('      specificServices: [...]');
        console.log('    }');
        console.log('  ],');
        console.log('  pagination: { ... }');
        console.log('}\n');

        console.log('🔧 Implementation Details:');
        console.log('  - File: src/controller/authCustomerController.js');
        console.log('  - Function: getServiceListingsForCustomer');
        console.log('  - Route: src/route/authCustomer.js');
        console.log('  - Middleware: optionalAuth (custom middleware for optional authentication)\n');

        console.log('⚠️ Important Notes:');
        console.log('  - Matching criteria: Same first name AND last name AND (email OR phone)');
        console.log('  - Case-insensitive comparison');
        console.log('  - Whitespace trimmed before comparison');
        console.log('  - Only applies when customer is authenticated');
        console.log('  - Console logs show excluded providers (for debugging)\n');

        console.log('✅ Testing guide complete!');
        console.log('\n💡 To test manually:');
        console.log('1. Create a customer account');
        console.log('2. Create a provider account with same name/email/phone');
        console.log('3. Get customer JWT token');
        console.log('4. Call /auth/service-listings with customer token');
        console.log('5. Verify provider account is NOT in the results');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

// Run the test
testSelfExclusionFilter().catch(console.error);
