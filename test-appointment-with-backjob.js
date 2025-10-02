const axios = require('axios');

const BASE_URL = 'http://loc        console.log('📝 Frontend Usage:');
        console.log('When fetching appointments, you can now access:');
        console.log('- appointment.current_backjob.backjob_id (for cancellation, dispute, etc.)');
        console.log('- appointment.current_backjob.status');
        console.log('- appointment.current_backjob.reason');
        console.log('- appointment.current_backjob.created_at');:3000/api';

async function testAppointmentWithBackjob() {
    try {
        console.log('🧪 Testing appointment endpoints with backjob information...\n');

        // Test getting customer appointments (customer ID 1)
        console.log('📋 Testing getCustomerAppointments...');
        const customerResponse = await axios.get(`${BASE_URL}/customers/1/appointments`, {
            params: {
                page: 1,
                limit: 5
            }
        });

        console.log('✅ Customer appointments response structure:');
        if (customerResponse.data.success && customerResponse.data.data.length > 0) {
            const appointment = customerResponse.data.data[0];
            console.log('- appointment_id:', appointment.appointment_id);
            console.log('- appointment_status:', appointment.appointment_status);
            console.log('- current_backjob:', appointment.current_backjob ? 
                {
                    backjob_id: appointment.current_backjob.backjob_id,
                    reason: appointment.current_backjob.reason?.substring(0, 50) + '...',
                    status: appointment.current_backjob.status
                } : 'null'
            );
            console.log('- days_left:', appointment.days_left);
            console.log('- needs_rating:', appointment.needs_rating);
        } else {
            console.log('No appointments found for customer 1');
        }

        console.log('\n📋 Testing getProviderAppointments...');
        // Test getting provider appointments (provider ID 1)
        const providerResponse = await axios.get(`${BASE_URL}/providers/1/appointments`, {
            params: {
                page: 1,
                limit: 5
            }
        });

        console.log('✅ Provider appointments response structure:');
        if (providerResponse.data.success && providerResponse.data.data.length > 0) {
            const appointment = providerResponse.data.data[0];
            console.log('- appointment_id:', appointment.appointment_id);
            console.log('- appointment_status:', appointment.appointment_status);
            console.log('- current_backjob:', appointment.current_backjob ? 
                {
                    backjob_id: appointment.current_backjob.backjob_id,
                    reason: appointment.current_backjob.reason?.substring(0, 50) + '...',
                    status: appointment.current_backjob.status
                } : 'null'
            );
            console.log('- days_left:', appointment.days_left);
            console.log('- needs_rating:', appointment.needs_rating);
        } else {
            console.log('No appointments found for provider 1');
        }

        console.log('\n🎉 Test completed successfully!');
        console.log('\n📝 Frontend Usage:');
        console.log('When fetching appointments, you can now access:');
        console.log('- appointment.current_backjob.backjob_id (for cancellation, dispute, etc.)');
        console.log('- appointment.current_backjob.application_status');
        console.log('- appointment.current_backjob.issue_description');
        console.log('- appointment.current_backjob.created_at');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testAppointmentWithBackjob();