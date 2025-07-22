// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // Serve static frontend

let value = 0;

// Emit new value every 30 seconds
setInterval(() => {
    value = Math.floor(Math.random() * 100);
    io.emit('valueUpdate', value);
    console.log('Sent new value:', value);
}, 30000);

io.on('connection', (socket) => {
    console.log('Client connected');
    // Optionally send initial value
    socket.emit('valueUpdate', value);
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
