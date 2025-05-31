import React, { useRef, useEffect } from 'react';
import p5 from 'p5';

export default function WaveformVisualizer() {
  const canvasRef = useRef();
  const sketchRef = useRef();

  useEffect(() => {
    const sketch = (p) => {
      let fft;
      let osc;
      p.setup = () => {
        p.createCanvas(p.windowWidth, 400);
        fft = new p5.FFT();
        osc = new p5.Oscillator('sine');
        osc.start();
        fft.setInput(osc);
      };
      p.draw = () => {
        p.background(10);
        let waveform = fft.waveform();
        p.noFill();
        p.beginShape();
        p.stroke(255);
        for (let i = 0; i < waveform.length; i++) {
          let x = p.map(i, 0, waveform.length, 0, p.width);
          let y = p.map(waveform[i], -1, 1, 0, p.height);
          p.vertex(x, y);
        }
        p.endShape();
      };
    };
    sketchRef.current = new p5(sketch, canvasRef.current);
    return () => sketchRef.current.remove();
  }, []);

  return <div ref={canvasRef} className="w-full h-[400px]" />;
}