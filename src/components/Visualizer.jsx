// src/components/Visualizer.jsx
import React, { Suspense, lazy } from 'react';

const BarsVisualizer = lazy(() => import('./visualizers/BarsVisualizer'));
const SpiralVisualizer = lazy(() => import('./visualizers/SpiralVisualizer'));
const WaveformVisualizer = lazy(() => import('./visualizers/WaveformVisualizer'));
const Trippy3DVisualizer = lazy(() => import('./visualizers/Trippy3DVisualizer'));

export default function Visualizer({ trackId, visualType, token }) {
  const getComponent = () => {
    switch (visualType) {
      case 'bars':
        return <BarsVisualizer trackId={trackId} token={token} />;
      case 'spirals':
        return <SpiralVisualizer trackId={trackId} token={token} />;
      case 'waveform':
        return <WaveformVisualizer trackId={trackId} token={token} />;
      case '3d':
        return <Trippy3DVisualizer trackId={trackId} token={token} />;
      default:
        return <div>Unknown visual type</div>;
    }
  };

  return (
    <Suspense fallback={<div>Loading visualization...</div>}>
      {getComponent()}
    </Suspense>
  );
}
