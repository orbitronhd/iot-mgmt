import { io } from 'socket.io-client';
import chalk from 'chalk';

const SERVER_URL = 'http://localhost:5000';
const socket = io(SERVER_URL);

// Mock State for the Digital Twin
const devices = {
  'LIG-1': { deviceId: 'LIG-1', name: 'Living Room Light', type: 'LIGHT', state: { power: false, brightness: 100 } },
  'LIG-2': { deviceId: 'LIG-2', name: 'Bedroom Light', type: 'LIGHT', state: { power: false, brightness: 50 } },
  'FAN-1': { deviceId: 'FAN-1', name: 'Ceiling Fan', type: 'FAN', state: { power: false, speed: 1 } },
  'TV-1':  { deviceId: 'TV-1', name: 'Living Room TV', type: 'TV', state: { power: false, channel: 5 } }
};

socket.on('connect', () => {
  console.log(chalk.green(`[CONNECTED] Connected to Hub. ID: ${socket.id}`));
  
  // Register devices on connection
  const deviceArray = Object.values(devices);
  socket.emit('device:register', deviceArray);
  console.log(chalk.blue(`[REGISTER] Sent ${deviceArray.length} devices to Hub.`));
});

socket.on('device:command', (payload) => {
  const { deviceId, command } = payload;
  
  if (!devices[deviceId]) {
    console.log(chalk.red(`[ERROR] Received command for unknown device: ${deviceId}`));
    return;
  }

  const device = devices[deviceId];
  const oldState = { ...device.state };
  
  // Apply command to local state
  device.state = { ...device.state, ...command };

  // Visual Feedback
  const header = chalk.bgWhite.black(` [${device.name}] `);
  
  if (device.type === 'LIGHT') {
    const color = device.state.power ? chalk.yellowBright : chalk.gray;
    console.log(`${header} Power: ${color(device.state.power)} | Brightness: ${device.state.brightness}%`);
  } else if (device.type === 'FAN') {
    const color = device.state.power ? chalk.cyanBright : chalk.gray;
    console.log(`${header} Power: ${color(device.state.power)} | Speed: ${device.state.speed}`);
  } else if (device.type === 'TV') {
    const color = device.state.power ? chalk.magentaBright : chalk.gray;
    console.log(`${header} Power: ${color(device.state.power)} | Channel: ${device.state.channel}`);
  }

  // Acknowledge the state change back to the server
  socket.emit('device:acknowledge', {
    deviceId: device.deviceId,
    state: device.state
  });
});

socket.on('disconnect', () => {
  console.log(chalk.red('[DISCONNECTED] Lost connection to Hub.'));
});