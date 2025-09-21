import jwt from 'jsonwebtoken';

// Test JWT verification with different secrets
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJUeXBlIjoiY3VzdG9tZXIiLCJpYXQiOjE3NTg0Nzk3NTAsImV4cCI6MTc1ODQ4MzM1MH0.ZozueURI75C5Y4ADtfaff4mtCe_pf5cVqtTCY2zh7oE';

console.log('Testing JWT verification with different secrets...\n');

const secrets = [
    process.env.JWT_SECRET,
    'your-secret-key',
    'default-secret',
    'secret',
    'jwt-secret'
];

for (const secret of secrets) {
    try {
        console.log(`Trying secret: "${secret}"`);
        const decoded = jwt.verify(token, secret);
        console.log('✅ SUCCESS! Decoded:', decoded);
        console.log('This is the correct JWT secret to use.\n');
        break;
    } catch (error) {
        console.log('❌ Failed:', error.message);
    }
}

console.log('\nEnvironment variables:');
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('NODE_ENV:', process.env.NODE_ENV);