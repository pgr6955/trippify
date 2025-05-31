// src/components/Visualizer.jsx
import React, { useEffect, useRef, useState } from 'react';
import { initializePlayer, playTrack, pausePlayback, resumePlayback } from '../utils/spotify';

const Visualizer = ({ trackId, trackUri, visualType, token }) => {
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

  useEffect(() => {
    let mounted = true;

    const setupPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize Spotify Player
        const { player, device_id } = await initializePlayer(
          token,
          (deviceId) => {
            console.log('Player ready with device ID:', deviceId);
            deviceIdRef.current = deviceId;
          },
          (state) => {
            if (!mounted) return;
            
            if (state) {
              setIsPlaying(!state.paused);
              setCurrentTrack(state.track_window.current_track);
            }
          }
        );

        if (!mounted) return;

        playerRef.current = player;
        
        // Setup audio context for visualization
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to setup player:', err);
        if (mounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    setupPlayer();

    return () => {
      mounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [token]);

  const handlePlayPause = async () => {
    try {
      if (!deviceIdRef.current) {
        throw new Error('Player not ready');
      }

      if (isPlaying) {
        await pausePlayback(token);
      } else {
        if (trackUri) {
          await playTrack(token, deviceIdRef.current, trackUri);
        } else {
          await resumePlayback(token);
        }
        startVisualization();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError(err.message);
    }
  };

  const startVisualization = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) return;

      animationRef.current = requestAnimationFrame(draw);
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
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
        <div className="text-white">Loading Spotify Player...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-900 rounded">
        <div className="text-white">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-black p-4 rounded">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-white">
          {currentTrack && (
            <div>
              <h3 className="font-bold">{currentTrack.name}</h3>
              <p className="text-gray-400">
                {currentTrack.artists.map(artist => artist.name).join(', ')}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={handlePlayPause}
          className={`px-6 py-2 rounded font-semibold ${
            isPlaying 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          } text-white transition-colors`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full h-96 bg-black border border-gray-700 rounded"
      />
    </div>
  );
};

export default Visualizer;
