import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['LIGHT', 'FAN', 'TV'], required: true },
  status: { type: String, enum: ['ONLINE', 'OFFLINE'], default: 'OFFLINE' },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastUpdated: { type: Date, default: Date.now }
}, { strict: false }); // strict: false allows dynamic state shapes per device type

export default mongoose.model('Device', deviceSchema);