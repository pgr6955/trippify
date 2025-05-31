// src/App.jsx
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { loginWithSpotify, exchangeCodeForToken, getPlaylists, getPlaylistTracks, likeTrack, getRecommendations, searchTracks } from './utils/spotify';

const LazyVisualizer = lazy(() => import('./components/Visualizer'));

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
  const [currentView, setCurrentView] = useState('playlists'); // 'playlists', 'tracks', 'search'

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
          
          // Clean up URL
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

  const handleLike = async (trackId) => {
    try {
      await likeTrack(token, trackId);
      alert('Liked!');
    } catch (err) {
      console.error('❌ Failed to like track:', err);
      alert('Failed to like track');
    }
  };

  const handleRadio = async (trackId) => {
    try {
      const recs = await getRecommendations(token, trackId);
      if (recs.tracks && recs.tracks.length > 0) {
        window.open(recs.tracks[0].external_urls.spotify, '_blank');
      } else {
        alert('No recommendations found');
      }
    } catch (err) {
      console.error('❌ Failed to get recommendations:', err);
      alert('Failed to get recommendations');
    }
  };

  const visualOptions = [
    { value: 'bars', label: 'Audio Bars' },
    { value: 'spirals', label: 'Spirals' },
    { value: 'waveform', label: 'Waveform' },
    { value: '3d', label: '3D Trippy Mode' }
  ];

  if (loading) {
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
        <>
          <div className="text-green-400 mb-4">✅ Connected to Spotify!</div>
          
          {/* Navigation and Search */}
          <div className="w-full max-w-4xl flex flex-col sm:flex-row gap-4 mb-6">
            <button 
              onClick={fetchPlaylists} 
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition-colors"
              disabled={loading}
            >
              {loading && currentView === 'playlists' ? 'Loading...' : 'My Playlists'}
            </button>
            
            {/* Search Form */}
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
                {loading && currentView === 'search' ? 'Searching...' : '🔍 Search'}
              </button>
            </form>
          </div>
          
          {/* Visual Type Selector */}
          <div className="mb-6">
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

          {/* Content based on current view */}
          {currentView === 'playlists' && (
            /* Playlists View */
            <div className="w-full max-w-4xl">
              <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map(playlist => (
                  <div key={playlist.id} className="bg-gray-800 p-4 rounded hover:bg-gray-700 transition-colors">
                    {playlist.images && playlist.images[0] && (
                      <img 
                        src={playlist.images[0].url} 
                        alt={playlist.name}
                        className="w-full h-40 object-cover rounded mb-3"
                      />
                    )}
                    <h3 className="text-lg font-semibold mb-2">{playlist.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{playlist.tracks?.total || 0} tracks</p>
                    <div className="flex gap-2">
                      <button
                        className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm transition-colors"
                        onClick={() => {
                          fetchPlaylistTracks(playlist.id, playlist.name);
                          setCurrentView('tracks');
                        }}
                      >
                        View Tracks
                      </button>
                      <a
                        href={playlist.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Open in Spotify
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'tracks' && selectedPlaylist && (
            /* Playlist Tracks View */
            <div className="w-full max-w-6xl">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={goBackToPlaylists}
                  className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded transition-colors"
                >
                  ← Back to Playlists
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
                          className="w-12 h-12 rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{track.name}</h4>
                        <p className="text-gray-400 text-sm truncate">
                          {track.artists?.map(artist => artist.name).join(', ')} • {track.album?.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => setSelectedTrack({ 
                            id: track.id, 
                            uri: track.uri, 
                            name: track.name,
                            artists: track.artists 
                          })}
                          disabled={!sdkReady}
                        >
                          {sdkReady ? 'Visualize' : 'Loading...'}
                        </button>
                        <a
                          href={track.external_urls?.spotify}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm transition-colors"
                        >
                          Play in Spotify
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentView === 'search' && (
            /* Search Results View */
            <div className="w-full max-w-6xl">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={goBackToPlaylists}
                  className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded transition-colors"
                >
                  ← Back to Playlists
                </button>
                <h2 className="text-2xl font-bold">Search Results for "{searchQuery}"</h2>
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
                        className="w-12 h-12 rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{track.name}</h4>
                      <p className="text-gray-400 text-sm truncate">
                        {track.artists?.map(artist => artist.name).join(', ')} • {track.album?.name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {track.popularity}% popularity • {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors"
                        onClick={() => setSelectedTrack({ 
                          id: track.id, 
                          uri: track.uri, 
                          name: track.name,
                          artists: track.artists 
                        })}
                        disabled={!sdkReady}
                      >
                        {sdkReady ? 'Visualize' : 'Loading...'}
                      </button>
                      <a
                        href={track.external_urls?.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Play in Spotify
                      </a>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-400">
                    No results found. Try a different search term.
                  </div>
                )}
              </div>
            </div>
          )}          src={track.album.images[0].url} 
                          alt={track.album.name}
                          className="w-12 h-12 rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{track.name}</h4>
                        <p className="text-gray-400 text-sm truncate">
                          {track.artists?.map(artist => artist.name).join(', ')} • {track.album?.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => setSelectedTrack({ 
                            id: track.id, 
                            uri: track.uri, 
                            name: track.name,
                            artists: track.artists 
                          })}
                          disabled={!sdkReady}
                        >
                          {sdkReady ? 'Visualize' : 'Loading...'}
                        </button>
                        <a
                          href={track.external_urls?.spotify}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-sm transition-colors"
                        >
                          Play in Spotify
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {selectedTrack && sdkReady && (
            <div className="mt-6 w-full">
              <Suspense fallback={<div>Loading Visualizer...</div>}>
                <LazyVisualizer 
                  trackId={selectedTrack.id} 
                  trackUri={selectedTrack.uri}
                  visualType={visualType} 
                  token={token} 
                />
              </Suspense>
              <div className="flex gap-4 mt-2 justify-center">
                <button 
                  onClick={() => handleLike(selectedTrack.id)} 
                  className="bg-pink-500 hover:bg-pink-600 px-4 py-1 rounded transition-colors"
                >
                  Like
                </button>
                <button 
                  onClick={() => handleRadio(selectedTrack.id)} 
                  className="bg-yellow-500 hover:bg-yellow-600 px-4 py-1 rounded transition-colors"
                >
                  Start Radio
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
