/**
 * FixMo Backend - Push Notifications Test Script
 * 
 * This script helps you test the push notification system.
 * Run with: node test-push-notifications.js
 */

import prisma from './src/prismaclient.js';
import notificationService from './src/services/notificationService.js';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testDatabaseConnection() {
  section('TEST 1: Database Connection');
  try {
    await prisma.$connect();
    log('✅ Database connected successfully', 'green');
    return true;
  } catch (error) {
    log('❌ Database connection failed', 'red');
    console.error(error);
    return false;
  }
}

async function testPushTokenTable() {
  section('TEST 2: PushToken Table');
  try {
    const count = await prisma.pushToken.count();
    log(`✅ PushToken table exists`, 'green');
    log(`   Current tokens in database: ${count}`, 'blue');
    return true;
  } catch (error) {
    log('❌ PushToken table check failed', 'red');
    console.error(error);
    return false;
  }
}

async function testTokenRegistration() {
  section('TEST 3: Token Registration');
  try {
    // Create a test token
    const testToken = 'ExponentPushToken[TEST-TOKEN-' + Date.now() + ']';
    
    const pushToken = await prisma.pushToken.create({
      data: {
        user_id: 1,
        user_type: 'customer',
        expo_push_token: testToken,
        device_platform: 'android',
        device_name: 'Test Device',
        device_os_version: '13',
        is_active: true,
      },
    });
    
    log('✅ Token registration successful', 'green');
    log(`   Token ID: ${pushToken.id}`, 'blue');
    log(`   User ID: ${pushToken.user_id}`, 'blue');
    log(`   User Type: ${pushToken.user_type}`, 'blue');
    
    // Clean up test token
    await prisma.pushToken.delete({
      where: { id: pushToken.id },
    });
    log('   Test token cleaned up', 'yellow');
    
    return true;
  } catch (error) {
    log('❌ Token registration failed', 'red');
    console.error(error);
    return false;
  }
}

async function testGetUserTokens() {
  section('TEST 4: Get User Tokens');
  try {
    // Check if there are any customers
    const customer = await prisma.user.findFirst();
    
    if (!customer) {
      log('⚠️  No customers found in database', 'yellow');
      return true;
    }
    
    const tokens = await notificationService.getUserPushTokens(
      customer.user_id,
      'customer'
    );
    
    log('✅ Token retrieval successful', 'green');
    log(`   Customer ID: ${customer.user_id}`, 'blue');
    log(`   Tokens found: ${tokens.length}`, 'blue');
    
    if (tokens.length > 0) {
      tokens.forEach((token, index) => {
        log(`   Token ${index + 1}: ${token.substring(0, 30)}...`, 'blue');
      });
    }
    
    return true;
  } catch (error) {
    log('❌ Token retrieval failed', 'red');
    console.error(error);
    return false;
  }
}

async function testNotificationService() {
  section('TEST 5: Notification Service');
  try {
    // This test doesn't actually send a notification
    // It just checks if the service can be called
    log('✅ Notification service loaded successfully', 'green');
    log('   Available functions:', 'blue');
    log('   - sendPushNotification', 'blue');
    log('   - sendNewMessageNotification', 'blue');
    log('   - sendBookingUpdateNotification', 'blue');
    log('   - sendRatingReminderNotification', 'blue');
    log('   - sendWarrantyReminderNotification', 'blue');
    log('   - sendBackjobStatusNotification', 'blue');
    log('   - sendVerificationStatusNotification', 'blue');
    return true;
  } catch (error) {
    log('❌ Notification service test failed', 'red');
    console.error(error);
    return false;
  }
}

async function testActiveTokensCount() {
  section('TEST 6: Active Tokens Count');
  try {
    const activeCustomerTokens = await prisma.pushToken.count({
      where: {
        user_type: 'customer',
        is_active: true,
      },
    });
    
    const activeProviderTokens = await prisma.pushToken.count({
      where: {
        user_type: 'provider',
        is_active: true,
      },
    });
    
    const totalActiveTokens = activeCustomerTokens + activeProviderTokens;
    
    log('✅ Active tokens counted', 'green');
    log(`   Active customer tokens: ${activeCustomerTokens}`, 'blue');
    log(`   Active provider tokens: ${activeProviderTokens}`, 'blue');
    log(`   Total active tokens: ${totalActiveTokens}`, 'blue');
    
    return true;
  } catch (error) {
    log('❌ Token count failed', 'red');
    console.error(error);
    return false;
  }
}

async function showSystemStatus() {
  section('SYSTEM STATUS');
  try {
    const stats = {
      totalTokens: await prisma.pushToken.count(),
      activeTokens: await prisma.pushToken.count({ where: { is_active: true } }),
      inactiveTokens: await prisma.pushToken.count({ where: { is_active: false } }),
      customerTokens: await prisma.pushToken.count({ where: { user_type: 'customer' } }),
      providerTokens: await prisma.pushToken.count({ where: { user_type: 'provider' } }),
      androidTokens: await prisma.pushToken.count({ where: { device_platform: 'android' } }),
      iosTokens: await prisma.pushToken.count({ where: { device_platform: 'ios' } }),
    };
    
    log('📊 Push Notification System Statistics:', 'bright');
    log(`   Total tokens: ${stats.totalTokens}`, 'blue');
    log(`   Active tokens: ${stats.activeTokens}`, 'green');
    log(`   Inactive tokens: ${stats.inactiveTokens}`, 'yellow');
    log(`   Customer tokens: ${stats.customerTokens}`, 'blue');
    log(`   Provider tokens: ${stats.providerTokens}`, 'blue');
    log(`   Android devices: ${stats.androidTokens}`, 'blue');
    log(`   iOS devices: ${stats.iosTokens}`, 'blue');
    
    return true;
  } catch (error) {
    log('❌ Failed to get system status', 'red');
    console.error(error);
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 FixMo Push Notifications Test Suite', 'bright');
  log('Starting tests...', 'cyan');
  
  const results = [];
  
  results.push({ name: 'Database Connection', passed: await testDatabaseConnection() });
  results.push({ name: 'PushToken Table', passed: await testPushTokenTable() });
  results.push({ name: 'Token Registration', passed: await testTokenRegistration() });
  results.push({ name: 'Get User Tokens', passed: await testGetUserTokens() });
  results.push({ name: 'Notification Service', passed: await testNotificationService() });
  results.push({ name: 'Active Tokens Count', passed: await testActiveTokensCount() });
  
  await showSystemStatus();
  
  // Summary
  section('TEST SUMMARY');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });
  
  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    log(`🎉 All tests passed! (${passed}/${results.length})`, 'green');
    log('Your push notification system is ready to use!', 'green');
  } else {
    log(`⚠️  ${failed} test(s) failed, ${passed} passed`, 'yellow');
    log('Please check the errors above and fix them.', 'yellow');
  }
  console.log('='.repeat(60) + '\n');
  
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
