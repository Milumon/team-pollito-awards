"use client";

import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  active: boolean;
  type?: 'burst' | 'continuous';
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const COLORS = [
  '#facc15', // Yellow
  '#fbbf24', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ec4899', // Pink
  '#8b5cf6', // Purple
];

export default function Confetti({ active, type = 'continuous' }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      particlesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles = particlesRef.current;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Seed initial particles
    if (type === 'burst') {
      const count = 60;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 40,
          y: canvas.height * 0.4 + (Math.random() - 0.5) * 40,
          size: Math.random() * 8 + 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          speedX: (Math.random() - 0.5) * 15,
          speedY: -Math.random() * 15 - 5,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          opacity: 1,
        });
      }
    } else {
      // Continuous fall initializer
      const count = 40;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * -canvas.height,
          size: Math.random() * 8 + 5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          speedX: (Math.random() - 0.5) * 3,
          speedY: Math.random() * 3 + 3,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5,
          opacity: 1,
        });
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Particle update
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        if (type === 'burst') {
          p.speedY += 0.3; // gravity
          p.speedX *= 0.98; // drag
          p.opacity -= 0.015; // fade out
        } else {
          p.speedY += 0.05; // tiny acceleration
          // Wrap screen logic
          if (p.y > canvas.height) {
            p.y = -20;
            p.x = Math.random() * canvas.width;
            p.speedY = Math.random() * 3 + 3;
            p.speedX = (Math.random() - 0.5) * 3;
          }
        }

        if (p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Particle rendering
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;

        // Draw rectangle
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      // Keep spawning active continuous particles if count drops
      if (type === 'continuous' && particles.length < 50 && active) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -20,
          size: Math.random() * 8 + 5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          speedX: (Math.random() - 0.5) * 3,
          speedY: Math.random() * 3 + 3,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5,
          opacity: 1,
        });
      }

      if (particles.length > 0 && active) {
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, type]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
