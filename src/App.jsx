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
            <div className="w-full max-w-4xl">
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
            <div className="w-full max-w-7xl">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={goBackToPlaylists}
                  className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded transition-colors"
                >
                  ← Back to Playlists
                </button>
                <h2 className="text-2xl font-bold">{selectedPlaylist.name}</h2>
              </div>
              
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-3 w-12">#</th>
                      <th className="text-left p-3 w-16">Cover</th>
                      <th className="text-left p-3">Title</th>
                      <th className="text-left p-3">Artist</th>
                      <th className="text-left p-3">Album</th>
                      <th className="text-left p-3 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playlistTracks.map((item, index) => {
                      const track = item.track;
                      if (!track) return null;
                      
                      return (
                        <tr 
                          key={track.id || index} 
                          className="border-t border-gray-700 hover:bg-gray-750 transition-colors"
                        >
                          <td className="p-3 text-gray-400">{index + 1}</td>
                          <td className="p-3">
                            {track.album?.images && track.album.images[0] && (
                              <img 
                                src={track.album.images[0].url} 
                                alt={track.album.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-white truncate max-w-xs">
                              {track.name}
                            </div>
                          </td>
                          <td className="p-3 text-gray-300 truncate max-w-xs">
                            {track.artists?.map(artist => artist.name).join(', ')}
                          </td>
                          <td className="p-3 text-gray-400 truncate max-w-xs">
                            {track.album?.name}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button
                                className="bg-purple-500 hover:bg-purple-600 px-2 py-1 rounded text-xs transition-colors"
                                onClick={() => {
                                  console.log('🎨 Visualize button clicked for track:', track.name);
                                  setSelectedTrack({ 
                                    id: track.id, 
                                    uri: track.uri, 
                                    name: track.name,
                                    artists: track.artists 
                                  });
                                  console.log('🎨 Selected track set:', { 
                                    id: track.id, 
                                    uri: track.uri, 
                                    name: track.name,
                                    artists: track.artists 
                                  });
                                }}
                                disabled={!sdkReady}
                                title="Visualize"
                              >
                                🎨
                              </button>
                              <a
                                href={track.external_urls?.spotify}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs transition-colors"
                                title="Play in Spotify"
                              >
                                ▶️
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentView === 'search' && (
            <div className="w-full max-w-7xl">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={goBackToPlaylists}
                  className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded transition-colors"
                >
                  ← Back to Playlists
                </button>
                <h2 className="text-2xl font-bold">Search Results for "{searchQuery}"</h2>
              </div>
              
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-3 w-12">#</th>
                      <th className="text-left p-3 w-16">Cover</th>
                      <th className="text-left p-3">Title</th>
                      <th className="text-left p-3">Artist</th>
                      <th className="text-left p-3">Album</th>
                      <th className="text-left p-3 w-20">Duration</th>
                      <th className="text-left p-3 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((track, index) => (
                      <tr 
                        key={track.id || index} 
                        className="border-t border-gray-700 hover:bg-gray-750 transition-colors"
                      >
                        <td className="p-3 text-gray-400">{index + 1}</td>
                        <td className="p-3">
                          {track.album?.images && track.album.images[0] && (
                            <img 
                              src={track.album.images[0].url} 
                              alt={track.album.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white truncate max-w-xs">
                            {track.name}
                          </div>
                        </td>
                        <td className="p-3 text-gray-300 truncate max-w-xs">
                          {track.artists?.map(artist => artist.name).join(', ')}
                        </td>
                        <td className="p-3 text-gray-400 truncate max-w-xs">
                          {track.album?.name}
                        </td>
                        <td className="p-3 text-gray-400 text-sm">
                          {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              className="bg-purple-500 hover:bg-purple-600 px-2 py-1 rounded text-xs transition-colors"
                              onClick={() => {
                                console.log('🎨 Search Visualize button clicked for track:', track.name);
                                setSelectedTrack({ 
                                  id: track.id, 
                                  uri: track.uri, 
                                  name: track.name,
                                  artists: track.artists 
                                });
                                console.log('🎨 Search Selected track set:', { 
                                  id: track.id, 
                                  uri: track.uri, 
                                  name: track.name,
                                  artists: track.artists 
                                });
                              }}
                              disabled={!sdkReady}
                              title="Visualize"
                            >
                              🎨
                            </button>
                            <a
                              href={track.external_urls?.spotify}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs transition-colors"
                              title="Play in Spotify"
                            >
                              ▶️
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {searchResults.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-400">
                    No results found. Try a different search term.
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Debug Info */}
          {selectedTrack && (
            <div className="fixed top-4 right-4 bg-blue-900 p-3 rounded text-sm z-50">
              <div className="text-white font-bold">Debug:</div>
              <div className="text-blue-200">
                <div>SDK Ready: {sdkReady ? '✅' : '❌'}</div>
                <div>Selected Track: {selectedTrack.name}</div>
                <div>Track URI: {selectedTrack.uri}</div>
                <div>Should Show Visualizer: {selectedTrack && sdkReady ? '✅' : '❌'}</div>
              </div>
            </div>
          )}
          
          {selectedTrack && sdkReady && (
            <LazyVisualizer 
              trackId={selectedTrack.id} 
              trackUri={selectedTrack.uri}
              visualType={visualType} 
              token={token} 
              onClose={() => {
                console.log('🎨 Closing visualizer');
                setSelectedTrack(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
