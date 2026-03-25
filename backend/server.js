const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const alumniRoutes  = require('./routes/alumniRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes    = require('./routes/authRoutes');
const eventsRoutes  = require('./routes/eventsRoutes');
const fundRoutes    = require('./routes/fundRoutes');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3002',
];

// Cross-Origin Resource Sharing
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Setup payload parsing limit for base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup Socket.IO for real-time reactivity
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// REST API routes
app.use('/api/alumni',    alumniRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth',      authRoutes);
app.use('/api/events',    eventsRoutes);
app.use('/api/fund',      fundRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Backend Server + Socket.IO running on http://localhost:${PORT}`);
  console.log(`   - Alumni   : /api/alumni`);
  console.log(`   - Auth     : /api/auth`);
  console.log(`   - Events   : /api/events`);
  console.log(`   - Fund     : /api/fund`);
  console.log(`   - Dashboard: /api/dashboard\n`);
});
