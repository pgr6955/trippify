// src/components/Visualizer.jsx
import React, { useEffect, useRef, useState } from 'react';
import { initializePlayer, playTrack, pausePlayback, resumePlayback, setVolume } from '../utils/spotify';

const Visualizer = ({ trackId, trackUri, visualType, token, onClose }) => {
  console.log('🎵 Visualizer component rendering with props:', { trackId, trackUri, visualType, token: !!token });
  
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const deviceIdRef = useRef(null);
  const animationRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolumeState] = useState(50);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    console.log('🎵 Visualizer useEffect starting...');

    const setupPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('🎵 Setting up Spotify player...');

        // Check if Spotify SDK is available
        if (!window.Spotify) {
          throw new Error('Spotify Web Playback SDK not loaded. Make sure you have Spotify Premium.');
        }

        console.log('✅ Spotify SDK found, initializing player...');

        // Initialize Spotify Player
        const { player, device_id } = await initializePlayer(
          token,
          (deviceId) => {
            console.log('✅ Player ready with device ID:', deviceId);
            deviceIdRef.current = deviceId;
            setPlayerReady(true);
          },
          (state) => {
            if (!mounted) return;
            
            console.log('🎵 Player state changed:', state);
            if (state) {
              setIsPlaying(!state.paused);
              setCurrentTrack(state.track_window.current_track);
              console.log('🎵 Current track:', state.track_window.current_track);
            }
          }
        );

        if (!mounted) return;

        playerRef.current = player;
        console.log('✅ Player setup complete');
        
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Failed to setup player:', err);
        if (mounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    setupPlayer();

    return () => {
      mounted = false;
      console.log('🎵 Cleaning up Visualizer component...');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [token]);

  const handlePlayPause = async () => {
    console.log('🎵 Play/Pause clicked');
    console.log('🎵 Player ready:', playerReady);
    console.log('🎵 Device ID:', deviceIdRef.current);
    console.log('🎵 Track URI:', trackUri);
    console.log('🎵 Is playing:', isPlaying);

    try {
      if (!playerReady || !deviceIdRef.current) {
        throw new Error('Player not ready yet. Please wait...');
      }

      if (isPlaying) {
        console.log('🎵 Pausing playback...');
        await pausePlayback(token);
      } else {
        if (trackUri) {
          console.log('🎵 Playing track:', trackUri);
          await playTrack(token, deviceIdRef.current, trackUri);
          
          // Start visualization after a short delay
          setTimeout(() => {
            console.log('🎵 Starting visualization...');
            startVisualization();
          }, 1000);
        } else {
          console.log('🎵 Resuming playback...');
          await resumePlayback(token);
          startVisualization();
        }
      }
    } catch (err) {
      console.error('❌ Playback error:', err);
      setError(err.message);
    }
  };

  const handleVolumeChange = async (newVolume) => {
    try {
      setVolumeState(newVolume);
      if (playerRef.current) {
        await playerRef.current.setVolume(newVolume / 100);
      }
      await setVolume(token, newVolume);
    } catch (err) {
      console.error('Volume change error:', err);
    }
  };

  const startVisualization = () => {
    console.log('🎨 Starting visualization...');
    
    if (!canvasRef.current) {
      console.error('❌ Missing canvas');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Create a more realistic audio simulation
    let time = 0;
    
    console.log('🎨 Visualization setup complete, starting animation loop');

    const draw = () => {
      if (!isPlaying) {
        console.log('🎨 Not playing, stopping animation');
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      
      // Simulate audio data with more realistic patterns
      const bufferLength = 128;
      const dataArray = new Uint8Array(bufferLength);
      
      // Create bass-heavy audio simulation
      for (let i = 0; i < bufferLength; i++) {
        const frequency = i / bufferLength;
        const bassBoost = frequency < 0.1 ? 3 : 1;
        const midBoost = frequency > 0.1 && frequency < 0.6 ? 1.5 : 1;
        const trebleBoost = frequency > 0.8 ? 1.2 : 1;
        
        dataArray[i] = Math.max(0, Math.min(255, 
          (Math.sin(time * 0.01 + i * 0.1) * 60 + 80) * bassBoost * midBoost * trebleBoost +
          Math.random() * 40
        ));
      }
      
      time += 1;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      switch (visualType) {
        case 'bars':
          drawBars(ctx, dataArray, canvas.width, canvas.height);
          break;
        case 'spirals':
          drawSpirals(ctx, dataArray, canvas.width, canvas.height);
          break;
        case 'waveform':
          drawWaveform(ctx, dataArray, canvas.width, canvas.height);
          break;
        case '3d':
          draw3D(ctx, dataArray, canvas.width, canvas.height);
          break;
        default:
          drawBars(ctx, dataArray, canvas.width, canvas.height);
      }
    };

    draw();
  };

  const drawBars = (ctx, dataArray, width, height) => {
    const barWidth = (width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      barHeight = (dataArray[i] / 255) * height;
      
      const r = barHeight + 25 * (i / dataArray.length);
      const g = 250 * (i / dataArray.length);
      const b = 50;
      
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  };

  const drawSpirals = (ctx, dataArray, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < dataArray.length; i++) {
      const angle = (i / dataArray.length) * Math.PI * 2;
      const radius = (dataArray[i] / 255) * 200;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  };

  const drawWaveform = (ctx, dataArray, width, height) => {
    ctx.strokeStyle = '#ff0080';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const sliceWidth = width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * height / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  };

  const draw3D = (ctx, dataArray, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let i = 0; i < dataArray.length; i++) {
      const angle = (i / dataArray.length) * Math.PI * 2;
      const radius = (dataArray[i] / 255) * 150;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle + 0.1) * radius * 1.5;
      const y2 = centerY + Math.sin(angle + 0.1) * radius * 1.5;
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, `hsl(${(i / dataArray.length) * 360}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${(i / dataArray.length) * 360}, 100%, 20%)`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl mb-2">Loading Spotify Player...</div>
          <div className="text-sm text-gray-400">
            Make sure you have Spotify Premium and the Web Playback SDK is enabled
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-red-900 z-50 flex flex-col items-center justify-center p-4">
        <div className="text-white text-center max-w-md">
          <div className="font-bold mb-4 text-xl">Error: {error}</div>
          <div className="text-sm text-red-200 mb-4">
            Common issues:
            <ul className="list-disc list-inside mt-2 text-left">
              <li>Spotify Premium required for Web Playback</li>
              <li>Make sure no other Spotify instances are playing</li>
              <li>Try refreshing the page</li>
              <li>Check browser console for more details</li>
            </ul>
          </div>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded z-10"
      >
        ✕ Close Visualizer
      </button>

      {/* Main Visualization Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={1200}
          height={600}
          className="max-w-full max-h-full border border-gray-700 rounded-lg"
          style={{ width: '100%', height: 'auto', maxHeight: '70vh' }}
        />
      </div>

      {/* Bottom Controls Bar */}
      <div className="bg-gray-900 border-t border-gray-700 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Track Info */}
          <div className="flex items-center gap-4 mb-4">
            {currentTrack && (
              <>
                {currentTrack.album?.images?.[0] && (
                  <img 
                    src={currentTrack.album.images[0].url} 
                    alt={currentTrack.album.name}
                    className="w-16 h-16 rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{currentTrack.name}</h3>
                  <p className="text-gray-400 truncate">
                    {currentTrack.artists.map(artist => artist.name).join(', ')}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={handlePlayPause}
                disabled={!playerReady}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold ${
                  !playerReady
                    ? 'bg-gray-500 cursor-not-allowed'
                    : isPlaying 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white transition-colors`}
              >
                {!playerReady ? '...' : isPlaying ? '⏸' : '▶'}
              </button>

              {/* Visual Type Selector */}
              <select
                value={visualType}
                onChange={(e) => setVisualType(e.target.value)}
                className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
              >
                <option value="bars">Audio Bars</option>
                <option value="spirals">Spirals</option>
                <option value="waveform">Waveform</option>
                <option value="3d">3D Trippy</option>
              </select>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <span className="text-white text-sm">🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-white text-sm w-10">{volume}%</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #1db954;
          cursor: pointer;
          box-shadow: 0 0 2px 0 #555;
          transition: background .15s ease-in-out;
        }
        
        .slider::-webkit-slider-thumb:hover {
          background: #1ed760;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #1db954;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px 0 #555;
        }
      `}</style>
    </div>
  );
};

export default Visualizer;
