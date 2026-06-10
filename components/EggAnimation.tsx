"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { soundManager } from '@/lib/sound';

interface EggAnimationProps {
  key?: string;
  onComplete: () => void;
}

export default function EggAnimation({ onComplete }: EggAnimationProps) {
  const onCompleteRef = useRef(onComplete);

  // Keep ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Play hatching chirping sounds
    soundManager.playHatch();
    
    // Automatically call onComplete after animation completes (approx 2.4 seconds)
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-[60] bg-white flex flex-col items-center justify-center overflow-hidden p-6 text-black">
      
      {/* Background ambient circular pulse */}
      <div className="absolute w-[200px] h-[200px] rounded-full bg-yellow-300 opacity-30 blur-2xl animate-pulse" />
      <div className="absolute top-4 left-4 text-xs font-black bg-black text-yellow-400 px-3 py-1 rounded-md rotate-[-3deg] uppercase border border-black">
        ¡Nivel Nuevo!
      </div>

      {/* Main Egg Nest Grid */}
      <div className="relative w-64 h-72 flex items-center justify-center select-none scale-100">
        
        {/* The Cute Chick emerging! */}
        <motion.div
          initial={{ scale: 0.2, y: 40, opacity: 0 }}
          animate={{ scale: 1.1, y: -20, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 10, delay: 0.4 }}
          className="absolute z-10 flex flex-col items-center"
        >
          {/* Smiling Yellow Chick Body */}
          <div className="w-36 h-36 flex flex-col items-center justify-center relative select-none">
            <span className="text-8xl select-none">🐣</span>
          </div>

          <p className="font-display text-2xl text-black tracking-wider mt-4 uppercase">
            🐣 ¡HOOOLA!
          </p>
        </motion.div>

        {/* Top Egg Shell Piece */}
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: -150, rotate: -15, opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.36, 0.07, 0.19, 0.97] }}
          className="absolute inset-0 z-20"
        >
          <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
            {/* Top half egg shell */}
            <path
              d="M10,60 C10,30 25,5 50,5 C75,5 90,30 90,60 L80,63 L65,55 L50,65 L35,55 L18,63 Z"
              fill="#f8fafc"
              stroke="#000"
              strokeWidth="4"
            />
          </svg>
        </motion.div>

      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center mt-6 z-30"
      >
        <span className="font-comic text-sm text-black font-extrabold tracking-wide uppercase block">
          🐣 Rompiendo el cascarón...
        </span>
      </motion.div>

    </div>
  );
}
