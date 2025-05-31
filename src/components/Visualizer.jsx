// src/components/Visualizer.jsx
import React, { useEffect, useRef, useState } from 'react';
import { initializePlayer, playTrack, pausePlayback, resumePlayback, setVolume } from '../utils/spotify';

const Visualizer = ({ trackId, trackUri, visualType, token }) => {
  console.log('🎵 Visualizer component props:', { trackId, trackUri, visualType, token: !!token });
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
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
    
    // Setup audio context for visualization if not already done
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        console.log('✅ Audio context created');
      } catch (err) {
        console.error('❌ Failed to create audio context:', err);
        return;
      }
    }

    if (!analyserRef.current || !canvasRef.current) {
      console.error('❌ Missing analyzer or canvas');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    console.log('🎨 Visualization setup complete, starting animation loop');

    const draw = () => {
      if (!isPlaying) {
        console.log('🎨 Not playing, stopping animation');
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      
      // Create some fake data for now since we can't access Spotify's audio stream directly
      for (let i = 0; i < dataArray.length; i++) {
        dataArray[i] = Math.random() * 255;
      }
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
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
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded">
        <div className="text-white">
          <div>Loading Spotify Player...</div>
          <div className="text-sm text-gray-400 mt-2">
            Make sure you have Spotify Premium and the Web Playback SDK is enabled
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-900 rounded p-4">
        <div className="text-white text-center">
          <div className="font-bold mb-2">Error: {error}</div>
          <div className="text-sm text-red-200">
            Common issues:
            <ul className="list-disc list-inside mt-2 text-left">
              <li>Spotify Premium required for Web Playback</li>
              <li>Make sure no other Spotify instances are playing</li>
              <li>Try refreshing the page</li>
              <li>Check browser console for more details</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black p-4 rounded">
      {/* Debug Info */}
      <div className="mb-4 p-3 bg-gray-800 rounded text-sm">
        <div className="text-white font-bold mb-2">Debug Info:</div>
        <div className="text-gray-300">
          <div>Player Ready: {playerReady ? '✅' : '❌'}</div>
          <div>Device ID: {deviceIdRef.current || 'Not set'}</div>
          <div>Track URI: {trackUri || 'Not provided'}</div>
          <div>SDK Available: {window.Spotify ? '✅' : '❌'}</div>
          <div>Is Playing: {isPlaying ? '✅' : '❌'}</div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="text-white flex-1 min-w-0">
          {currentTrack ? (
            <div>
              <h3 className="font-bold truncate">{currentTrack.name}</h3>
              <p className="text-gray-400 truncate">
                {currentTrack.artists.map(artist => artist.name).join(', ')}
              </p>
            </div>
          ) : (
            <div>
              <h3 className="font-bold">Ready to play</h3>
              <p className="text-gray-400">Click play to start music</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Volume Control */}
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm">🔊</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-sm w-8">{volume}%</span>
          </div>
          
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            disabled={!playerReady}
            className={`px-6 py-2 rounded font-semibold ${
              !playerReady
                ? 'bg-gray-500 cursor-not-allowed'
                : isPlaying 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-green-500 hover:bg-green-600'
            } text-white transition-colors`}
          >
            {!playerReady ? 'Loading...' : isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full h-96 bg-black border border-gray-700 rounded"
      />
      
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
