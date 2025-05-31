// src/App.jsx
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { loginWithSpotify, exchangeCodeForToken, getPlaylists, likeTrack, getRecommendations } from './utils/spotify';

const LazyVisualizer = lazy(() => import('./components/Visualizer'));

function App() {
  const [token, setToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 w-full max-w-4xl">
            {playlists.map(pl => (
              <div key={pl.id} className="bg-gray-800 p-4 rounded">
                <h2 className="text-xl font-semibold">{pl.name}</h2>
                <p className="text-gray-400 text-sm">{pl.tracks?.total || 0} tracks</p>
                {pl.tracks?.items?.length > 0 && (
                  <button
                    className="mt-2 bg-purple-500 hover:bg-purple-600 px-4 py-1 rounded transition-colors"
                    onClick={() => setSelectedTrack(pl.tracks.items[0].track.id)}
                  >
                    Visualize
                  </button>
                )}
              </div>
            ))}
          </div>
          
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
