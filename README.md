# Trippy Spotify Visualizer

A frontend web app using Spotify Web API + Web Playback SDK to create synced visualizations.

## Features
- Spotify login (Implicit Grant)
- Playlists + tracks
- Trippy visual modes (Bars, Spirals, Waveform, 3D)
- Audio-reactive using FFT + WebGL

## Setup
1. Register at https://developer.spotify.com/dashboard
2. Set Redirect URI to `http://localhost:5173/`
3. Copy `.env.example` to `.env` and fill in your credentials

## Run Locally
```bash
npm install
npm run dev
```

## Deploy
Deploy on [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/) with your `.env` settings configured.