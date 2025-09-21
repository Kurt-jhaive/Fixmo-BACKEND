// Simple JWT decoder for debugging
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }
        
        // Decode payload (second part)
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

// Test JWT from your output
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJUeXBlIjoiY3VzdG9tZXIiLCJpYXQiOjE3NTg0Nzk2NzUsImV4cCI6MTc1ODQ4MzI3NX0.1LLgvxCXKkF5GoE7uZIAC06FymPY_qql-E4VQ4a9s7s';

console.log('JWT Token Payload:');
console.log(JSON.stringify(decodeJWT(token), null, 2));