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

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

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
  
  // 1. Simulator connects and registers its mock devices
  socket.on('device:register', async (devicesPayload) => {
    console.log(`[HUB] Registering ${devicesPayload.length} devices from Simulator.`);
    
    // Flag this specific socket connection as the Simulator
    socket.isSimulator = true; 
    
    for (const dev of devicesPayload) {
      await Device.findOneAndUpdate(
        { deviceId: dev.deviceId },
        { ...dev, status: 'ONLINE', lastUpdated: Date.now() },
        { upsert: true, returnDocument: 'after' }
      );
    }
    
    const allDevices = await Device.find();
    io.emit('dashboard:sync', allDevices);
  });

  // 2. Frontend Portal sends a command to a device
  socket.on('dashboard:command', (payload) => {
    // Payload format: { deviceId: 'LIG-1', command: { power: true } }
    console.log(`[HUB] Routing command to ${payload.deviceId}`);
    
    // Broadcast to the simulator (simulator filters by deviceId)
    socket.broadcast.emit('device:command', payload);
  });

  // 3. Simulator confirms state change
  socket.on('device:acknowledge', async (payload) => {
    console.log(`[HUB] State acknowledged by ${payload.deviceId}`);
    
    const updatedDevice = await Device.findOneAndUpdate(
        { deviceId: payload.deviceId },
        { state: payload.state, lastUpdated: Date.now() },
        { returnDocument: 'after' } // Updated here
    );
    
    // Push the specific device update to the frontend portal
    io.emit('dashboard:update', updatedDevice);
  });

  // 4. Handle Disconnects
  socket.on('disconnect', async () => {
    console.log(`[DISCONNECT] Socket ID: ${socket.id}`);
    
    // Only cascade the OFFLINE state if the disconnecting socket was the Simulator
    if (socket.isSimulator) {
      console.log(`[HUB] Simulator disconnected. Marking devices offline.`);
      await Device.updateMany({}, { status: 'OFFLINE' });
      
      const allDevices = await Device.find();
      io.emit('dashboard:sync', allDevices);
    }
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