'use client';

import { useState, useRef } from 'react';
import { Loader2, Image, Film, Upload } from 'lucide-react';

interface Session {
  access_token: string;
}

interface Props {
  session: Session | null;
  onSuccess: () => void;
}

export default function MediaUploadForm({ session, onSuccess }: Props) {
  const [mediaType, setMediaType] = useState<'image_audio' | 'video'>('image_audio');
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [cooldown, setCooldown] = useState('0');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName('');
    setImageFile(null);
    setAudioFile(null);
    setVideoFile(null);
    setCooldown('0');
    setIsPublic(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !name.trim()) return;
    if (mediaType === 'image_audio' && (!imageFile || !audioFile)) return;
    if (mediaType === 'video' && !videoFile) return;

    setSubmitting(true);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append('mediaType', mediaType);
      formData.append('name', name.trim());
      formData.append('suggestedCooldown', cooldown);
      formData.append('isPublic', String(isPublic));
      if (imageFile) formData.append('image', imageFile);
      if (audioFile) formData.append('audio', audioFile);
      if (videoFile) formData.append('video', videoFile);

      setStatus('Subiendo...');
      const response = await fetch('/api/console/media/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al enviar');

      reset();
      setStatus('✓ Enviado para revisión.');
      setTimeout(() => setStatus(null), 5000);
      onSuccess();
    } catch (err) {
      setStatus(err instanceof Error ? `✕ ${err.message}` : 'Error');
      setTimeout(() => setStatus(null), 6000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,.25)]">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Upload className="w-4 h-4 text-[#FFC200]" />
          <span className="font-display font-semibold text-sm text-white">Enviar Media</span>
        </div>
        <span className="text-[10px] text-gray-500 font-bold">{expanded ? '▲ Colapsar' : '▼ Expandir'}</span>
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 border-t border-neutral-700/40 pt-4">
          {/* Category selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Categoría</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaType('image_audio')}
                className={`py-2.5 rounded-xl border text-xs font-display font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mediaType === 'image_audio'
                    ? 'bg-[#FFC200]/10 text-[#FFC200] border-[#FFC200]/30'
                    : 'bg-[#35373d] text-gray-400 border-neutral-700/60 hover:text-white'
                }`}
              >
                <Image className="w-3.5 h-3.5" /> Imagen + Audio
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`py-2.5 rounded-xl border text-xs font-display font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mediaType === 'video'
                    ? 'bg-[#FFC200]/10 text-[#FFC200] border-[#FFC200]/30'
                    : 'bg-[#35373d] text-gray-400 border-neutral-700/60 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" /> Video
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi meme, Clip épico..."
              maxLength={40}
              className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors"
            />
          </div>

          {/* File uploads */}
          {mediaType === 'image_audio' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Imagen / GIF</label>
                <button
                  type="button"
                  onClick={() => imageRef.current?.click()}
                  className="w-full border border-dashed border-[#FFC200]/45 rounded-xl p-3 bg-[#35373d] hover:bg-[#3a3c42] cursor-pointer transition-colors text-center"
                >
                  <Image className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                  <p className="text-[9px] text-gray-400 font-medium truncate">{imageFile ? imageFile.name : 'Elegir imagen'}</p>
                </button>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Audio</label>
                <button
                  type="button"
                  onClick={() => audioRef.current?.click()}
                  className="w-full border border-dashed border-[#FFC200]/45 rounded-xl p-3 bg-[#35373d] hover:bg-[#3a3c42] cursor-pointer transition-colors text-center"
                >
                  <Upload className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                  <p className="text-[9px] text-gray-400 font-medium truncate">{audioFile ? audioFile.name : 'Elegir audio'}</p>
                </button>
                <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Video (máx 10s)</label>
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                className="w-full border border-dashed border-[#FFC200]/45 rounded-xl p-4 bg-[#35373d] hover:bg-[#3a3c42] cursor-pointer transition-colors text-center"
              >
                <Film className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400 font-medium truncate">{videoFile ? videoFile.name : 'Elegir video (MP4, WebM)'}</p>
              </button>
              <input ref={videoRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            </div>
          )}

          {/* Cooldown + Visibility */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Cooldown (seg)</label>
              <input
                type="number" min={0} max={300}
                value={cooldown}
                onChange={(e) => setCooldown(e.target.value)}
                className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Visibilidad</label>
              <button
                type="button"
                onClick={() => setIsPublic(p => !p)}
                className={`w-full h-[42px] rounded-xl border text-xs font-display font-semibold transition-all cursor-pointer ${
                  isPublic
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}
              >
                {isPublic ? '🌍 Público' : '🔒 Solo yo'}
              </button>
            </div>
          </div>

          {/* Status */}
          {status && (
            <p className={`text-xs font-semibold ${status.startsWith('✓') ? 'text-emerald-400' : status.startsWith('✕') ? 'text-red-400' : 'text-[#FFC200]'}`}>{status}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !name.trim() || (mediaType === 'image_audio' && (!imageFile || !audioFile)) || (mediaType === 'video' && !videoFile)}
            className="w-full py-3 bg-[#FFC200] hover:bg-[#ffe359] text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {submitting ? 'Enviando...' : 'Enviar para revisión'}
          </button>
        </form>
      )}
    </div>
  );
}
