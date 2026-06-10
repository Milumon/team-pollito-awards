"use client";

import React, { useState, useRef } from 'react';
import { CATEGORIES } from '../src/data/categories';
import { VoteState } from '../src/types';
import RobloxAvatar from './RobloxAvatar';
import StoryPoster from './StoryPoster';
import html2canvas from 'html2canvas';
import { soundManager } from '../lib/sound';
import { Share2, Check, Download, Award, Star } from 'lucide-react';

interface ShareCardProps {
  votes: VoteState;
}

export default function ShareCard({ votes }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Find user's choice for MVP (Category 1)
  const mvpCategoryId = 1;
  const mvpNomineeId = votes[mvpCategoryId];
  const mvpCategory = CATEGORIES.find((c) => c.id === mvpCategoryId);
  const mvpNominee = mvpCategory?.nominees.find((n) => n.id === mvpNomineeId);

  // Summarize overall details
  const voteCount = Object.keys(votes).length;

  const handleDownloadStory = async () => {
    if (downloading) return;
    soundManager.playPop();
    setDownloading(true);

    // Give a short timeout so the UI settles or re-renders
    setTimeout(async () => {
      try {
        if (posterRef.current) {
          const canvas = await html2canvas(posterRef.current, {
            useCORS: true,
            scale: 2, // Sharp high definition
            backgroundColor: null,
            logging: false,
          });

          const imageUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = imageUrl;
          link.download = `pollitos-awards-story-${mvpNominee ? mvpNominee.name.toLowerCase() : 'voto'}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Error generating image for stories:', error);
      } finally {
        setDownloading(false);
      }
    }, 450);
  };

  const handleShare = async () => {
    soundManager.playPop();
    const shareText = `🏆 ¡YO YA VOTÉ EN LOS POLLITOS AWARDS 2026! 🐣
💛 Comunidad Team Pollito - Celebrando 1 año de directos divertidos.

👑 Mi nominado para MVP del Año es: **${mvpNominee ? mvpNominee.name : '¡Varios pollidades!'}**

✨ ¡Ven a votar tú también y ayuda a elegir a los ganadores!
🔗 ${window.location.origin}
#TeamPollito #PollitosAwards2026 #Roblox`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'The Pollitos Awards 2026',
          text: shareText,
          url: window.location.origin,
        });
        return;
      } catch (err) {
        console.log('Web Share skipped, backing up to Clipboard.');
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      alert('¡Mensaje listo para copiar!');
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white border-4 border-black rounded-[2rem] overflow-hidden relative p-6 brutalist-shadow flex flex-col items-center text-black">
      
      {/* Decorative Star Accents */}
      <div className="absolute top-4 left-4 text-orange-600 animate-pulse"><Star className="w-5 h-5 fill-orange-500" /></div>
      <div className="absolute top-4 right-4 text-orange-600 animate-pulse delay-75"><Star className="w-5 h-5 fill-orange-500" /></div>
      <div className="absolute bottom-4 left-4 text-orange-500 animate-bounce"><Star className="w-4 h-4 fill-orange-400" /></div>
      <div className="absolute bottom-4 right-4 text-orange-500 animate-bounce delay-100"><Star className="w-4 h-4 fill-amber-400" /></div>

      {/* Ticket Ribbon */}
      <div className="bg-orange-500 text-white font-display text-sm tracking-wider px-5 py-1.5 rounded-full uppercase mb-4 border-2 border-black animate-bounce rotate-2">
        🎟️ Voter Pass Oficial
      </div>

      <div className="text-center mb-4">
        <h3 className="font-display text-3xl text-black tracking-wide leading-none uppercase">
          POLLITOS AWARDS
        </h3>
        <p className="font-comic text-xs uppercase font-bold text-gray-500 tracking-wider mt-1.5">
          ¡Voto Completado con Éxito!
        </p>
      </div>

      {/* Frame of MVP Chosen */}
      <div className="bg-orange-50 w-full rounded-2xl py-5 px-4 mb-5 border-4 border-black flex flex-col items-center relative gap-3">
        {mvpNominee ? (
          <>
            <p className="font-comic text-xs text-orange-600 uppercase tracking-widest flex items-center gap-1 font-bold">
              <Award className="w-4 h-4 text-orange-600" /> Mi MVP Elegido
            </p>
            <div className="w-24 h-24 relative p-1 rounded-full border-4 border-black bg-neutral-950 shadow-md">
              <RobloxAvatar config={mvpNominee.avatar} size={88} className="mx-auto" />
            </div>
            <p className="font-display text-xl text-orange-600 tracking-wider">
              🐣 {mvpNominee.name}
            </p>
          </>
        ) : (
          <>
            <p className="font-comic text-xs text-gray-700 font-bold uppercase">¡Votos procesados!</p>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center border-4 border-black">
              <span className="text-4xl">👑</span>
            </div>
            <p className="font-comic text-base font-bold text-black">¡{CATEGORIES.length} / {CATEGORIES.length} completado!</p>
          </>
        )}

        <div className="border-t-2 border-dashed border-gray-300 w-full mt-2 pt-2 text-center">
          <p className="font-comic text-[12px] text-gray-600 font-medium">
            Completó {voteCount} de {CATEGORIES.length} Categorías de Premiación.
          </p>
        </div>
      </div>

      {/* Quick stats banner */}
      <div className="text-center space-y-1 mb-6">
        <span className="inline-block bg-black text-yellow-400 px-4 py-1.5 rounded-xl font-display text-xs uppercase tracking-wider transform -rotate-1 border-2 border-black">
          🎮 Team Pollito • 1 Año
        </span>
      </div>

      {/* Dynamic Interaction Button */}
      <button
        id="share-button"
        onClick={handleShare}
        className={`w-full py-4 px-6 rounded-2xl font-display text-base flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-95 border-4 border-black brutalist-shadow ${
          copied
            ? 'bg-emerald-400 text-black font-extrabold'
            : 'bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold border-b-6 hover:border-b-4'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-5 h-5 animate-pulse" />
            ¡COPIADO PARA DISCORD!
          </>
        ) : (
          <>
            <Share2 className="w-5 h-5 animate-bounce" />
            📲 COMPARTIR EN DISCORD
          </>
        )}
      </button>

      {copied && (
        <span className="font-comic text-xs text-emerald-600 font-bold mt-2 text-center animate-fade-in mb-2">
          ¡Listo! Pégalo en tu grupo de Roblox o Canal de Discord 💬
        </span>
      )}

      {/* Download Story Button */}
      <button
        onClick={handleDownloadStory}
        disabled={downloading}
        className={`w-full py-4 px-6 rounded-2xl font-display text-base flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-95 border-4 border-black brutalist-shadow mt-3 ${
          downloading
            ? 'bg-orange-300 text-black cursor-wait font-bold'
            : 'bg-orange-500 hover:bg-orange-600 text-white font-extrabold border-b-6 hover:border-b-4'
        }`}
      >
        <Download className={`w-5 h-5 ${downloading ? 'animate-spin' : 'animate-bounce'}`} />
        {downloading ? 'CREANDO HISTORIA 📸...' : 'DESCARGAR STORY 📸'}
      </button>

      <span className="font-comic text-[10px] text-gray-500 font-bold mt-2.5 text-center leading-snug">
        Descarga una imagen lista con tu avatar y votos para tus Stories de Instagram o TikTok. 🐥
      </span>

      {/* Offscreen high-definition Story Poster for capture */}
      <StoryPoster votes={votes} posterRef={posterRef} />
    </div>
  );
}
