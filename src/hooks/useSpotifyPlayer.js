// src/hooks/useSpotifyPlayer.js
import { useEffect, useRef, useState } from 'react';

export function useSpotifyPlayer(token) {
  const playerRef = useRef(null);
  const [deviceId, setDeviceId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [audioDestination, setAudioDestination] = useState(null);

  useEffect(() => {
    if (!token) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new Spotify.Player({
        name: 'Trippy Visualizer Player',
        getOAuthToken: cb => cb(token),
        volume: 1.0
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player Ready with Device ID', device_id);
        setDeviceId(device_id);
        setPlayerReady(true);
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      player.addListener('initialization_error', ({ message }) => console.error('Init Error:', message));
      player.addListener('authentication_error', ({ message }) => console.error('Auth Error:', message));
      player.addListener('account_error', ({ message }) => console.error('Account Error:', message));

      player.connect();
      playerRef.current = player;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const destination = audioCtx.createMediaStreamDestination();
      setAudioContext(audioCtx);
      setAudioDestination(destination);
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [token]);

  return { player: playerRef.current, deviceId, playerReady, audioContext, audioDestination };
}
