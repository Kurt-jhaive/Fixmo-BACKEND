// Test WebSocket join conversation functionality
import { WebSocket } from 'ws';

const WS_URL = 'ws://127.0.0.1:3000';

function testJoinConversation() {
    console.log('🔌 Testing WebSocket joinConversation...\n');
    
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // First authenticate
        console.log('🔐 Authenticating as customer (user_id: 1)...');
        ws.send(JSON.stringify({
            type: 'authenticate',
            data: { userId: 1, userType: 'customer' }
        }));
        
        // Wait a moment then try to join conversation
        setTimeout(() => {
            console.log('📞 Attempting to join conversation 4...');
            ws.send(JSON.stringify({
                type: 'joinConversation',
                data: { conversationId: 4 }
            }));
        }, 1000);
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('📨 Received:', message);
            
            if (message.type === 'authenticated') {
                console.log('✅ Authentication successful');
            } else if (message.type === 'conversationJoined') {
                console.log('✅ Successfully joined conversation!');
                ws.close();
            } else if (message.type === 'error') {
                console.log('❌ Error:', message.message);
                ws.close();
            }
        } catch (err) {
            console.log('📨 Raw message:', data.toString());
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        console.log('\n✨ Test completed!');
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log('⏰ Test timeout - closing connection');
            ws.close();
        }
    }, 10000);
}

testJoinConversation();