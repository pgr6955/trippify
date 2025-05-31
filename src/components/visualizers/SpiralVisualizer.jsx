import React, { useRef, useEffect } from 'react';
import p5 from 'p5';

export default function SpiralVisualizer() {
  const canvasRef = useRef();
  const sketchRef = useRef();

  useEffect(() => {
    const sketch = (p) => {
      let angle = 0;
      p.setup = () => {
        p.createCanvas(p.windowWidth, 400);
        p.angleMode(p.DEGREES);
        p.colorMode(p.HSB, 255);
      };
      p.draw = () => {
        p.background(0);
        p.translate(p.width / 2, p.height / 2);
        for (let i = 0; i < 360; i += 10) {
          let radius = 150 + 50 * p.sin(p.frameCount + i);
          let x = radius * p.cos(i + angle);
          let y = radius * p.sin(i + angle);
          p.fill((i + p.frameCount) % 255, 255, 255);
          p.ellipse(x, y, 10, 10);
        }
        angle += 1;
      };
    };
    sketchRef.current = new p5(sketch, canvasRef.current);
    return () => sketchRef.current.remove();
  }, []);

  return <div ref={canvasRef} className="w-full h-[400px]" />;
}