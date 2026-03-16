const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const alumniRoutes = require('./routes/alumniRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const server = http.createServer(app);

// Cross-Origin Resource Sharing
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Setup payload parsing limit for base64 images
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Setup Socket.IO for real-time reactivity
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});

// Pass io to Express app instance to be used in controllers
app.set('io', io);

// REST API routes
app.use('/api/alumni', alumniRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Backend Server + Socket.IO running on http://localhost:${PORT}`);
});
