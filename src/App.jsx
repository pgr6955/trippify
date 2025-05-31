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

  // Load Spotify Web Playback SDK
  useEffect(() => {
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

  const visualOptions = [
    { value: 'bars', label: 'Audio Bars' },
    { value: 'spirals', label: 'Spirals' },
    { value: 'waveform', label: 'Waveform' },
    { value: '3d', label: '3D Trippy Mode' }
  ];

  // Simple Visualizer Component with Spotify Integration
  const SimpleVisualizer = ({ trackUri, visualType, token, onClose }) => {
    const canvasRef = React.useRef(null);
    const animationRef = React.useRef(null);
    const playerRef = React.useRef(null);
    const deviceIdRef = React.useRef(null);
    
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [playerReady, setPlayerReady] = React.useState(false);
    const [currentTrack, setCurrentTrack] = React.useState(null);
    const [volume, setVolumeState] = React.useState(50);
    const [playerError, setPlayerError] = React.useState(null);
    
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
      };
    }, [token]);
    
    // Animation
    React.useEffect(() => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      let time = 0;

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barCount = 64;
        const barWidth = canvas.width / barCount;
        
        for (let i = 0; i < barCount; i++) {
          // Make animation more reactive when playing
          const speed = isPlaying ? 0.05 : 0.01;
          const intensity = isPlaying ? 150 : 50;
          
          const height = Math.sin(time * speed + i * 0.3) * intensity + 100;
          const hue = (i * 5 + time) % 360;
          
          ctx.fillStyle = `hsl(${hue}, 100%, ${isPlaying ? 50 : 30}%)`;
          ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 1, height);
        }
        
        time += 1;
      };

      animate();
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isPlaying]);

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

              {/* Visual Type */}
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
              {playerReady ? (
                trackUri ? 'Ready to play' : 'No track selected'
              ) : (
                'Connecting to Spotify...'
              )}
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
