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

  const authUrl =
    `https://accounts.spotify.com/authorize?response_type=token` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  window.location = authUrl;
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
