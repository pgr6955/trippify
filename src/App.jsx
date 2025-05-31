// src/App.jsx
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { loginWithSpotify, exchangeCodeForToken, getPlaylists, getPlaylistTracks, likeTrack, getRecommendations } from './utils/spotify';

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
          
          <button 
            onClick={fetchPlaylists} 
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition-colors"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load My Playlists'}
          </button>
          
          <div className="mt-4">
            <label className="mr-2">Choose Visual:</label>
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

          {/* Show playlists or tracks based on selection */}
          {!selectedPlaylist ? (
            /* Playlists View */
            <div className="w-full max-w-4xl mt-6">
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
                        onClick={() => fetchPlaylistTracks(playlist.id, playlist.name)}
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
          ) : (
            /* Tracks View */
            <div className="w-full max-w-6xl mt-6">
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
                          onClick={() => setSelectedTrack(track.id)}
                        >
                          Visualize
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
          
          {selectedTrack && (
            <div className="mt-6 w-full">
              <Suspense fallback={<div>Loading Visualizer...</div>}>
                <LazyVisualizer trackId={selectedTrack} visualType={visualType} token={token} />
              </Suspense>
              <div className="flex gap-4 mt-2 justify-center">
                <button 
                  onClick={() => handleLike(selectedTrack)} 
                  className="bg-pink-500 hover:bg-pink-600 px-4 py-1 rounded transition-colors"
                >
                  Like
                </button>
                <button 
                  onClick={() => handleRadio(selectedTrack)} 
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
