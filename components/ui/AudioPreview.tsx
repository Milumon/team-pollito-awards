'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Scissors, Volume2 } from 'lucide-react';

interface AudioPreviewProps {
  file: File;
  onTrimChange: (start: number, end: number) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPreview({ file, onTrimChange }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | 'playhead' | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [loadingWaveform, setLoadingWaveform] = useState(false);

  // Generate waveform bars dynamically
  useEffect(() => {
    const generateWaveform = async () => {
      setWaveform([]);
      setLoadingWaveform(true);
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const tempContext = new AudioContextClass();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await tempContext.decodeAudioData(arrayBuffer);
        await tempContext.close();

        const channelData = audioBuffer.getChannelData(0);
        const numBars = 75; // Number of bars to display
        const blockSize = Math.floor(channelData.length / numBars);
        const rawBars: number[] = [];

        for (let i = 0; i < numBars; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j]);
          }
          rawBars.push(sum / blockSize);
        }

        // Normalize heights
        const maxVal = Math.max(...rawBars);
        const normalizedBars = maxVal > 0 ? rawBars.map(val => val / maxVal) : rawBars;
        setWaveform(normalizedBars);
      } catch (err) {
        console.error('Error generating waveform:', err);
      } finally {
        setLoadingWaveform(false);
      }
    };

    generateWaveform();
  }, [file]);

  // Create object URL for the file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setPlaying(false);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    setTrimEnd(Math.min(audio.duration, 30));
    onTrimChange(0, Math.min(audio.duration, 30));
  }, [onTrimChange]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    // Stop at trim end
    if (audio.currentTime >= trimEnd) {
      audio.pause();
      audio.currentTime = trimStart;
      setPlaying(false);
    }
  }, [trimEnd, trimStart]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.currentTime = Math.max(trimStart, audio.currentTime < trimStart || audio.currentTime >= trimEnd ? trimStart : audio.currentTime);
      audio.play();
      setPlaying(true);
    }
  };

  // Convert pixel position in the bar to time
  const posToTime = useCallback((clientX: number): number => {
    const bar = progressRef.current;
    if (!bar || duration === 0) return 0;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  const handleBarMouseDown = (e: React.MouseEvent) => {
    if (dragging) return;
    const t = posToTime(e.clientX);
    // Check proximity to trim handles (within 8px equivalent)
    const bar = progressRef.current;
    if (!bar || duration === 0) return;
    const rect = bar.getBoundingClientRect();
    const startPx = (trimStart / duration) * rect.width;
    const endPx = (trimEnd / duration) * rect.width;
    const clickPx = e.clientX - rect.left;

    if (Math.abs(clickPx - startPx) < 12) {
      setDragging('start');
    } else if (Math.abs(clickPx - endPx) < 12) {
      setDragging('end');
    } else {
      // Move playhead
      const audio = audioRef.current;
      if (audio) audio.currentTime = Math.max(trimStart, Math.min(trimEnd, t));
      setCurrentTime(t);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const t = posToTime(e.clientX);
    if (dragging === 'start') {
      const newStart = Math.max(0, Math.min(t, trimEnd - 0.5));
      setTrimStart(newStart);
      onTrimChange(newStart, trimEnd);
    } else if (dragging === 'end') {
      const newEnd = Math.min(duration, Math.max(t, trimStart + 0.5), trimStart + 30);
      setTrimEnd(newEnd);
      onTrimChange(trimStart, newEnd);
    }
  }, [dragging, posToTime, trimEnd, trimStart, duration, onTrimChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const trimDuration = trimEnd - trimStart;
  const isOverLimit = trimDuration > 30;

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const playPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mt-3 space-y-3 bg-[#1e1f22] border border-neutral-700/60 rounded-xl p-4">
      {objectUrl && (
        <audio
          ref={audioRef}
          src={objectUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          preload="metadata"
        />
      )}

      {/* File info */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-[#FFC200] shrink-0" />
        <span className="text-xs text-gray-300 truncate font-medium">{file.name}</span>
        <span className="ml-auto text-[10px] text-gray-500 shrink-0">
          {formatTime(duration)} total
        </span>
      </div>

      {/* Waveform / timeline bar */}
      <div
        ref={progressRef}
        className="relative h-10 rounded-lg overflow-visible cursor-pointer select-none"
        onMouseDown={handleBarMouseDown}
      >
        {/* Background track with waveform bars */}
        <div className="absolute inset-0 rounded-lg bg-neutral-900/40 flex items-center justify-between px-2 gap-[1.5px]">
          {loadingWaveform ? (
            <div className="w-full text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider animate-pulse">
              Generando forma de onda...
            </div>
          ) : waveform.length > 0 ? (
            waveform.map((barHeight, idx) => {
              const barPct = (idx / waveform.length) * 100;
              const isSelected = barPct >= startPct && barPct <= endPct;
              const isPlayed = barPct <= playPct;
              
              let barColor = 'bg-neutral-600/60';
              if (isSelected) {
                barColor = isPlayed ? 'bg-[#FFC200]' : 'bg-[#FFC200]/50';
              }

              return (
                <div
                  key={idx}
                  className={`w-0.5 rounded-sm transition-colors ${barColor}`}
                  style={{ height: `${Math.max(15, barHeight * 100)}%` }}
                />
              );
            })
          ) : (
            <div className="w-full h-[2px] bg-neutral-700" />
          )}
        </div>

        {/* Excluded left region */}
        <div
          className="absolute top-0 bottom-0 left-0 rounded-l-lg bg-neutral-900/70"
          style={{ width: `${startPct}%` }}
        />

        {/* Selected region */}
        <div
          className="absolute top-0 bottom-0 bg-[#FFC200]/20 border-t border-b border-[#FFC200]/40"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Excluded right region */}
        <div
          className="absolute top-0 bottom-0 right-0 rounded-r-lg bg-neutral-900/70"
          style={{ width: `${100 - endPct}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none"
          style={{ left: `${playPct}%` }}
        />

        {/* Trim handle — start */}
        <div
          className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize flex items-center justify-center z-10"
          style={{ left: `${startPct}%` }}
        >
          <div className="w-1.5 h-full rounded-sm bg-[#FFC200]" />
        </div>

        {/* Trim handle — end */}
        <div
          className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize flex items-center justify-center z-10"
          style={{ left: `${endPct}%` }}
        >
          <div className="w-1.5 h-full rounded-sm bg-[#FFC200]" />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FFC200] hover:brightness-105 text-black transition-all active:scale-95 shrink-0"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        <span className="text-[10px] font-mono text-gray-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-gray-500" />
          <span className={`text-[10px] font-mono font-semibold ${isOverLimit ? 'text-red-400' : 'text-gray-300'}`}>
            {formatTime(trimStart)} → {formatTime(trimEnd)}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isOverLimit
              ? 'bg-red-500/15 text-red-400'
              : 'bg-emerald-500/15 text-emerald-400'
          }`}>
            {Math.ceil(trimDuration)}s {isOverLimit ? '⚠ máx 30s' : '✓'}
          </span>
        </div>
      </div>

      {/* Trim sliders as accessible fallback */}
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Inicio</span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={trimStart}
            onChange={(e) => {
              const v = Math.min(parseFloat(e.target.value), trimEnd - 0.5);
              setTrimStart(v);
              onTrimChange(v, trimEnd);
            }}
            className="w-full accent-[#FFC200] cursor-pointer"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Fin</span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={trimEnd}
            onChange={(e) => {
              const v = Math.max(parseFloat(e.target.value), trimStart + 0.5);
              const clamped = Math.min(v, trimStart + 30);
              setTrimEnd(clamped);
              onTrimChange(trimStart, clamped);
            }}
            className="w-full accent-[#FFC200] cursor-pointer"
          />
        </label>
      </div>

      {isOverLimit && (
        <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          El recorte es mayor a 30 segundos. Ajustá los handles antes de subir.
        </p>
      )}
    </div>
  );
}
