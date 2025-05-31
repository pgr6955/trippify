// src/utils/spotify.js

// Generate a random string for PKCE
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

// Create SHA256 hash
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

// Base64 URL encode
function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function loginWithSpotify() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;
  
  console.log('🚀 Starting PKCE login flow');
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

  // Generate PKCE parameters
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);
  
  // Store code verifier for later use
  localStorage.setItem('spotify_code_verifier', codeVerifier);
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code', // Changed from 'token' to 'code'
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log('🔗 Auth URL:', authUrl);
  
  window.location.href = authUrl;
}

// New function to exchange code for token
export async function exchangeCodeForToken(code) {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_REDIRECT_URI;
  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }
  
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Clean up
  localStorage.removeItem('spotify_code_verifier');
  
  return data.access_token;
}

export async function getPlaylists(token) {
  const res = await fetch('https://api.spotify.com/v1/me/playlists', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch playlists: ${res.status}`);
  }
  
  return res.json();
}

export async function getPlaylistTracks(token, playlistId) {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist tracks: ${res.status}`);
  }
  
  return res.json();
}

export async function likeTrack(token, trackId) {
  const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to like track: ${res.status}`);
  }
}

export async function getRecommendations(token, trackId) {
  const res = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${trackId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get recommendations: ${res.status}`);
  }
  
  return res.json();
}

// Web Playback SDK functions
export function initializePlayer(token, onReady, onPlayerStateChanged) {
  return new Promise((resolve, reject) => {
    if (!window.Spotify) {
      reject(new Error('Spotify Web Playback SDK not loaded'));
      return;
    }

    const player = new window.Spotify.Player({
      name: 'Trippify Player',
      getOAuthToken: cb => { cb(token); },
      volume: 0.5
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize:', message);
      reject(new Error(message));
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Failed to authenticate:', message);
      reject(new Error(message));
    });

    player.addListener('account_error', ({ message }) => {
      console.error('Failed to validate Spotify account:', message);
      reject(new Error(message));
    });

    player.addListener('playback_error', ({ message }) => {
      console.error('Failed to perform playback:', message);
    });

    // Playback status updates
    player.addListener('player_state_changed', state => {
      console.log('Player state changed:', state);
      if (onPlayerStateChanged) {
        onPlayerStateChanged(state);
      }
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      if (onReady) {
        onReady(device_id);
      }
      resolve({ player, device_id });
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player!
    player.connect().then(success => {
      if (success) {
        console.log('Successfully connected to Spotify!');
      } else {
        reject(new Error('Failed to connect to Spotify'));
      }
    });
  });
}

export async function playTrack(token, deviceId, trackUri) {
  const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({
      uris: [trackUri]
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to play track: ${res.status}`);
  }
}

export async function pausePlayback(token) {
  const res = await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to pause: ${res.status}`);
  }
}

export async function resumePlayback(token) {
  const res = await fetch('https://api.spotify.com/v1/me/player/play', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to resume: ${res.status}`);
  }
}

export async function setVolume(token, volumePercent) {
  const res = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to set volume: ${res.status}`);
  }
}

export async function searchTracks(token, query, limit = 20) {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit
  });

  const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to search tracks: ${res.status}`);
  }

  return res.json();
}
