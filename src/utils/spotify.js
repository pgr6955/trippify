// src/utils/spotify.js

export function loginWithSpotify() {
  console.log('🚀 loginWithSpotify() called!');
  
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

  const baseUrl = 'https://accounts.spotify.com/authorize';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: scopes.join(' ')
  });
  
  const fullUrl = `${baseUrl}?${params.toString()}`;
  console.log('🔗 Complete URL:', fullUrl);
  
  // Try multiple redirect methods
  try {
    // Method 1: Force same tab
    window.location.replace(fullUrl);
  } catch (error) {
    console.log('Method 1 failed, trying method 2');
    try {
      // Method 2: New tab approach
      window.open(fullUrl, '_self');
    } catch (error2) {
      console.log('Method 2 failed, trying method 3');
      // Method 3: Manual link click simulation
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_self';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
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
