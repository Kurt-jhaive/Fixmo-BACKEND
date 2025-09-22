import fetch from 'node-fetch';

async function testProviderRatings() {
    try {
        // You'll need to replace this with a valid JWT token for a provider
        const token = 'your-provider-jwt-token-here';
        const providerId = 1; // Replace with actual provider ID

        console.log(`Testing GET /api/ratings/provider/${providerId}`);

        const response = await fetch(`http://localhost:3000/api/ratings/provider/${providerId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.text();
        console.log('Response status:', response.status);
        console.log('Response:', result);

        if (response.ok) {
            const data = JSON.parse(result);
            console.log('\n✅ Provider ratings retrieved successfully!');
            console.log('Total ratings:', data.data.pagination.total_ratings);
            console.log('Average rating:', data.data.statistics.average_rating);
            console.log('Rating distribution:', data.data.statistics.rating_distribution);
        } else {
            console.log('\n❌ Failed to get provider ratings');
        }

    } catch (error) {
        console.error('Error testing provider ratings:', error);
    }
}

// Test with query parameters
async function testProviderRatingsWithPagination() {
    try {
        const token = 'your-provider-jwt-token-here';
        const providerId = 1;

        console.log(`\nTesting GET /api/ratings/provider/${providerId}?page=1&limit=5`);

        const response = await fetch(`http://localhost:3000/api/ratings/provider/${providerId}?page=1&limit=5`, {
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
            console.log('✅ Pagination test successful!');
            console.log('Current page:', data.data.pagination.current_page);
            console.log('Ratings on this page:', data.data.ratings.length);
        } else {
            console.log('❌ Pagination test failed');
            console.log('Response:', result);
        }

    } catch (error) {
        console.error('Error testing provider ratings with pagination:', error);
    }
}

console.log('🧪 Provider Ratings Endpoint Test');
console.log('=====================================');
console.log('\n⚠️  Please update the token and providerId variables in this script before running.');

// Uncomment the lines below after updating the token and providerId
// testProviderRatings();
// setTimeout(() => {
//     testProviderRatingsWithPagination();
// }, 1000);