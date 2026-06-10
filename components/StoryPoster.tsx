"use client";

import React from 'react';
import { CATEGORIES } from '@/src/data/categories';
import { VoteState } from '@/src/types';
import RobloxAvatar from './RobloxAvatar';
import { Star, Award, Heart } from 'lucide-react';

interface StoryPosterProps {
  votes: VoteState;
  posterRef: React.RefObject<HTMLDivElement | null>;
}

export default function StoryPoster({ votes, posterRef }: StoryPosterProps) {
  // Find MVP details (Category 1)
  const mvpCategoryId = 1;
  const mvpNomineeId = votes[mvpCategoryId];
  const mvpCategory = CATEGORIES.find((c) => c.id === mvpCategoryId);
  const mvpNominee = mvpCategory?.nominees.find((n) => n.id === mvpNomineeId);

  // Get other notable category votes to decorate the story poster
  const votedItems = CATEGORIES.filter(c => c.id !== 1 && votes[c.id]).map(c => {
    const nomineeId = votes[c.id];
    const nominee = c.nominees.find(n => n.id === nomineeId);
    return {
      categoryName: c.title.replace('Pollito ', '').replace(' DEL AÑO', ''),
      nomineeName: nominee?.name || '',
      emoji: c.emoji
    };
  }).slice(0, 4); // Take up to 4 other votes to keep it compact but filled

  return (
    <div className="absolute -left-[9999px] top-0 pointer-events-none select-none">
      {/* 9:16 Aspect Ratio container optimized for Instagram/TikTok Stories (width 432px, height 768px) */}
      <div
        ref={posterRef}
        className="w-[432px] h-[768px] relative p-6 flex flex-col justify-between overflow-hidden font-sans"
        style={{
          boxSizing: 'border-box',
          // Force rendering dimensions for html2canvas
          minWidth: '432px',
          minHeight: '768px',
          background: 'linear-gradient(to bottom, #f97316, #fbbf24)',
          border: '10px solid #000000',
          color: '#000000',
        }}
      >
        {/* Background Decorative Grid Lines or Patterns to make it pop */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Diagonal Ribbon Accents */}
        <div 
          className="absolute -right-16 -top-16 w-44 h-44 rotate-45 flex items-end justify-center pb-2"
          style={{ backgroundColor: '#fde047', border: '4px solid #000000' }}
        >
          <span className="font-display font-black text-xs tracking-widest" style={{ color: '#000000' }}>LIVE!</span>
        </div>

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col items-center text-center mt-2">
          <div 
            className="flex items-center gap-1.5 font-display text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full rotate-1 shadow-sm mb-3"
            style={{ backgroundColor: '#000000', color: '#facc15', border: '2px solid #000000' }}
          >
            ⭐ 1ER ANIVERSARIO ⭐
          </div>
          <h2 className="font-display text-4xl font-black uppercase tracking-tight leading-none" style={{ color: '#000000' }}>
            POLLITOS
          </h2>
          <h2 
            className="font-display text-4xl font-black uppercase tracking-tight leading-none mt-1"
            style={{ color: '#ffffff', filter: 'drop-shadow(3px 3px 0px #000000)' }}
          >
            AWARDS 2026
          </h2>
          <p 
            className="font-comic text-[11px] font-extrabold uppercase tracking-widest mt-2 px-3 py-0.5 rounded-md"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', color: '#000000', border: '1px solid #000000' }}
          >
            MI BALLOT OFICIAL
          </p>
        </div>

        {/* Main Content Area - Neobrutalist Ballot Box */}
        <div 
          className="relative z-10 flex-1 my-5 rounded-[2rem] p-4 flex flex-col items-center justify-between"
          style={{ backgroundColor: '#ffffff', border: '4px solid #000000', boxShadow: '6px 6px 0px #000000' }}
        >
          
          {/* MVP Spotlight Section */}
          <div className="w-full flex flex-col items-center text-center">
            <span 
              className="font-comic text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2 px-3 py-1 rounded-full"
              style={{ backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}
            >
              <Award className="w-3.5 h-3.5" style={{ color: '#ea580c' }} /> MI NOMINADO MVP DEL AÑO
            </span>

            {/* Glowing Roblox Avatar frame */}
            <div 
              className="w-28 h-28 relative p-1.5 rounded-full"
              style={{ backgroundColor: '#171717', border: '4px solid #000000', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            >
              {mvpNominee ? (
                <RobloxAvatar config={mvpNominee.avatar} size={100} className="mx-auto" />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center font-display text-4xl font-bold"
                  style={{ color: '#facc15' }}
                >
                  👑
                </div>
              )}
              {/* Outer floating badge */}
              <div 
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-base font-bold shadow"
                style={{ backgroundColor: '#facc15', color: '#000000', border: '3px solid #000000' }}
              >
                🐣
              </div>
            </div>

            <h3 
              className="font-display text-2xl uppercase tracking-wide mt-3 truncate w-full max-w-[280px]"
              style={{ color: '#000000' }}
            >
              {mvpNominee ? mvpNominee.name : 'Varios Pollitos'}
            </h3>
          </div>

          {/* Divider with cute stars */}
          <div className="relative w-full flex items-center justify-center my-2">
            <div className="w-full" style={{ borderTop: '2px dashed rgba(0, 0, 0, 0.3)' }} />
            <div 
              className="absolute px-2 text-xs font-bold font-comic uppercase tracking-widest"
              style={{ backgroundColor: '#ffffff', color: '#9ca3af' }}
            >
              MIS OTRAS NOMINACIONES
            </div>
          </div>

          {/* Grid of other category votes */}
          <div className="w-full grid grid-cols-2 gap-2 mt-1">
            {votedItems.length > 0 ? (
              votedItems.map((vote, i) => (
                <div
                  key={i}
                  className="p-2 rounded-xl flex flex-col justify-center items-center text-center relative"
                  style={{ backgroundColor: 'rgba(255, 247, 237, 0.5)', border: '2px solid #000000' }}
                >
                  <span className="absolute top-1 left-1 text-[11px] font-sans">{vote.emoji}</span>
                  <p 
                    className="text-[8px] font-comic font-black uppercase tracking-wider line-clamp-1"
                    style={{ color: '#ea580c' }}
                  >
                    {vote.categoryName}
                  </p>
                  <p 
                    className="text-xs font-semibold font-sans tracking-tight truncate w-full mt-0.5"
                    style={{ color: '#1e293b' }}
                  >
                    {vote.nomineeName || 'Sin votar'}
                  </p>
                </div>
              ))
            ) : (
              <div 
                className="col-span-2 text-center py-4 font-comic text-[11px] font-bold uppercase"
                style={{ color: '#6b7280' }}
              >
                ¡Apoyando con todo al Team Pollito de streams!
              </div>
            )}
            
            {/* If we have space, fill with interactive badge */}
            {votedItems.length < 4 && (
              <div 
                className="col-span-2 p-2.5 rounded-xl text-center flex items-center justify-center gap-1.5"
                style={{ backgroundColor: '#fef9c3', border: '2px dashed #facc15' }}
              >
                <Heart className="w-3.5 h-3.5" style={{ fill: '#ef4444', color: '#ef4444' }} />
                <span 
                  className="font-comic text-[10px] font-extrabold uppercase"
                  style={{ color: '#92400e' }}
                >
                  ¡1 Año de Diversión Roblox!
                </span>
              </div>
            )}
          </div>

          <p 
            className="font-comic text-[10px] font-bold uppercase tracking-wider text-center mt-3"
            style={{ color: '#9ca3af' }}
          >
            ¡Creado con amor por la comunidad!
          </p>
        </div>

        {/* Footer Area with QR representation, branding and action CTA */}
        <div 
          className="relative z-10 flex items-center justify-between mt-2 px-2 p-3.5 rounded-2xl"
          style={{ backgroundColor: '#000000', color: '#ffffff', border: '4px solid #000000' }}
        >
          <div className="flex flex-col text-left">
            <span 
              className="text-[10px] font-comic uppercase tracking-wider font-extrabold"
              style={{ color: '#facc15' }}
            >
              📲 ESCANEA Y VOTA AHORA
            </span>
            <span className="text-[13px] font-display font-black tracking-normal uppercase leading-tight mt-0.5" style={{ color: '#ffffff' }}>
              THE POLLITOS AWARDS
            </span>
            <span 
              className="text-[9px] font-mono mt-0.5"
              style={{ color: '#9ca3af' }}
            >
              https://milumon-awards.roblox
            </span>
          </div>

          {/* Simple Vector Mock QR code */}
          <div 
            className="w-12 h-12 rounded-lg p-1.5 flex flex-col justify-between shrink-0"
            style={{ backgroundColor: '#ffffff', border: '1px solid #000000' }}
          >
            <div className="flex justify-between w-full h-3">
              <div className="w-3 h-3" style={{ backgroundColor: '#000000' }} />
              <div className="w-1 h-3" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />
              <div className="w-3 h-3" style={{ backgroundColor: '#000000' }} />
            </div>
            <div className="flex justify-between w-full h-2">
              <div className="w-1 h-1" style={{ backgroundColor: '#000000' }} />
              <div className="w-2 h-2" style={{ backgroundColor: '#000000' }} />
              <div className="w-1 h-1" style={{ backgroundColor: '#000000' }} />
            </div>
            <div className="flex justify-between w-full h-3">
              <div className="w-3 h-3" style={{ backgroundColor: '#000000' }} />
              <div className="w-1 h-2" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} />
              <div className="w-2 h-3" style={{ backgroundColor: '#000000' }} />
            </div>
          </div>
        </div>

        {/* Visual floating star badges */}
        <div className="absolute top-1/4 left-1.5 animate-pulse">
          <Star className="w-6 h-6" style={{ fill: '#fde047', color: '#fde047' }} />
        </div>
        <div className="absolute top-2/3 right-1.5 animate-pulse">
          <Star className="w-5 h-5" style={{ fill: '#fef08a', color: '#fef08a' }} />
        </div>
      </div>
    </div>
  );
}
