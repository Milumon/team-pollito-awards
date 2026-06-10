import React from 'react';
import { AvatarConfig } from '../src/types';

interface RobloxAvatarProps {
  config: AvatarConfig;
  className?: string;
  size?: number;
}

export default function RobloxAvatar({ config, className = '', size = 80 }: RobloxAvatarProps) {
  const { skinColor, hoodieColor, eyesType, mouthType, accessory, hairColor } = config;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} overflow-visible`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <defs>
        {/* Shadow filter for realistic Roblox avatar look */}
        <filter id="avatar-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity="0.25" />
        </filter>
        {/* Soft radial background gradient inside the card */}
        <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#252016" />
          <stop offset="100%" stopColor="#120f09" />
        </radialGradient>
        {/* Gold crown gradient */}
        <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Avatar Background */}
      <circle cx="50" cy="50" r="48" fill="url(#bg-grad)" stroke="#451a03" strokeWidth="1.5" />

      {/* Torso / Blocky Roblox Hoodie */}
      <g filter="url(#avatar-shadow)">
        {/* Shoulders */}
        <path d="M22,85 C22,70 28,64 50,64 C72,64 78,70 78,85 L80,105 L20,105 Z" fill={hoodieColor} />
        {/* Neck border/drawstrings */}
        <path d="M40,65 Q50,71 60,65" fill="none" stroke="#2c1001" strokeWidth="3" strokeLinecap="round" />
        {/* Hood lines */}
        <path d="M30,64 C25,55 35,48 50,48 C65,48 75,55 70,64" fill="none" stroke={hoodieColor} strokeWidth="3" strokeLinecap="round" />
        
        {/* Tiny Chick Emblem on the Hoodie */}
        <circle cx="50" cy="74" r="5" fill="#facc15" />
        {/* Emblem beak */}
        <polygon points="50,73 52,75 50,77 48,75" fill="#f97316" />
        {/* Emblem eyes */}
        <circle cx="48.5" cy="73.5" r="0.6" fill="#1e293b" />
        <circle cx="51.5" cy="73.5" r="0.6" fill="#1e293b" />
      </g>

      {/* Classic Roblox Blocky Rectangle/Rounded Head */}
      <g filter="url(#avatar-shadow)">
        <rect x="33" y="27" width="34" height="28" rx="7" ry="7" fill={skinColor} stroke="#2a1505" strokeWidth="1.5" />
      </g>

      {/* Expressive Eyes */}
      <g stroke="#1a0c02" strokeWidth="2.5" fill="none" strokeLinecap="round">
        {eyesType === 'smile' && (
          <>
            {/* Happy anime arch eyes */}
            <path d="M41,38 Q45,34 49,38" />
            <path d="M51,38 Q55,34 59,38" />
          </>
        )}
        {eyesType === 'wink' && (
          <>
            {/* Left closed-wink, Right open-smile */}
            <path d="M41,37 L48,37" strokeWidth="3" />
            <path d="M51,38 Q55,34 59,38" />
          </>
        )}
        {eyesType === 'starry' && (
          <>
            {/* Star-shaped eyes */}
            <path d="M45,34 L46,37 L49,37 L47,39 L48,42 L45,40 L42,42 L43,39 L41,37 L44,37 Z" fill="#eab308" stroke="#a16207" strokeWidth="1" />
            <path d="M55,34 L56,37 L59,37 L57,39 L58,42 L55,40 L52,42 L53,39 L51,37 L54,37 Z" fill="#eab308" stroke="#a16207" strokeWidth="1" />
          </>
        )}
        {eyesType === 'cool' && (
          <>
            {/* Rectangular cheeky eyes */}
            <rect x="41" y="35" width="7" height="4" rx="1.5" fill="#111827" stroke="none" />
            <rect x="52" y="35" width="7" height="4" rx="1.5" fill="#111827" stroke="none" />
            <path d="M41,33 Q45,31 48,33" stroke="#1a0c02" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M52,33 Q56,31 59,33" stroke="#1a0c02" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}
        {eyesType === 'cute' && (
          <>
            {/* Big anime eyes */}
            <circle cx="44" cy="38" r="3.5" fill="#111827" stroke="none" />
            <circle cx="56" cy="38" r="3.5" fill="#111827" stroke="none" />
            <circle cx="43" cy="36.5" r="1.2" fill="#ffffff" stroke="none" />
            <circle cx="55" cy="36.5" r="1.2" fill="#ffffff" stroke="none" />
            <circle cx="45" cy="39" r="0.6" fill="#ffffff" stroke="none" />
            <circle cx="57" cy="39" r="0.6" fill="#ffffff" stroke="none" />
          </>
        )}
      </g>

      {/* Expressive Mouth */}
      <g>
        {mouthType === 'happy' && (
          <path d="M45,46 Q50,51 55,46" fill="none" stroke="#1a0c02" strokeWidth="2.5" strokeLinecap="round" />
        )}
        {mouthType === 'bigSmile' && (
          <path d="M43,45 C43,51 57,51 57,45 Z" fill="#ef4444" stroke="#1a0c02" strokeWidth="2" />
        )}
        {mouthType === 'laugh' && (
          <path d="M44,45 Q50,53 56,45 C56,45 50,47 44,45 Z" fill="#ea580c" stroke="#1a0c02" strokeWidth="1.5" />
        )}
        {mouthType === 'open' && (
          <ellipse cx="50" cy="46" rx="4" ry="3" fill="#310e05" stroke="#1a0c02" strokeWidth="1" />
        )}
      </g>

      {/* Roblox Styled Hair */}
      <g filter="url(#avatar-shadow)">
        <path
          d="M31,29 C30,17 40,15 50,15 C60,15 70,17 69,29 C72,25 68,20 50,18 C32,20 28,25 31,29 Z"
          fill={hairColor}
        />
        {/* Hair bangs / locks */}
        <path
          d="M32,27 C34,22 42,24 43,28 C45,23 48,24 50,29 C52,24 58,23 60,28 C64,22 67,24 68,27 C69,32 66,35 64,32 C62,37 54,34 52,36 C50,33 46,34 44,36 C41,33 36,36 33,32 Z"
          fill={hairColor}
          stroke="#1a0c02"
          strokeWidth="1"
        />
      </g>

      {/* Accessories */}
      <g filter="url(#avatar-shadow)">
        {accessory === 'chickHat' && (
          <>
            {/* Cute Little Chick sitting on the head */}
            <circle cx="50" cy="15" r="9" fill="#facc15" stroke="#a16207" strokeWidth="1" />
            <polygon points="50,14 53,16 50,18 47,16" fill="#f97316" stroke="#c2410c" strokeWidth="0.5" />
            {/* Mini cute eyes */}
            <circle cx="47" cy="14" r="1" fill="#1e293b" />
            <circle cx="53" cy="14" r="1" fill="#1e293b" />
            {/* Chick feet */}
            <path d="M46,24 L44,26 M54,24 L56,26" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
            {/* Eggshell on the chick head */}
            <path d="M44,11 Q50,4 56,11 L54,12 L50,9 L46,12 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
          </>
        )}

        {accessory === 'sunglasses' && (
          <>
            {/* Square stylish Roblox Pixel/VIP glasses */}
            <path d="M36,36 H64 V41 H60 V43 H56 V41 H44 V43 H40 V41 H36 Z" fill="#111827" />
            {/* Futuristic light bar line across glasses */}
            <line x1="38" y1="38" x2="62" y2="38" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
          </>
        )}

        {accessory === 'crown' && (
          <>
            {/* Golden Shining Roblox MVP Crown */}
            <path
              d="M36,19 L40,11 L47,16 L50,8 L53,16 L60,11 L64,19 Z"
              fill="url(#gold-grad)"
              stroke="#78350f"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Crown base */}
            <rect x="36" y="19" width="28" height="3" fill="#ea580c" />
            {/* Sparkly gems */}
            <circle cx="40" cy="12" r="1.2" fill="#ef4444" />
            <circle cx="50" cy="9" r="1.2" fill="#3b82f6" />
            <circle cx="60" cy="12" r="1.2" fill="#ef4444" />
          </>
        )}

        {accessory === 'headset' && (
          <>
            {/* Cool Gamer Headset */}
            <path d="M31,34 Q31,21 50,21 Q69,21 69,34" fill="none" stroke="#e11d48" strokeWidth="3.5" strokeLinecap="round" />
            {/* Side Earcups */}
            <rect x="29" y="32" width="7" height="11" rx="2" fill="#111827" stroke="#e11d48" strokeWidth="1.5" />
            <rect x="64" y="32" width="7" height="11" rx="2" fill="#111827" stroke="#e11d48" strokeWidth="1.5" />
            {/* Mic boom */}
            <path d="M34,41 Q40,45 44,44" fill="none" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="45" cy="44" r="1.5" fill="#e11d48" />
          </>
        )}

        {accessory === 'star' && (
          <>
            {/* Cheek star stamp */}
            <polygon points="61,42 63,44 66,44 64,46 65,49 61,47 58,49 59,46 57,44 60,44" fill="#fbbf24" stroke="#a16207" strokeWidth="0.5" />
          </>
        )}
      </g>
    </svg>
  );
}
