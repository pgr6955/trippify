// src/App.jsx
import React, { useEffect, useState } from 'react';
import { loginWithSpotify, exchangeCodeForToken, getPlaylists, getPlaylistTracks, likeTrack, getRecommendations, searchTracks } from './utils/spotify';

function App() {
  const [token, setToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [visualType, setVisualType] = useState('bars');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentView, setCurrentView] = useState('playlists');
  
  // Audio visualization states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolumeState] = useState(50);
  const [audioAnalysisEnabled, setAudioAnalysisEnabled] = useState(false);
  const [micPermission, setMicPermission] = useState('prompt');
  
  // Refs for audio and player
  const playerRef = React.useRef(null);
  const deviceIdRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const micStreamRef = React.useRef(null);

  // Load Spotify Web Playback SDK
  // Initialize Spotify Player (moved to main component)
  useEffect(() => {
    if (!token) return;
    
    const setupPlayer = async () => {
      try {
        console.log('🎵 Setting up Spotify player...');
        
        if (!window.Spotify) {
          console.log('Spotify SDK not ready yet...');
          return;
        }

        const { initializePlayer } = await import('./utils/spotify');
        
        const { player, device_id } = await initializePlayer(
          token,
          (deviceId) => {
            console.log('✅ Player ready with device ID:', deviceId);
            deviceIdRef.current = deviceId;
            setPlayerReady(true);
          },
          (state) => {
            console.log('🎵 Player state changed:', state);
            if (state) {
              setIsPlaying(!state.paused);
              setCurrentTrack(state.track_window.current_track);
            }
          }
        );

        playerRef.current = player;
        
      } catch (err) {
        console.error('❌ Failed to setup player:', err);
      }
    };

    // Wait a bit for SDK to be ready
    const timer = setTimeout(setupPlayer, 1000);
    
    return () => {
      clearTimeout(timer);
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [token, sdkReady]);

  // Setup Real Audio Analysis
  const setupAudioAnalysis = async () => {
    try {
      console.log('🎤 Setting up real audio analysis...');
      setMicPermission('requesting');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      micStreamRef.current = stream;
      setMicPermission('granted');
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      setAudioAnalysisEnabled(true);
      console.log('✅ Real audio analysis enabled!');
      
    } catch (err) {
      console.error('❌ Microphone access denied:', err);
      setMicPermission('denied');
    }
  };

  const handlePlayPause = async () => {
    try {
      if (!playerReady || !deviceIdRef.current) {
        console.log('Player not ready');
        return;
      }

      const { playTrack, pausePlayback, resumePlayback } = await import('./utils/spotify');

      if (isPlaying) {
        await pausePlayback(token);
      } else {
        if (selectedTrack) {
          await playTrack(token, deviceIdRef.current, selectedTrack.uri);
        } else {
          await resumePlayback(token);
        }
      }
    } catch (err) {
      console.error('❌ Playback error:', err);
    }
  };

  const handleVolumeChange = async (newVolume) => {
    try {
      setVolumeState(newVolume);
      if (playerRef.current) {
        await playerRef.current.setVolume(newVolume / 100);
      }
      
      const { setVolume } = await import('./utils/spotify');
      await setVolume(token, newVolume);
    } catch (err) {
      console.error('Volume change error:', err);
    }
  };
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('✅ Spotify Web Playback SDK is ready');
      setSdkReady(true);
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('❌ Spotify auth error:', error);
        setError(`Authentication failed: ${error}`);
        return;
      }
      
      if (code) {
        console.log('✅ Got authorization code, exchanging for token...');
        setLoading(true);
        
        try {
          const accessToken = await exchangeCodeForToken(code);
          console.log('✅ Got access token!');
          setToken(accessToken);
          
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('❌ Token exchange failed:', err);
          setError('Failed to get access token');
        } finally {
          setLoading(false);
        }
      }
    };

    handleCallback();
  }, []);

  const handleLogin = () => {
    setError(null);
    loginWithSpotify();
  };

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const data = await getPlaylists(token);
      setPlaylists(data.items);
      setCurrentView('playlists');
    } catch (err) {
      console.error('❌ Failed to fetch playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistTracks = async (playlistId, playlistName) => {
    try {
      setLoading(true);
      const data = await getPlaylistTracks(token, playlistId);
      setPlaylistTracks(data.items);
      setSelectedPlaylist({ id: playlistId, name: playlistName });
    } catch (err) {
      console.error('❌ Failed to fetch playlist tracks:', err);
      setError('Failed to load playlist tracks');
    } finally {
      setLoading(false);
    }
  };

  const goBackToPlaylists = () => {
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
    setSelectedTrack(null);
    setCurrentView('playlists');
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const results = await searchTracks(token, searchQuery.trim());
      setSearchResults(results.tracks.items);
      setCurrentView('search');
    } catch (err) {
      console.error('❌ Search failed:', err);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Background Visualization Component
  const BackgroundVisualizer = () => {
    const canvasRef = React.useRef(null);
    const animationRef = React.useRef(null);
    
    React.useEffect(() => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to full screen
      const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      let time = 0;

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        
        // Semi-transparent overlay for subtle background effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let dataArray;
        
        if (audioAnalysisEnabled && analyserRef.current) {
          // Real audio analysis
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
        } else {
          // Simulated audio data
          const bufferLength = 64; // Lower for background
          dataArray = new Uint8Array(bufferLength);
          
          if (isPlaying) {
            for (let i = 0; i < bufferLength; i++) {
              const frequency = i / bufferLength;
              const bassBoost = frequency < 0.1 ? 2 : 1;
              const midBoost = frequency > 0.1 && frequency < 0.6 ? 1.3 : 1;
              
              dataArray[i] = Math.max(0, Math.min(255, 
                (Math.sin(time * 0.02 + i * 0.2) * 40 + 60) * bassBoost * midBoost +
                Math.random() * 20
              ));
            }
          } else {
            for (let i = 0; i < bufferLength; i++) {
              dataArray[i] = Math.sin(time * 0.003 + i * 0.1) * 15 + 25;
            }
          }
        }
        
        time += 1;
        
        // Draw subtle background visualization
        switch (visualType) {
          case 'bars':
            drawBackgroundBars(ctx, dataArray, canvas.width, canvas.height);
            break;
          case 'spirals':
            drawBackgroundSpirals(ctx, dataArray, canvas.width, canvas.height);
            break;
          case 'waveform':
            drawBackgroundWaveform(ctx, dataArray, canvas.width, canvas.height);
            break;
          case '3d':
            drawBackground3D(ctx, dataArray, canvas.width, canvas.height);
            break;
          default:
            drawBackgroundBars(ctx, dataArray, canvas.width, canvas.height);
        }
      };

      const drawBackgroundBars = (ctx, dataArray, width, height) => {
        const barWidth = width / dataArray.length;
        
        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.3; // Subtle height
          const opacity = isPlaying ? 0.15 : 0.05;
          
          const hue = (i / dataArray.length) * 360;
          ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${opacity})`;
          ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
        }
      };

      const drawBackgroundSpirals = (ctx, dataArray, width, height) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const opacity = isPlaying ? 0.2 : 0.08;
        
        ctx.strokeStyle = `rgba(0, 255, 136, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < dataArray.length; i++) {
          const angle = (i / dataArray.length) * Math.PI * 3;
          const radius = (dataArray[i] / 255) * Math.min(width, height) * 0.2;
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

      const drawBackgroundWaveform = (ctx, dataArray, width, height) => {
        const opacity = isPlaying ? 0.15 : 0.06;
        
        ctx.strokeStyle = `rgba(255, 0, 128, ${opacity})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const sliceWidth = width / dataArray.length;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] / 255) * 2 - 1;
          const y = (v * height * 0.1) + height / 2;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          x += sliceWidth;
        }
        
        ctx.stroke();
      };

      const drawBackground3D = (ctx, dataArray, width, height) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const opacity = isPlaying ? 0.1 : 0.04;
        
        for (let i = 0; i < dataArray.length; i++) {
          const angle = (i / dataArray.length) * Math.PI * 2;
          const radius = (dataArray[i] / 255) * Math.min(width, height) * 0.15;
          
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          
          const hue = (i / dataArray.length) * 360 + time;
          ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${opacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
      };

      animate();
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isPlaying, visualType, audioAnalysisEnabled]);

    return (
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ mixBlendMode: 'screen' }}
      />
    );
  };

  // Floating Music Controls
  const MusicControls = () => {
    if (!token || !selectedTrack) return null;

    return (
      <div className="fixed bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md border border-gray-700 rounded-lg p-4 z-40">
        <div className="max-w-6xl mx-auto">
          {/* Track Info */}
          <div className="flex items-center gap-4 mb-3">
            {currentTrack?.album?.images?.[0] && (
              <img 
                src={currentTrack.album.images[0].url} 
                alt={currentTrack.album.name}
                className="w-12 h-12 rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate">
                {currentTrack?.name || selectedTrack.name}
              </h3>
              <p className="text-gray-400 text-sm truncate">
                {currentTrack?.artists?.map(artist => artist.name).join(', ') ||
                 selectedTrack.artists?.map(artist => artist.name).join(', ')}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                disabled={!playerReady}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  !playerReady
                    ? 'bg-gray-500 cursor-not-allowed'
                    : isPlaying 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white transition-colors`}
              >
                {!playerReady ? '...' : isPlaying ? '⏸' : '▶'}
              </button>

              {/* Real Audio Toggle */}
              {!audioAnalysisEnabled && (
                <button
                  onClick={setupAudioAnalysis}
                  disabled={micPermission === 'requesting'}
                  className={`px-3 py-1 rounded text-xs ${
                    micPermission === 'denied' 
                      ? 'bg-red-600 cursor-not-allowed' 
                      : micPermission === 'requesting'
                      ? 'bg-yellow-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors`}
                >
                  {micPermission === 'requesting' ? 'Requesting...' : 
                   micPermission === 'denied' ? 'Mic Denied' : 
                   '🎤 Real Audio'}
                </button>
              )}

              {/* Visual Type */}
              <select
                value={visualType}
                onChange={(e) => setVisualType(e.target.value)}
                className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm"
              >
                <option value="bars">Bars</option>
                <option value="spirals">Spirals</option>
                <option value="waveform">Waveform</option>
                <option value="3d">3D</option>
              </select>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-white text-xs w-8">{volume}%</span>
            </div>
          </div>

          {/* Status */}
          <div className="mt-2 text-center">
            <p className="text-gray-400 text-xs">
              {audioAnalysisEnabled ? (
                <span className="text-green-400">🎤 Real Audio Active</span>
              ) : (
                <span className="text-yellow-400">🤖 Simulated Audio</span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  };
    { value: 'bars', label: 'Audio Bars' },
    { value: 'spirals', label: 'Spirals' },
    { value: 'waveform', label: 'Waveform' },
    { value: '3d', label: '3D Trippy Mode' }
  ];

  const visualOptions = [
    { value: 'bars', label: 'Audio Bars' },
    { value: 'spirals', label: 'Spirals' },
    { value: 'waveform', label: 'Waveform' },
    { value: '3d', label: '3D Trippy Mode' }
  ];

  if (loading && !token) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Background Visualization */}
      {token && <BackgroundVisualizer />}
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center p-4 min-h-screen">
        <h1 className="text-3xl font-bold mb-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded">
          Trippy Spotify Visualizer
        </h1>
        
        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4 max-w-md text-center">
            {error}
          </div>
        )}
        
        {!token ? (
          <button 
            onClick={handleLogin} 
            className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Login with Spotify
          </button>
        ) : (
          <div className="w-full max-w-6xl bg-black/70 backdrop-blur-sm rounded-lg p-4">
            <div className="text-green-400 mb-4 text-center">✅ Connected to Spotify!</div>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button 
                onClick={fetchPlaylists} 
                className="bg-blue-500/80 backdrop-blur-sm hover:bg-blue-600 px-4 py-2 rounded transition-colors"
                disabled={loading}
              >
                {loading && currentView === 'playlists' ? 'Loading...' : 'My Playlists'}
              </button>
              
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Search for songs, artists, albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800/80 backdrop-blur-sm text-white rounded border border-gray-600 focus:border-green-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="bg-green-500/80 backdrop-blur-sm hover:bg-green-600 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
                >
                  🔍 Search
                </button>
              </form>
            </div>
            
            <div className="mb-6 text-center">
              <label className="mr-2 text-white">Background Visual:</label>
              <select
                className="text-black p-2 rounded bg-white/90"
                value={visualType}
                onChange={(e) => setVisualType(e.target.value)}
              >
                {visualOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {currentView === 'playlists' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map(playlist => (
                    <div key={playlist.id} className="bg-gray-800/80 backdrop-blur-sm p-4 rounded hover:bg-gray-700/80 transition-colors">
                      {playlist.images && playlist.images[0] && (
                        <img 
                          src={playlist.images[0].url} 
                          alt={playlist.name}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <h3 className="text-lg font-semibold mb-2 truncate">{playlist.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">{playlist.tracks?.total || 0} tracks</p>
                      <button
                        className="bg-green-500/80 backdrop-blur-sm hover:bg-green-600 px-3 py-1 rounded text-sm transition-colors w-full"
                        onClick={() => {
                          fetchPlaylistTracks(playlist.id, playlist.name);
                          setCurrentView('tracks');
                        }}
                      >
                        View Tracks
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === 'tracks' && selectedPlaylist && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={goBackToPlaylists}
                    className="bg-gray-600/80 backdrop-blur-sm hover:bg-gray-500 px-3 py-2 rounded transition-colors"
                  >
                    ← Back
                  </button>
                  <h2 className="text-2xl font-bold">{selectedPlaylist.name}</h2>
                </div>
                
                <div className="space-y-2">
                  {playlistTracks.map((item, index) => {
                    const track = item.track;
                    if (!track) return null;
                    
                    return (
                      <div 
                        key={track.id || index} 
                        className="bg-gray-800/80 backdrop-blur-sm p-3 rounded flex items-center gap-4 hover:bg-gray-700/80 transition-colors"
                      >
                        {track.album?.images && track.album.images[0] && (
                          <img 
                            src={track.album.images[0].url} 
                            alt={track.album.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{track.name}</h4>
                          <p className="text-gray-400 text-sm truncate">
                            {track.artists?.map(artist => artist.name).join(', ')}
                          </p>
                        </div>
                        <button
                          className="bg-purple-500/80 backdrop-blur-sm hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => {
                            console.log('🎨 Visualize clicked for:', track.name);
                            setSelectedTrack({ 
                              id: track.id, 
                              uri: track.uri, 
                              name: track.name,
                              artists: track.artists 
                            });
                          }}
                        >
                          🎵 Play
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentView === 'search' && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={goBackToPlaylists}
                    className="bg-gray-600/80 backdrop-blur-sm hover:bg-gray-500 px-3 py-2 rounded transition-colors"
                  >
                    ← Back
                  </button>
                  <h2 className="text-2xl font-bold">Search Results</h2>
                </div>
                
                <div className="space-y-2">
                  {searchResults.map((track, index) => (
                    <div 
                      key={track.id || index} 
                      className="bg-gray-800/80 backdrop-blur-sm p-3 rounded flex items-center gap-4 hover:bg-gray-700/80 transition-colors"
                    >
                      {track.album?.images && track.album.images[0] && (
                        <img 
                          src={track.album.images[0].url} 
                          alt={track.album.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{track.name}</h4>
                        <p className="text-gray-400 text-sm truncate">
                          {track.artists?.map(artist => artist.name).join(', ')}
                        </p>
                      </div>
                      <button
                        className="bg-purple-500/80 backdrop-blur-sm hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors"
                        onClick={() => {
                          console.log('🎨 Search Visualize clicked for:', track.name);
                          setSelectedTrack({ 
                            id: track.id, 
                            uri: track.uri, 
                            name: track.name,
                            artists: track.artists 
                          });
                        }}
                      >
                        🎵 Play
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Floating Music Controls */}
      <MusicControls />
    </div>
  );
    const canvasRef = React.useRef(null);
    const animationRef = React.useRef(null);
    const playerRef = React.useRef(null);
    const deviceIdRef = React.useRef(null);
    const audioContextRef = React.useRef(null);
    const analyserRef = React.useRef(null);
    const micStreamRef = React.useRef(null);
    
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [playerReady, setPlayerReady] = React.useState(false);
    const [currentTrack, setCurrentTrack] = React.useState(null);
    const [volume, setVolumeState] = React.useState(50);
    const [playerError, setPlayerError] = React.useState(null);
    const [audioAnalysisEnabled, setAudioAnalysisEnabled] = React.useState(false);
    const [micPermission, setMicPermission] = React.useState('prompt'); // 'prompt', 'granted', 'denied'
    
    // Initialize Spotify Player
    React.useEffect(() => {
      const setupPlayer = async () => {
        try {
          console.log('🎵 Setting up Spotify player...');
          
          if (!window.Spotify) {
            throw new Error('Spotify Web Playback SDK not loaded');
          }

          const { initializePlayer, playTrack, pausePlayback, resumePlayback, setVolume } = await import('./utils/spotify');
          
          const { player, device_id } = await initializePlayer(
            token,
            (deviceId) => {
              console.log('✅ Player ready with device ID:', deviceId);
              deviceIdRef.current = deviceId;
              setPlayerReady(true);
              setIsLoading(false);
            },
            (state) => {
              console.log('🎵 Player state changed:', state);
              if (state) {
                setIsPlaying(!state.paused);
                setCurrentTrack(state.track_window.current_track);
              }
            }
          );

          playerRef.current = player;
          
        } catch (err) {
          console.error('❌ Failed to setup player:', err);
          setPlayerError(err.message);
          setIsLoading(false);
        }
      };

      setupPlayer();
      
      return () => {
        if (playerRef.current) {
          playerRef.current.disconnect();
        }
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }, [token]);

    // Setup Real Audio Analysis
    const setupAudioAnalysis = async () => {
      try {
        console.log('🎤 Setting up real audio analysis...');
        setMicPermission('requesting');
        
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } 
        });
        
        micStreamRef.current = stream;
        setMicPermission('granted');
        
        // Create audio context and analyzer
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        
        // Configure analyzer for better visualization
        analyserRef.current.fftSize = 512; // Higher resolution
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        // Connect microphone to analyzer
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        setAudioAnalysisEnabled(true);
        console.log('✅ Real audio analysis enabled!');
        
      } catch (err) {
        console.error('❌ Microphone access denied:', err);
        setMicPermission('denied');
        setPlayerError('Microphone access required for real audio visualization');
      }
    };
    
    // Animation with Real or Simulated Audio
    React.useEffect(() => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      let time = 0;

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        
        // Clear canvas with fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let dataArray;
        
        if (audioAnalysisEnabled && analyserRef.current) {
          // REAL AUDIO ANALYSIS
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Add visual indicator that real analysis is active
          ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
          ctx.fillRect(canvas.width - 100, 10, 90, 20);
          ctx.fillStyle = '#00ff00';
          ctx.font = '12px Arial';
          ctx.fillText('🎤 LIVE AUDIO', canvas.width - 95, 25);
          
        } else {
          // SIMULATED AUDIO DATA (fallback)
          const bufferLength = 128;
          dataArray = new Uint8Array(bufferLength);
          
          if (isPlaying) {
            // Simulate realistic audio frequencies when playing
            for (let i = 0; i < bufferLength; i++) {
              const frequency = i / bufferLength;
              const bassBoost = frequency < 0.1 ? 3 : 1;
              const midBoost = frequency > 0.1 && frequency < 0.6 ? 1.5 : 1;
              const trebleBoost = frequency > 0.8 ? 1.2 : 1;
              
              dataArray[i] = Math.max(0, Math.min(255, 
                (Math.sin(time * 0.03 + i * 0.15) * 70 + 90) * bassBoost * midBoost * trebleBoost +
                Math.random() * 50 +
                Math.sin(time * 0.01) * 30
              ));
            }
          } else {
            // Gentle ambient animation when paused
            for (let i = 0; i < bufferLength; i++) {
              dataArray[i] = Math.sin(time * 0.005 + i * 0.1) * 20 + 40;
            }
          }
          
          // Add visual indicator for simulated mode
          ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
          ctx.fillRect(canvas.width - 100, 10, 90, 20);
          ctx.fillStyle = '#ffaa00';
          ctx.font = '12px Arial';
          ctx.fillText('🤖 SIMULATED', canvas.width - 95, 25);
        }
        
        time += 1;
        
        // Draw based on selected visual type
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

      const drawBars = (ctx, dataArray, width, height) => {
        const barWidth = (width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.8;
          
          const r = Math.min(255, barHeight + 25 * (i / dataArray.length));
          const g = Math.min(255, 250 * (i / dataArray.length));
          const b = 50;
          
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
          
          x += barWidth;
        }
      };

      const drawSpirals = (ctx, dataArray, width, height) => {
        const centerX = width / 2;
        const centerY = height / 2;
        
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let i = 0; i < dataArray.length; i++) {
          const angle = (i / dataArray.length) * Math.PI * 4;
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
        
        // Add secondary spiral
        ctx.strokeStyle = '#ff0088';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < dataArray.length; i++) {
          const angle = (i / dataArray.length) * Math.PI * 4 + Math.PI;
          const radius = (dataArray[i] / 255) * 150;
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
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const sliceWidth = width / dataArray.length;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] / 255) * 2 - 1;
          const y = (v * height / 3) + height / 2;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          x += sliceWidth;
        }
        
        ctx.stroke();
        
        // Add harmonic waveform
        ctx.strokeStyle = '#00ff80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        x = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] / 255) * 1.5 - 0.75;
          const y = (v * height / 4) + height / 2 + Math.sin(i * 0.1) * 50;
          
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
          const radius = (dataArray[i] / 255) * 180;
          
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle + 0.2) * radius * 1.3;
          const y2 = centerY + Math.sin(angle + 0.2) * radius * 1.3;
          
          const hue = (i / dataArray.length) * 360 + time * 2;
          const saturation = audioAnalysisEnabled ? 100 : (isPlaying ? 80 : 50);
          const lightness = audioAnalysisEnabled ? 70 : (isPlaying ? 60 : 30);
          
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
          gradient.addColorStop(1, `hsl(${hue + 60}, ${saturation}%, ${lightness - 20}%)`);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      };

      animate();
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isPlaying, visualType, audioAnalysisEnabled]);

    const handlePlayPause = async () => {
      try {
        if (!playerReady || !deviceIdRef.current) {
          throw new Error('Player not ready');
        }

        const { playTrack, pausePlayback, resumePlayback } = await import('./utils/spotify');

        if (isPlaying) {
          console.log('🎵 Pausing...');
          await pausePlayback(token);
        } else {
          if (trackUri) {
            console.log('🎵 Playing track:', trackUri);
            await playTrack(token, deviceIdRef.current, trackUri);
          } else {
            console.log('🎵 Resuming...');
            await resumePlayback(token);
          }
        }
      } catch (err) {
        console.error('❌ Playback error:', err);
        setPlayerError(err.message);
      }
    };

    const handleVolumeChange = async (newVolume) => {
      try {
        setVolumeState(newVolume);
        if (playerRef.current) {
          await playerRef.current.setVolume(newVolume / 100);
        }
        
        const { setVolume } = await import('./utils/spotify');
        await setVolume(token, newVolume);
      } catch (err) {
        console.error('Volume change error:', err);
      }
    };

    if (isLoading) {
      return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-xl mb-2">Loading Spotify Player...</div>
            <div className="text-sm text-gray-400">Make sure you have Spotify Premium</div>
          </div>
        </div>
      );
    }

    if (playerError) {
      return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-white text-center max-w-md p-4">
            <div className="text-xl mb-4 text-red-400">Player Error</div>
            <div className="text-sm mb-4">{playerError}</div>
            <div className="text-xs text-gray-400 mb-4">
              Make sure you have Spotify Premium and no other Spotify instances are playing
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
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-900">
          <h2 className="text-white text-xl">🎵 Music Visualizer</h2>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>

        {/* Main Visualization */}
        <div className="flex-1 flex items-center justify-center p-4">
          <canvas
            ref={canvasRef}
            width={1000}
            height={500}
            className="border border-gray-600 rounded max-w-full max-h-full"
          />
        </div>

        {/* Controls */}
        <div className="bg-gray-900 p-4">
          {/* Track Info */}
          {currentTrack && (
            <div className="flex items-center gap-4 mb-4">
              {currentTrack.album?.images?.[0] && (
                <img 
                  src={currentTrack.album.images[0].url} 
                  alt={currentTrack.album.name}
                  className="w-12 h-12 rounded"
                />
              )}
              <div>
                <h3 className="text-white font-semibold">{currentTrack.name}</h3>
                <p className="text-gray-400 text-sm">
                  {currentTrack.artists.map(artist => artist.name).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                disabled={!playerReady}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                  !playerReady
                    ? 'bg-gray-500 cursor-not-allowed'
                    : isPlaying 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white transition-colors`}
              >
                {!playerReady ? '...' : isPlaying ? '⏸' : '▶'}
              </button>

              {/* Enable Real Audio Analysis */}
              {!audioAnalysisEnabled && (
                <button
                  onClick={setupAudioAnalysis}
                  disabled={micPermission === 'requesting'}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    micPermission === 'denied' 
                      ? 'bg-red-600 cursor-not-allowed' 
                      : micPermission === 'requesting'
                      ? 'bg-yellow-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors`}
                >
                  {micPermission === 'requesting' ? 'Requesting...' : 
                   micPermission === 'denied' ? 'Mic Denied' : 
                   '🎤 Enable Real Audio'}
                </button>
              )}

              {/* Visual Type */}
              <select
                value={visualType}
                onChange={(e) => {
                  console.log('🎨 Changing visual type to:', e.target.value);
                  setVisualType(e.target.value);
                }}
                className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
              >
                <option value="bars">Audio Bars</option>
                <option value="spirals">Spirals</option>
                <option value="waveform">Waveform</option>
                <option value="3d">3D Trippy</option>
              </select>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3">
              <span className="text-white">🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-32"
              />
              <span className="text-white text-sm w-8">{volume}%</span>
            </div>
          </div>

          {/* Status */}
          <div className="mt-2 text-center">
            <p className="text-gray-400 text-sm">
              {audioAnalysisEnabled ? (
                <span className="text-green-400">
                  🎤 Real Audio Analysis Active - Visualizing live sound!
                </span>
              ) : playerReady ? (
                isPlaying ? (
                  <span className="text-yellow-400">
                    🤖 Simulated Audio - Click "Enable Real Audio" for live visualization
                  </span>
                ) : (
                  'Ready to play'
                )
              ) : (
                'Connecting to Spotify...'
              )}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {audioAnalysisEnabled ? 
                'Microphone is analyzing audio from your speakers in real-time' :
                'Real audio requires microphone permission to analyze sound from speakers'
              }
            </p>
          </div>="text-green-400">
                    ♪ Playing - Visualization simulates audio frequencies
                  </span>
                ) : (
                  'Ready to play'
                )
              ) : (
                'Connecting to Spotify...'
              )}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Note: Due to browser security, visualizations use simulated audio data
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !token) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-4">Trippy Spotify Visualizer</h1>
      
      {error && (
        <div className="bg-red-600 text-white p-3 rounded mb-4 max-w-md text-center">
          {error}
        </div>
      )}
      
      {!token ? (
        <button 
          onClick={handleLogin} 
          className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Login with Spotify
        </button>
      ) : (
        <div className="w-full max-w-6xl">
          <div className="text-green-400 mb-4 text-center">✅ Connected to Spotify!</div>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button 
              onClick={fetchPlaylists} 
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition-colors"
              disabled={loading}
            >
              {loading && currentView === 'playlists' ? 'Loading...' : 'My Playlists'}
            </button>
            
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Search for songs, artists, albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-green-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 px-4 py-2 rounded transition-colors"
              >
                🔍 Search
              </button>
            </form>
          </div>
          
          <div className="mb-6 text-center">
            <label className="mr-2 text-white">Choose Visual:</label>
            <select
              className="text-black p-2 rounded"
              value={visualType}
              onChange={(e) => setVisualType(e.target.value)}
            >
              {visualOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {currentView === 'playlists' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map(playlist => (
                  <div key={playlist.id} className="bg-gray-800 p-4 rounded hover:bg-gray-700 transition-colors">
                    {playlist.images && playlist.images[0] && (
                      <img 
                        src={playlist.images[0].url} 
                        alt={playlist.name}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    )}
                    <h3 className="text-lg font-semibold mb-2 truncate">{playlist.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{playlist.tracks?.total || 0} tracks</p>
                    <button
                      className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm transition-colors w-full"
                      onClick={() => {
                        fetchPlaylistTracks(playlist.id, playlist.name);
                        setCurrentView('tracks');
                      }}
                    >
                      View Tracks
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'tracks' && selectedPlaylist && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={goBackToPlaylists}
                  className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded transition-colors"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold">{selectedPlaylist.name}</h2>
              </div>
              
              <div className="space-y-2">
                {playlistTracks.map((item, index) => {
                  const track = item.track;
                  if (!track) return null;
                  
                  return (
                    <div 
                      key={track.id || index} 
                      className="bg-gray-800 p-3 rounded flex items-center gap-4 hover:bg-gray-700 transition-colors"
                    >
                      {track.album?.images && track.album.images[0] && (
                        <img 
                          src={track.album.images[0].url} 
                          alt={track.album.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{track.name}</h4>
                        <p className="text-gray-400 text-sm truncate">
                          {track.artists?.map(artist => artist.name).join(', ')}
                        </p>
                      </div>
                      <button
                        className="bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors"
                        onClick={() => {
                          console.log('🎨 Visualize clicked for:', track.name);
                          setSelectedTrack({ 
                            id: track.id, 
                            uri: track.uri, 
                            name: track.name,
                            artists: track.artists 
                          });
                        }}
                      >
                        🎨 Visualize
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentView === 'search' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={goBackToPlaylists}
                  className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded transition-colors"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold">Search Results</h2>
              </div>
              
              <div className="space-y-2">
                {searchResults.map((track, index) => (
                  <div 
                    key={track.id || index} 
                    className="bg-gray-800 p-3 rounded flex items-center gap-4 hover:bg-gray-700 transition-colors"
                  >
                    {track.album?.images && track.album.images[0] && (
                      <img 
                        src={track.album.images[0].url} 
                        alt={track.album.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{track.name}</h4>
                      <p className="text-gray-400 text-sm truncate">
                        {track.artists?.map(artist => artist.name).join(', ')}
                      </p>
                    </div>
                    <button
                      className="bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors"
                      onClick={() => {
                        console.log('🎨 Search Visualize clicked for:', track.name);
                        setSelectedTrack({ 
                          id: track.id, 
                          uri: track.uri, 
                          name: track.name,
                          artists: track.artists 
                        });
                      }}
                    >
                      🎨 Visualize
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedTrack && (
            <SimpleVisualizer 
              trackUri={selectedTrack.uri}
              visualType={visualType}
              token={token}
              onClose={() => {
                console.log('🎨 Closing visualizer');
                setSelectedTrack(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
