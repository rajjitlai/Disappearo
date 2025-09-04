// Test Socket.io connection
const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('✅ Connected to Socket.io server:', socket.id);

    // Test joining a room
    socket.emit('join-room', 'test-room');
    console.log('✅ Joined test room');

    // Test sending a message
    socket.emit('send-message', {
        roomId: 'test-room',
        message: {
            $id: 'test-msg-1',
            $createdAt: new Date().toISOString(),
            sessionId: 'test-room',
            sender: 'test-user',
            text: 'Hello from Socket.io!'
        }
    });
    console.log('✅ Sent test message');

    // Listen for messages
    socket.on('new-message', (message) => {
        console.log('✅ Received message:', message);
    });

    // Disconnect after 3 seconds
    setTimeout(() => {
        socket.disconnect();
        console.log('✅ Disconnected from server');
        process.exit(0);
    }, 3000);
});

socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.error('❌ Connection timeout');
    process.exit(1);
}, 10000);
