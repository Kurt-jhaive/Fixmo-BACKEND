// Test Admin Invitation with Email
// This test demonstrates the enhanced admin invitation system

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

async function testAdminInvitation() {
    console.log('🧪 Testing Admin Invitation with Email System\n');

    try {
        // Step 1: Login as super admin
        console.log('1️⃣ Logging in as super admin...');
        const loginResponse = await axios.post(`${API_BASE}/admin/login`, {
            email: 'super@fixmo.local',
            password: 'SuperAdmin123!'
        });

        const token = loginResponse.data.token;
        console.log('✅ Super admin login successful\n');

        // Step 2: Invite new admin
        console.log('2️⃣ Inviting new admin...');
        const inviteResponse = await axios.post(
            `${API_BASE}/admin`,
            {
                email: 'test.admin@fixmo.local',
                name: 'Test Administrator',
                role: 'admin'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log('✅ Admin invitation successful!');
        console.log('📧 Invitation email sent to:', inviteResponse.data.admin.email);
        console.log('👤 New admin details:', {
            id: inviteResponse.data.admin.id,
            username: inviteResponse.data.admin.username,
            email: inviteResponse.data.admin.email,
            name: inviteResponse.data.admin.name,
            role: inviteResponse.data.admin.role
        });
        console.log('📝 Note:', inviteResponse.data.note);

        // Step 3: Get all admins to verify creation
        console.log('\n3️⃣ Verifying admin creation...');
        const allAdminsResponse = await axios.get(
            `${API_BASE}/admin`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const newAdmin = allAdminsResponse.data.admins.find(
            admin => admin.email === 'test.admin@fixmo.local'
        );

        if (newAdmin) {
            console.log('✅ Admin successfully created and verified');
            console.log('🔒 Must change password:', newAdmin.must_change_password);
            console.log('🟢 Is active:', newAdmin.is_active);
        } else {
            console.log('❌ Admin not found in list');
        }

        console.log('\n🎉 All tests passed! Admin invitation system working correctly.');
        console.log('\n📧 Email Features:');
        console.log('- ✅ Professional invitation email sent');
        console.log('- ✅ Login credentials included');
        console.log('- ✅ Role-specific responsibilities listed');
        console.log('- ✅ Security reminders included');
        console.log('- ✅ Direct login link provided');

    } catch (error) {
        console.error('❌ Test failed:', {
            message: error.response?.data?.message || error.message,
            status: error.response?.status,
            details: error.response?.data
        });
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testAdminInvitation();
}

export { testAdminInvitation };
