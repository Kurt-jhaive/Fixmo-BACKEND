// Test script to verify backjob endpoints are available
import fetch from 'node-fetch';

const baseUrl = 'http://127.0.0.1:3000/api';

async function testBackjobEndpoints() {
    console.log('🔍 Testing Backjob API Endpoints...\n');
    
    // Test endpoints that don't require authentication first (they should return 401)
    const endpoints = [
        { method: 'POST', path: '/appointments/123/backjob/apply', desc: 'Apply for backjob' },
        { method: 'GET', path: '/appointments/backjobs', desc: 'List backjobs (Admin)' },
        { method: 'POST', path: '/appointments/backjob/456/dispute', desc: 'Dispute backjob' },
        { method: 'PATCH', path: '/appointments/backjobs/456', desc: 'Update backjob status (Admin)' },
        { method: 'PATCH', path: '/appointments/123/backjob/reschedule', desc: 'Reschedule backjob' }
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
            console.log(`Description: ${endpoint.desc}`);
            
            const response = await fetch(`${baseUrl}${endpoint.path}`, {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: endpoint.method !== 'GET' ? JSON.stringify({}) : undefined
            });

            console.log(`Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 401) {
                console.log('✅ Endpoint exists (requires authentication)');
            } else if (response.status === 404) {
                console.log('❌ Endpoint not found');
            } else {
                console.log(`ℹ️  Unexpected response: ${response.status}`);
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log('❌ Server not running on localhost:3000');
                return;
            } else {
                console.log(`❌ Error: ${error.message}`);
            }
        }
        console.log('---');
    }
    
    console.log('\n✨ Backjob API endpoint test completed!');
}

testBackjobEndpoints();