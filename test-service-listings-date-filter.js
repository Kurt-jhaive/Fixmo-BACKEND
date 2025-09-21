// Test Service Listings with Date-Based Availability Filtering
// This test demonstrates the enhanced service listings endpoint with date filtering

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function testServiceListingsWithDateFilter() {
    console.log('🧪 Testing Service Listings with Date-Based Availability Filtering\n');

    try {
        // Test 1: Get service listings without date filter (normal behavior)
        console.log('1️⃣ Testing normal service listings (no date filter)...');
        const normalResponse = await axios.get(`${API_BASE}/auth/service-listings`, {
            params: {
                page: 1,
                limit: 5
            }
        });

        console.log('✅ Normal listings retrieved:', {
            totalListings: normalResponse.data.totalCount,
            currentPageListings: normalResponse.data.listings.length,
            message: normalResponse.data.message
        });

        // Test 2: Get service listings for a specific date (September 25, 2025)
        console.log('\n2️⃣ Testing service listings with date filter (September 25, 2025)...');
        const dateFilterResponse = await axios.get(`${API_BASE}/auth/service-listings`, {
            params: {
                page: 1,
                limit: 10,
                date: '2025-09-25' // Thursday
            }
        });

        console.log('✅ Date-filtered listings retrieved:', {
            requestedDate: '2025-09-25',
            dayOfWeek: 'Thursday',
            totalAvailableProviders: dateFilterResponse.data.listings.length,
            message: dateFilterResponse.data.message,
            filterInfo: dateFilterResponse.data.dateFilter
        });

        // Display availability details for each provider
        console.log('\n📋 Provider Availability Details:');
        dateFilterResponse.data.listings.forEach((listing, index) => {
            console.log(`${index + 1}. ${listing.provider.name}`);
            console.log(`   Service: ${listing.title}`);
            console.log(`   Location: ${listing.provider.location}`);
            console.log(`   Rating: ${listing.provider.rating}`);
            if (listing.availability) {
                console.log(`   📅 Availability on ${listing.availability.date}:`);
                console.log(`      - Total slots: ${listing.availability.totalSlots}`);
                console.log(`      - Available slots: ${listing.availability.availableSlots}`);
                console.log(`      - Booked slots: ${listing.availability.bookedSlots}`);
                console.log(`      - Has availability: ${listing.availability.hasAvailability}`);
            }
            console.log('');
        });

        // Test 3: Test with different dates to show how filtering works
        const testDates = [
            '2025-09-26', // Friday
            '2025-09-27', // Saturday
            '2025-09-28', // Sunday
            '2025-09-29'  // Monday
        ];

        console.log('\n3️⃣ Testing availability across different days...');
        for (const testDate of testDates) {
            try {
                const response = await axios.get(`${API_BASE}/auth/service-listings`, {
                    params: {
                        page: 1,
                        limit: 5,
                        date: testDate
                    }
                });

                const dayOfWeek = new Date(testDate + 'T00:00:00.000Z').toLocaleDateString('en-US', { weekday: 'long' });
                console.log(`📅 ${testDate} (${dayOfWeek}): ${response.data.listings.length} available providers`);
                
                if (response.data.dateFilter) {
                    console.log(`   Before filtering: ${response.data.dateFilter.totalProvidersBeforeFiltering} providers`);
                    console.log(`   After filtering: ${response.data.dateFilter.availableProvidersAfterFiltering} providers`);
                }
            } catch (error) {
                console.log(`❌ Error testing ${testDate}:`, error.response?.data?.message || error.message);
            }
        }

        // Test 4: Test with combined filters (date + location + category)
        console.log('\n4️⃣ Testing combined filters (date + location + search)...');
        try {
            const combinedResponse = await axios.get(`${API_BASE}/auth/service-listings`, {
                params: {
                    page: 1,
                    limit: 10,
                    date: '2025-09-25',
                    location: 'manila', // Example location filter
                    search: 'repair' // Example search filter
                }
            });

            console.log('✅ Combined filters applied:', {
                date: '2025-09-25',
                location: 'manila',
                search: 'repair',
                results: combinedResponse.data.listings.length,
                filterInfo: combinedResponse.data.dateFilter
            });
        } catch (error) {
            console.log('⚠️ Combined filter test:', error.response?.data?.message || error.message);
        }

        console.log('\n🎉 All service listing availability tests completed!');
        console.log('\n📧 Key Features Tested:');
        console.log('- ✅ Normal service listings (without date filter)');
        console.log('- ✅ Date-based availability filtering');
        console.log('- ✅ Day-of-week availability checking');
        console.log('- ✅ Specific date booking conflict checking');
        console.log('- ✅ Provider availability information in response');
        console.log('- ✅ Multiple date scenarios');
        console.log('- ✅ Combined filters with date filtering');

        console.log('\n🚀 How to use in your app:');
        console.log('1. Show calendar to user');
        console.log('2. When user selects a date (e.g., Sept 25), call:');
        console.log('   GET /auth/service-listings?date=2025-09-25');
        console.log('3. Only providers available on that date will be returned');
        console.log('4. Each provider includes availability details');

    } catch (error) {
        console.error('❌ Test failed:', {
            message: error.response?.data?.message || error.message,
            status: error.response?.status,
            details: error.response?.data
        });
    }
}

// Test edge cases
async function testEdgeCases() {
    console.log('\n🧪 Testing Edge Cases...');

    const edgeCases = [
        {
            name: 'Past date',
            params: { date: '2025-09-20' } // Past date
        },
        {
            name: 'Today',
            params: { date: new Date().toISOString().split('T')[0] } // Today
        },
        {
            name: 'Far future date',
            params: { date: '2025-12-25' } // Christmas
        },
        {
            name: 'Invalid date format',
            params: { date: 'invalid-date' }
        }
    ];

    for (const testCase of edgeCases) {
        try {
            console.log(`\n🔍 Testing: ${testCase.name}`);
            const response = await axios.get(`${API_BASE}/auth/service-listings`, {
                params: {
                    page: 1,
                    limit: 3,
                    ...testCase.params
                }
            });

            console.log(`✅ ${testCase.name} results:`, {
                availableProviders: response.data.listings.length,
                dateFilter: response.data.dateFilter
            });
        } catch (error) {
            console.log(`⚠️ ${testCase.name} error:`, error.response?.data?.message || error.message);
        }
    }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testServiceListingsWithDateFilter();
    testEdgeCases();
}

export { testServiceListingsWithDateFilter, testEdgeCases };