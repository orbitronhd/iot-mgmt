import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Device from './models/Device.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Socket.io initialization with open CORS for dev
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// REST Endpoint: The initial state load for the frontend
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await Device.find();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log(`[CONNECTION] Socket ID: ${socket.id}`);
  
  // Placeholders for Phase 3
  
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] Socket ID: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iot_digital_twin';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB Ledger');
    server.listen(PORT, () => console.log(`[SERVER] Hub Backend running on port ${PORT}`));
  })
  .catch(err => console.error('[DB] MongoDB connection error:', err));