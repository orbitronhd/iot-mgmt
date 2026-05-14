import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Switch,
  Slider,
  Box,
  Chip,
  AppBar,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  LightbulbCircle,
  Air as FanIcon,
  Tv as TvIcon,
  Sensors as SensorsIcon
} from '@mui/icons-material';

const SERVER_URL = 'http://localhost:5000';
const socket = io(SERVER_URL);

// Refined Google Home Dark Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#a8c7fa' }, // Soft Google Blue
    background: { default: '#000000', paper: '#1f1f1f' },
  },
  shape: { borderRadius: 28 }, // Massive border radius for Google Home aesthetic
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default MUI dark mode elevation overlay
        }
      }
    }
  }
});

export default function App() {
  const [devices, setDevices] = useState([]);
  const [connected, setConnected] = useState(false);
  const [pendingDevices, setPendingDevices] = useState(new Set());

  useEffect(() => {
    axios.get(`${SERVER_URL}/api/devices`)
      .then(res => setDevices(res.data))
      .catch(err => console.error("Failed to fetch initial state:", err));

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('dashboard:sync', (allDevices) => setDevices(allDevices));

    socket.on('dashboard:update', (updatedDevice) => {
      setDevices(prev => 
        prev.map(dev => dev.deviceId === updatedDevice.deviceId ? updatedDevice : dev)
      );
      setPendingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(updatedDevice.deviceId);
        return newSet;
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('dashboard:sync');
      socket.off('dashboard:update');
    };
  }, []);

  const handleCommand = (deviceId, command) => {
    setPendingDevices(prev => new Set(prev).add(deviceId));
    socket.emit('dashboard:command', { deviceId, command });
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position="static" color="transparent" elevation={0} sx={{ pt: 2, pb: 2, mb: 2 }}>
        <Toolbar>
          <SensorsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: '500', letterSpacing: '-0.5px' }}>
            Home
          </Typography>
          <Chip 
            label={connected ? "Connected" : "Offline"} 
            size="small"
            sx={{ 
              backgroundColor: connected ? 'rgba(168, 199, 250, 0.15)' : 'rgba(255, 138, 101, 0.15)',
              color: connected ? '#a8c7fa' : '#ff8a65',
              fontWeight: 600,
              borderRadius: '12px'
            }} 
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Grid container spacing={2}>
          {devices.length === 0 ? (
            <Typography sx={{ mt: 10, width: '100%', textAlign: 'center', color: 'text.secondary' }}>
              Waiting for Hub synchronization...
            </Typography>
          ) : (
            devices.map(device => (
              <Grid item xs={12} sm={6} md={4} key={device.deviceId}>
                <DeviceCard 
                  device={device} 
                  onCommand={handleCommand} 
                  isPending={pendingDevices.has(device.deviceId)} 
                />
              </Grid>
            ))
          )}
        </Grid>
      </Container>
    </ThemeProvider>
  );
}

function DeviceCard({ device, onCommand, isPending }) {
  const { name, type, status, state, deviceId } = device;
  const isOnline = status === 'ONLINE';
  const isPowered = state.power;

  // Google Home Color Palette Mapping
  let Icon = LightbulbCircle;
  let activeColor = '#fde293'; // Warm Amber
  let activeBg = 'rgba(253, 226, 147, 0.12)';
  
  if (type === 'FAN') { 
    Icon = FanIcon; 
    activeColor = '#a8c7fa'; // Soft Blue
    activeBg = 'rgba(168, 199, 250, 0.12)';
  }
  if (type === 'TV') { 
    Icon = TvIcon; 
    activeColor = '#e8b4d6'; // Soft Pink/Purple
    activeBg = 'rgba(232, 180, 214, 0.12)';
  }

  // Determine current surface color
  const surfaceColor = (isPowered && isOnline) ? activeBg : '#1f1f1f';
  const iconColor = (isPowered && isOnline) ? activeColor : '#5f6368';

  return (
    <Card sx={{ 
      height: '100%', 
      minHeight: '160px',
      display: 'flex', 
      flexDirection: 'column',
      transition: 'background-color 0.3s ease, opacity 0.3s ease',
      backgroundColor: surfaceColor,
      opacity: isOnline ? 1 : 0.5,
      boxShadow: 'none',
      border: 'none',
    }}>
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', '&:last-child': { pb: 3 } }}>
        
        {/* Top Row: Icon & Switch */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ 
            backgroundColor: isPowered && isOnline ? activeColor : '#303030',
            borderRadius: '50%',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            <Icon sx={{ color: isPowered && isOnline ? '#000' : '#9aa0a6', fontSize: 28 }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isPending && <CircularProgress size={24} sx={{ color: activeColor }} />}
            <Switch 
              checked={isPowered || false} 
              disabled={!isOnline || isPending}
              onChange={(e) => onCommand(deviceId, { power: e.target.checked })}
              sx={{ 
                '& .MuiSwitch-switchBase.Mui-checked': { color: activeColor },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: activeColor },
              }}
            />
          </Box>
        </Box>

        {/* Middle Row: Typography */}
        <Box sx={{ mt: 'auto', mb: type === 'LIGHT' || type === 'FAN' || type === 'TV' ? 2 : 0 }}>
          <Typography variant="h6" sx={{ fontWeight: '500', fontSize: '1.1rem', lineHeight: 1.2, mb: 0.5 }}>
            {name}
          </Typography>
          <Typography variant="body2" sx={{ color: isPowered ? activeColor : 'text.secondary', fontWeight: '500' }}>
            {!isOnline ? 'Offline' : (isPowered ? 'On' : 'Off')}
          </Typography>
        </Box>

        {/* Bottom Row: Contextual Controls */}
        {isOnline && (
          <Box sx={{ mt: 'auto', pt: 1, opacity: isPowered ? 1 : 0.4, pointerEvents: isPowered ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
            
            {type === 'LIGHT' && (
              <Slider 
                value={state.brightness || 0} 
                disabled={!isPowered || isPending}
                onChange={(e, val) => onCommand(deviceId, { brightness: val })}
                sx={{ 
                  color: activeColor, 
                  height: 24, 
                  padding: '0',
                  '& .MuiSlider-thumb': { width: 24, height: 24, boxShadow: 'none' },
                  '& .MuiSlider-track': { border: 'none' }
                }}
              />
            )}

            {type === 'FAN' && (
              <ToggleButtonGroup
                value={state.speed?.toString() || "1"}
                exclusive
                disabled={!isPowered || isPending}
                onChange={(e, val) => val && onCommand(deviceId, { speed: parseInt(val) })}
                fullWidth
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'text.secondary',
                    borderRadius: '16px !important',
                    mx: 0.5,
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    '&.Mui-selected': {
                      backgroundColor: activeColor,
                      color: '#000',
                      '&:hover': { backgroundColor: activeColor }
                    }
                  }
                }}
              >
                <ToggleButton value="1">1</ToggleButton>
                <ToggleButton value="2">2</ToggleButton>
                <ToggleButton value="3">3</ToggleButton>
              </ToggleButtonGroup>
            )}

            {type === 'TV' && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px', p: 0.5 }}>
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary', fontWeight: 500 }}>
                  CH {state.channel || 1}
                </Typography>
                <Box sx={{ display: 'flex' }}>
                  <IconButton 
                    size="small" 
                    disabled={!isPowered || isPending}
                    onClick={() => onCommand(deviceId, { channel: Math.max(1, (state.channel || 1) - 1) })}
                    sx={{ color: activeColor }}
                  >
                    <Typography variant="h6" sx={{ lineHeight: 1 }}>-</Typography>
                  </IconButton>
                  <IconButton 
                    size="small" 
                    disabled={!isPowered || isPending}
                    onClick={() => onCommand(deviceId, { channel: (state.channel || 1) + 1 })}
                    sx={{ color: activeColor }}
                  >
                    <Typography variant="h6" sx={{ lineHeight: 1 }}>+</Typography>
                  </IconButton>
                </Box>
              </Box>
            )}

          </Box>
        )}
      </CardContent>
    </Card>
  );
}