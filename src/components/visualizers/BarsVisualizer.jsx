// src/components/visualizers/BarsVisualizer.jsx
import React, { useRef, useEffect } from 'react';
import p5 from 'p5';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';

export default function BarsVisualizer({ trackId, token }) {
  const canvasRef = useRef();
  const sketchRef = useRef();
  const { player, deviceId, playerReady, audioContext, audioDestination } = useSpotifyPlayer(token);

  useEffect(() => {
    if (!playerReady || !trackId || !deviceId) return;

    const playTrack = async () => {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] })
      });
    };

    playTrack();
  }, [playerReady, trackId, deviceId, token]);

  useEffect(() => {
    if (!audioContext || !audioDestination) return;

    const sketch = (p) => {
      let fft;

      p.setup = () => {
        p.createCanvas(p.windowWidth, 400).parent(canvasRef.current);
        p.colorMode(p.HSB, 255);
        fft = new p5.FFT();
        fft.setInput(audioDestination);
      };

      p.draw = () => {
        p.background(0, 0, 30);
        let spectrum = fft.analyze();
        p.noStroke();
        for (let i = 0; i < spectrum.length; i += 10) {
          let amp = spectrum[i];
          let y = p.map(amp, 0, 256, p.height, 0);
          p.fill((i + p.frameCount) % 255, 255, 255);
          p.rect(i * 2, y, 10, p.height - y);
        }
      };
    };

    sketchRef.current = new p5(sketch);
    return () => {
      sketchRef.current.remove();
    };
  }, [audioContext, audioDestination]);

  return <div ref={canvasRef} className="w-full h-[400px]" />;
}
