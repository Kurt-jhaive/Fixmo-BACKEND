// Quick test for the new service listings endpoint
async function testServiceListings() {
    try {
        const response = await fetch('http://localhost:3000/api/serviceProvider/service-listings?page=1&limit=10', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Service listings endpoint working!');
            console.log('📊 Results:', data.pagination);
            console.log('🎯 Found', data.data.length, 'service listings');
            
            if (data.data.length > 0) {
                console.log('📋 First service:', {
                    service_id: data.data[0].service_id,
                    service_title: data.data[0].service_title,
                    service_startingprice: data.data[0].service_startingprice,
                    provider_name: data.data[0].provider.provider_name,
                    servicelisting_isActive: data.data[0].servicelisting_isActive
                });
            }
        } else {
            console.error('❌ Error:', response.status, response.statusText);
            const errorData = await response.text();
            console.error('Error details:', errorData);
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testServiceListings();
