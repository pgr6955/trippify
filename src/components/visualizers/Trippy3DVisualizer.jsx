import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function Trippy3DVisualizer() {
  const mountRef = useRef();

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 400, 0.1, 1000);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, 400);
    mountRef.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    const geometry = new THREE.TorusKnotGeometry(1, 0.4, 128, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0xff00ff, metalness: 0.5, roughness: 0.3 });
    const knot = new THREE.Mesh(geometry, material);
    scene.add(knot);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const animate = () => {
      requestAnimationFrame(animate);
      knot.rotation.x += 0.01;
      knot.rotation.y += 0.01;
      renderer.render(scene, camera);
    };

    animate();
    return () => mountRef.current.removeChild(renderer.domElement);
  }, []);

  return <div ref={mountRef} className="w-full h-[400px]" />;
}