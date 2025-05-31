// src/utils/spotify.js

export function loginWithSpotify() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;
  
  console.log('🔍 Debug info:');
  console.log('clientId:', clientId);
  console.log('redirectUri:', redirectUri);
  
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-library-modify',
    'playlist-read-private',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state'
  ];

  // Try the most basic approach
  const baseUrl = 'https://accounts.spotify.com/authorize';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: scopes.join(' ')
  });

  const fullUrl = baseUrl + '?' + params.toString();
  
  console.log('🌐 Base URL:', baseUrl);
  console.log('📝 Params:', params.toString());
  console.log('🔗 Full URL:', fullUrl);
  console.log('🚀 About to redirect to:', fullUrl);
  
  window.location.href = fullUrl;
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
