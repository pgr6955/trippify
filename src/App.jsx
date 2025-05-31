// src/App.jsx
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { loginWithSpotify, getPlaylists, likeTrack, getRecommendations } from './utils/spotify';

const LazyVisualizer = lazy(() => import('./components/Visualizer'));

function App() {
  const [token, setToken] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [visualType, setVisualType] = useState('bars');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        setToken(accessToken);
        window.history.pushState({}, null, "/");
      }
    }
  }, []);

  const handleLogin = () => {
    loginWithSpotify();
  };

  const fetchPlaylists = async () => {
    const data = await getPlaylists(token);
    setPlaylists(data.items);
  };

  const handleLike = async (trackId) => {
    await likeTrack(token, trackId);
    alert('Liked!');
  };

  const handleRadio = async (trackId) => {
    const recs = await getRecommendations(token, trackId);
    window.open(recs.tracks[0].external_urls.spotify, '_blank');
  };

  const visualOptions = [
    { value: 'bars', label: 'Audio Bars' },
    { value: 'spirals', label: 'Spirals' },
    { value: 'waveform', label: 'Waveform' },
    { value: '3d', label: '3D Trippy Mode' }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-4">Trippy Spotify Visualizer</h1>
      {!token ? (
        <button onClick={handleLogin} className="bg-green-500 px-4 py-2 rounded">Login with Spotify</button>
      ) : (
        <>
          <button onClick={fetchPlaylists} className="bg-blue-500 px-4 py-2 rounded">Load My Playlists</button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {playlists.map(pl => (
              <div key={pl.id} className="bg-gray-800 p-4 rounded">
                <h2 className="text-xl font-semibold">{pl.name}</h2>
                {pl.tracks?.items?.length > 0 && (
                  <button
                    className="mt-2 bg-purple-500 px-4 py-1 rounded"
                    onClick={() => setSelectedTrack(pl.tracks.items[0].track.id)}>
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
                <button onClick={() => handleLike(selectedTrack)} className="bg-pink-500 px-4 py-1 rounded">Like</button>
                <button onClick={() => handleRadio(selectedTrack)} className="bg-yellow-500 px-4 py-1 rounded">Start Radio</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
