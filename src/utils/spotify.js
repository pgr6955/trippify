// src/utils/spotify.js

export function loginWithSpotify() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;

  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-library-modify',
    'playlist-read-private',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state'
  ];

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'token'); // ✅ important!
  authUrl.searchParams.set('scope', scopes.join(' '));

  console.log('Redirecting to:', authUrl.toString()); // 🔍 use this to debug

  window.location.href = authUrl.toString();
}

export async function getPlaylists(token) {
  const res = await fetch('https://api.spotify.com/v1/me/playlists', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.json();
}

export async function likeTrack(token, trackId) {
  await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getRecommendations(token, trackId) {
  const res = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${trackId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.json();
}
