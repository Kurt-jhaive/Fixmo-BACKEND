import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/admin'; // Adjust based on your server setup

// Test data
const superAdminCredentials = {
    username: 'super@fixmo.local',
    password: 'SuperAdmin2024!'
};

const newPassword = 'NewSuperAdmin2024!';

let authToken = '';
let newAdminData = null;

async function testAdminLogin() {
    try {
        console.log('\n🧪 Testing Admin Login...');
        
        const response = await axios.post(`${BASE_URL}/login`, superAdminCredentials);
        
        console.log('✅ Login successful');
        console.log('Response:', response.data);
        
        if (response.data.must_change_password) {
            console.log('⚠️ Password change required (as expected)');
        }
        
        authToken = response.data.token;
        return response.data;
        
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testChangePassword() {
    try {
        console.log('\n🧪 Testing Change Password...');
        
        const response = await axios.put(`${BASE_URL}/change-password`, {
            current_password: superAdminCredentials.password,
            new_password: newPassword
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Password changed successfully');
        console.log('Response:', response.data);
        
        // Update credentials for future tests
        superAdminCredentials.password = newPassword;
        
        return response.data;
        
    } catch (error) {
        console.error('❌ Change password failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testLoginAfterPasswordChange() {
    try {
        console.log('\n🧪 Testing Login After Password Change...');
        
        const response = await axios.post(`${BASE_URL}/login`, superAdminCredentials);
        
        console.log('✅ Login successful with new password');
        console.log('Response:', response.data);
        
        if (!response.data.must_change_password) {
            console.log('✅ Password change requirement cleared');
        }
        
        authToken = response.data.token;
        return response.data;
        
    } catch (error) {
        console.error('❌ Login after password change failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testInviteAdmin() {
    try {
        console.log('\n🧪 Testing Invite Admin...');
        
        const response = await axios.post(`${BASE_URL}/`, {
            email: 'test.admin@fixmo.local',
            name: 'Test Administrator',
            role: 'admin'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Admin invited successfully');
        console.log('Response:', response.data);
        
        newAdminData = response.data;
        return response.data;
        
    } catch (error) {
        console.error('❌ Invite admin failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testGetAllAdmins() {
    try {
        console.log('\n🧪 Testing Get All Admins...');
        
        const response = await axios.get(`${BASE_URL}/`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Admins fetched successfully');
        console.log('Response:', response.data);
        
        return response.data;
        
    } catch (error) {
        console.error('❌ Get admins failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testNewAdminLogin() {
    try {
        console.log('\n🧪 Testing New Admin Login...');
        
        if (!newAdminData) {
            console.log('⚠️ Skipping - no new admin data available');
            return;
        }
        
        const response = await axios.post(`${BASE_URL}/login`, {
            username: newAdminData.admin.email,
            password: newAdminData.temporary_password
        });
        
        console.log('✅ New admin login successful');
        console.log('Response:', response.data);
        
        if (response.data.must_change_password) {
            console.log('✅ Password change required for new admin (as expected)');
        }
        
        return response.data;
        
    } catch (error) {
        console.error('❌ New admin login failed:', error.response?.data || error.message);
        throw error;
    }
}

async function testToggleAdminStatus() {
    try {
        console.log('\n🧪 Testing Toggle Admin Status...');
        
        if (!newAdminData) {
            console.log('⚠️ Skipping - no new admin data available');
            return;
        }
        
        // Deactivate admin
        const deactivateResponse = await axios.put(`${BASE_URL}/${newAdminData.admin.id}/toggle-status`, {
            is_active: false
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Admin deactivated successfully');
        console.log('Deactivate Response:', deactivateResponse.data);
        
        // Reactivate admin
        const reactivateResponse = await axios.put(`${BASE_URL}/${newAdminData.admin.id}/toggle-status`, {
            is_active: true
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Admin reactivated successfully');
        console.log('Reactivate Response:', reactivateResponse.data);
        
        return { deactivateResponse: deactivateResponse.data, reactivateResponse: reactivateResponse.data };
        
    } catch (error) {
        console.error('❌ Toggle admin status failed:', error.response?.data || error.message);
        throw error;
    }
}

async function runAllTests() {
    try {
        console.log('🚀 Starting Admin System Tests...\n');
        
        // Test login with initial credentials
        await testAdminLogin();
        
        // Test change password
        await testChangePassword();
        
        // Test login with new password
        await testLoginAfterPasswordChange();
        
        // Test invite admin
        await testInviteAdmin();
        
        // Test get all admins
        await testGetAllAdmins();
        
        // Test new admin login
        await testNewAdminLogin();
        
        // Test toggle admin status
        await testToggleAdminStatus();
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('\n💥 Test suite failed:', error.message);
        process.exit(1);
    }
}

// Check if server is running first
async function checkServer() {
    try {
        await axios.get('http://localhost:3000/health'); // Adjust based on your health check endpoint
        return true;
    } catch (error) {
        return false;
    }
}

// Main execution
console.log('📋 Admin System Test Suite');
console.log('========================');
console.log('Make sure your server is running on http://localhost:3000');
console.log('Starting tests in 3 seconds...\n');

setTimeout(async () => {
    const isServerRunning = await checkServer();
    if (!isServerRunning) {
        console.log('⚠️ Server doesn\'t seem to be running. Please start your server and run this test again.');
        console.log('Expected endpoints:');
        console.log('- POST /api/admin/login');
        console.log('- PUT /api/admin/change-password');
        console.log('- POST /api/admin/');
        console.log('- GET /api/admin/');
        console.log('- PUT /api/admin/:id/toggle-status');
        process.exit(1);
    }
    
    await runAllTests();
}, 3000);
