"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { BALLOT_LAYOUT } from "../../../src/config/ballotLayout";
import { supabase } from "../../../lib/supabaseClient";

interface Point {
  x: number;
  y: number;
  radius?: number;
  maxWidth?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

interface Layout {
  userAvatar: Point & { radius: number };
  username: Point & { maxWidth: number; fontSize: number; color: string; fontFamily: string };
  mvpAvatar: Point & { radius: number };
  mvpName: Point & { maxWidth: number; fontSize: number; color: string; fontFamily: string };
}

interface Nominee {
  id: string;
  name: string;
  profileImageUrl: string | null;
}

export default function LayoutDebugPage() {
  const [layout, setLayout] = useState<Layout>({
    userAvatar: { ...BALLOT_LAYOUT.userAvatar },
    username: { ...BALLOT_LAYOUT.username },
    mvpAvatar: { ...BALLOT_LAYOUT.mvpAvatar },
    mvpName: { ...BALLOT_LAYOUT.mvpName },
  });

  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedUserNominee, setSelectedUserNominee] = useState<Nominee | null>(null);
  const [selectedMvpNominee, setSelectedMvpNominee] = useState<Nominee | null>(null);

  const [activeKey, setActiveKey] = useState<keyof Layout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const SCALE = 3; // 1080 / 3 = 360px width, 1920 / 3 = 640px height
  const [copied, setCopied] = useState(false);

  const handleMouseDown = (key: keyof Layout, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveKey(key);
  };

  useEffect(() => {
    async function loadNominees() {
      try {
        const { data, error } = await supabase
          .from("nominees")
          .select("id, roblox_user, nickname, profile_image_url");
        if (!error && data) {
          const mapped: Nominee[] = (data as { id: string; roblox_user: string | null; nickname: string | null; profile_image_url: string | null }[]).map((item) => ({
            id: item.id,
            name: String(item.nickname || item.roblox_user || ""),
            profileImageUrl: item.profile_image_url || null,
          }));
          setNominees(mapped);
          if (mapped.length > 0) {
            setSelectedUserNominee(mapped[0]);
          }
          if (mapped.length > 1) {
            setSelectedMvpNominee(mapped[1]);
          } else if (mapped.length > 0) {
            setSelectedMvpNominee(mapped[0]);
          }
        }
      } catch (err) {
        console.error("Error loading nominees for debug page:", err);
      }
    }
    loadNominees();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeKey || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      let clickX = e.clientX - rect.left;
      let clickY = e.clientY - rect.top;

      // Constrain inside container bounds (360 x 640)
      clickX = Math.max(0, Math.min(360, clickX));
      clickY = Math.max(0, Math.min(640, clickY));

      const realX = Math.round(clickX * SCALE);
      const realY = Math.round(clickY * SCALE);

      setLayout((prev) => ({
        ...prev,
        [activeKey]: {
          ...prev[activeKey],
          x: realX,
          y: realY,
        },
      }));
    };

    const handleMouseUp = () => {
      setActiveKey(null);
    };

    if (activeKey) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeKey]);

  const copyToClipboard = () => {
    const code = `export const BALLOT_LAYOUT = {
  userAvatar: {
    x: ${layout.userAvatar.x},
    y: ${layout.userAvatar.y},
    radius: ${layout.userAvatar.radius},
  },

  username: {
    x: ${layout.username.x},
    y: ${layout.username.y},
    maxWidth: ${layout.username.maxWidth},
    fontSize: ${layout.username.fontSize},
    color: '${layout.username.color}',
    fontFamily: '${layout.username.fontFamily}',
  },

  mvpAvatar: {
    x: ${layout.mvpAvatar.x},
    y: ${layout.mvpAvatar.y},
    radius: ${layout.mvpAvatar.radius},
  },

  mvpName: {
    x: ${layout.mvpName.x},
    y: ${layout.mvpName.y},
    maxWidth: ${layout.mvpName.maxWidth},
    fontSize: ${layout.mvpName.fontSize},
    color: '${layout.mvpName.color}',
    fontFamily: '${layout.mvpName.fontFamily}',
  }
};`;

    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans p-6 flex flex-col items-center">
      <header className="w-full max-w-6xl flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Calibrador de Ballot</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Arrastrá los elementos o editalos manualmente en el panel</p>
        </div>
        <Link href="/" className="bg-black hover:bg-neutral-900 text-yellow-400 font-bold px-4 py-2 rounded-xl border-2 border-black active:scale-95 transition-all text-xs uppercase">
          Volver al Sitio
        </Link>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COL 1: PREVIEW IMAGE */}
        <div className="lg:col-span-5 flex justify-center">
          <div 
            ref={containerRef}
            className="relative w-[360px] h-[640px] border-4 border-black rounded-[2rem] overflow-hidden bg-yellow-100 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] select-none"
          >
            {/* Template Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/story-templates/Plantilla.png" 
              alt="Ballot Template" 
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Draggable userAvatar */}
            <div
              onMouseDown={(e) => handleMouseDown("userAvatar", e)}
              className="absolute border-2 border-red-500 rounded-full bg-[#f5f5f5] flex items-center justify-center cursor-move hover:border-red-400 active:scale-95 transition-transform overflow-hidden shadow-md select-none"
              style={{
                left: `${layout.userAvatar.x / SCALE - layout.userAvatar.radius / SCALE}px`,
                top: `${layout.userAvatar.y / SCALE - layout.userAvatar.radius / SCALE}px`,
                width: `${(layout.userAvatar.radius * 2) / SCALE}px`,
                height: `${(layout.userAvatar.radius * 2) / SCALE}px`,
              }}
              title="Arrastrá para mover el avatar del usuario"
            >
              {selectedUserNominee?.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={selectedUserNominee.profileImageUrl} 
                  alt="Avatar User" 
                  className="w-full h-full object-cover pointer-events-none rounded-full"
                />
              ) : (
                <span className="text-2xl">👑</span>
              )}
              <div className="absolute inset-0 bg-red-500/10 hover:bg-transparent" />
            </div>

            {/* Draggable username */}
            <div
              onMouseDown={(e) => handleMouseDown("username", e)}
              className="absolute border-2 border-dashed border-blue-500/60 bg-blue-500/5 hover:bg-blue-500/10 cursor-move flex items-center justify-center text-center select-none font-black uppercase tracking-tight"
              style={{
                left: `${layout.username.x / SCALE - (layout.username.maxWidth / SCALE) / 2}px`,
                top: `${layout.username.y / SCALE - (layout.username.fontSize / SCALE) / 2}px`,
                width: `${layout.username.maxWidth / SCALE}px`,
                height: `${layout.username.fontSize / SCALE}px`,
                fontFamily: `"${layout.username.fontFamily || 'Anton'}", sans-serif`,
                fontWeight: (layout.username.fontFamily || 'Anton').toLowerCase().includes('anton') ? 400 : 800,
                fontSize: `${layout.username.fontSize / SCALE}px`,
                color: layout.username.color || "#000000",
                lineHeight: 1,
              }}
              title="Arrastrá para mover el nombre de usuario"
            >
              {selectedUserNominee ? selectedUserNominee.name : "MILUM_DEV"}
            </div>

            {/* Draggable mvpAvatar */}
            <div
              onMouseDown={(e) => handleMouseDown("mvpAvatar", e)}
              className="absolute border-2 border-red-500 rounded-full bg-[#f5f5f5] flex items-center justify-center cursor-move hover:border-red-400 active:scale-95 transition-transform overflow-hidden shadow-md select-none"
              style={{
                left: `${layout.mvpAvatar.x / SCALE - layout.mvpAvatar.radius / SCALE}px`,
                top: `${layout.mvpAvatar.y / SCALE - layout.mvpAvatar.radius / SCALE}px`,
                width: `${(layout.mvpAvatar.radius * 2) / SCALE}px`,
                height: `${(layout.mvpAvatar.radius * 2) / SCALE}px`,
              }}
              title="Arrastrá para mover el avatar de MVP"
            >
              {selectedMvpNominee?.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={selectedMvpNominee.profileImageUrl} 
                  alt="Avatar MVP" 
                  className="w-full h-full object-cover pointer-events-none rounded-full"
                />
              ) : (
                <span className="text-xl">🏆</span>
              )}
              <div className="absolute inset-0 bg-red-500/10 hover:bg-transparent" />
            </div>

            {/* Draggable mvpName */}
            <div
              onMouseDown={(e) => handleMouseDown("mvpName", e)}
              className="absolute border-2 border-dashed border-blue-500/60 bg-blue-500/5 hover:bg-blue-500/10 cursor-move flex items-center justify-center text-center select-none font-black uppercase tracking-tight"
              style={{
                left: `${layout.mvpName.x / SCALE - (layout.mvpName.maxWidth / SCALE) / 2}px`,
                top: `${layout.mvpName.y / SCALE - (layout.mvpName.fontSize * 1.5 / SCALE) / 2}px`,
                width: `${layout.mvpName.maxWidth / SCALE}px`,
                height: `${(layout.mvpName.fontSize * 1.5) / SCALE}px`,
                fontFamily: `"${layout.mvpName.fontFamily || 'Anton'}", sans-serif`,
                fontWeight: (layout.mvpName.fontFamily || 'Anton').toLowerCase().includes('anton') ? 400 : 800,
                fontSize: `${layout.mvpName.fontSize / SCALE}px`,
                color: layout.mvpName.color || "#000000",
                lineHeight: 1.1,
              }}
              title="Arrastrá para mover el nombre de MVP"
            >
              {selectedMvpNominee ? selectedMvpNominee.name : "EL POLLITO REY"}
            </div>
          </div>
        </div>

        {/* COL 2: CONTROLS & MANUAL FORM */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full">
            <h2 className="text-xl font-black uppercase mb-4 tracking-tight border-b-2 border-dashed border-gray-100 pb-2">Panel de Personalización</h2>
            
            <div className="flex flex-col gap-5">
              {/* Real Nominees Selector for Calibration */}
              <div className="bg-yellow-50 border-2 border-black rounded-2xl p-4">
                <p className="font-bold text-black uppercase tracking-widest text-xs mb-2 flex items-center gap-1.5">
                  🐣 Nominados Reales (Base de Datos)
                </p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-3 leading-snug">
                  Elegí cualquier nominado para ver cómo se renderizan su imagen y nombre reales en las coordenadas seleccionadas.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Usuario Principal</label>
                    <select
                      value={selectedUserNominee?.id || ""}
                      onChange={(e) => {
                        const found = nominees.find(n => n.id === e.target.value);
                        if (found) setSelectedUserNominee(found);
                      }}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-bold text-xs h-[34px]"
                    >
                      <option value="">Seleccionar...</option>
                      {nominees.map(n => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Nominado MVP</label>
                    <select
                      value={selectedMvpNominee?.id || ""}
                      onChange={(e) => {
                        const found = nominees.find(n => n.id === e.target.value);
                        if (found) setSelectedMvpNominee(found);
                      }}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-bold text-xs h-[34px]"
                    >
                      <option value="">Seleccionar...</option>
                      {nominees.map(n => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {/* SECTION: USER AVATAR */}
              <div className="bg-gray-50 border-2 border-black/10 rounded-2xl p-4">
                <p className="font-bold text-[#ea580c] uppercase tracking-widest text-xs mb-3">👤 Avatar Usuario</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Posición X</label>
                    <input 
                      type="number" 
                      value={layout.userAvatar.x} 
                      onChange={(e) => setLayout({...layout, userAvatar: {...layout.userAvatar, x: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Posición Y</label>
                    <input 
                      type="number" 
                      value={layout.userAvatar.y} 
                      onChange={(e) => setLayout({...layout, userAvatar: {...layout.userAvatar, y: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Radio (px)</label>
                    <input 
                      type="number" 
                      value={layout.userAvatar.radius} 
                      onChange={(e) => setLayout({...layout, userAvatar: {...layout.userAvatar, radius: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 flex justify-between mb-1">
                    <span>Tamaño del Avatar (Radio)</span>
                    <span className="font-mono font-bold">{layout.userAvatar.radius}px</span>
                  </label>
                  <input 
                    type="range"
                    min="30"
                    max="250"
                    value={layout.userAvatar.radius}
                    onChange={(e) => setLayout({...layout, userAvatar: {...layout.userAvatar, radius: Number(e.target.value)}})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                </div>
              </div>

              {/* SECTION: USERNAME */}
              <div className="bg-gray-50 border-2 border-black/10 rounded-2xl p-4">
                <p className="font-bold text-[#ea580c] uppercase tracking-widest text-xs mb-3">✍️ Nombre / Username</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Posición X</label>
                    <input 
                      type="number" 
                      value={layout.username.x} 
                      onChange={(e) => setLayout({...layout, username: {...layout.username, x: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Posición Y</label>
                    <input 
                      type="number" 
                      value={layout.username.y} 
                      onChange={(e) => setLayout({...layout, username: {...layout.username, y: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Tamaño (px)</label>
                    <input 
                      type="number" 
                      value={layout.username.fontSize} 
                      onChange={(e) => setLayout({...layout, username: {...layout.username, fontSize: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Límite Ancho</label>
                    <input 
                      type="number" 
                      value={layout.username.maxWidth} 
                      onChange={(e) => setLayout({...layout, username: {...layout.username, maxWidth: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Fuente</label>
                    <select 
                      value={layout.username.fontFamily}
                      onChange={(e) => setLayout({...layout, username: {...layout.username, fontFamily: e.target.value}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-bold text-sm h-[34px]"
                    >
                      <option value="Anton">Anton (Gruesa)</option>
                      <option value="Bricolage Grotesque">Bricolage Grotesque</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Impact">Impact</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Color de Texto</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={layout.username.color} 
                        onChange={(e) => setLayout({...layout, username: {...layout.username, color: e.target.value}})}
                        className="w-10 h-8 border-2 border-black rounded cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={layout.username.color} 
                        onChange={(e) => setLayout({...layout, username: {...layout.username, color: e.target.value}})}
                        className="flex-1 bg-white border-2 border-black rounded-lg px-2 py-1 font-mono text-sm uppercase font-bold"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 flex justify-between mb-1">
                      <span>Tamaño de Fuente</span>
                      <span className="font-mono font-bold">{layout.username.fontSize}px</span>
                    </label>
                    <input 
                      type="range"
                      min="12"
                      max="120"
                      value={layout.username.fontSize}
                      onChange={(e) => setLayout({...layout, username: {...layout.username, fontSize: Number(e.target.value)}})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 flex justify-between mb-1">
                      <span>Ancho Máximo</span>
                      <span className="font-mono font-bold">{layout.username.maxWidth}px</span>
                    </label>
                    <input 
                      type="range"
                      min="150"
                      max="1000"
                      value={layout.username.maxWidth}
                      onChange={(e) => setLayout({...layout, username: {...layout.username, maxWidth: Number(e.target.value)}})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: MVP AVATAR */}
              <div className="bg-gray-50 border-2 border-black/10 rounded-2xl p-4">
                <p className="font-bold text-[#ea580c] uppercase tracking-widest text-xs mb-3">🏆 Avatar MVP</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Posición X</label>
                    <input 
                      type="number" 
                      value={layout.mvpAvatar.x} 
                      onChange={(e) => setLayout({...layout, mvpAvatar: {...layout.mvpAvatar, x: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Posición Y</label>
                    <input 
                      type="number" 
                      value={layout.mvpAvatar.y} 
                      onChange={(e) => setLayout({...layout, mvpAvatar: {...layout.mvpAvatar, y: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Radio (px)</label>
                    <input 
                      type="number" 
                      value={layout.mvpAvatar.radius} 
                      onChange={(e) => setLayout({...layout, mvpAvatar: {...layout.mvpAvatar, radius: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 flex justify-between mb-1">
                    <span>Tamaño del Avatar MVP (Radio)</span>
                    <span className="font-mono font-bold">{layout.mvpAvatar.radius}px</span>
                  </label>
                  <input 
                    type="range"
                    min="30"
                    max="250"
                    value={layout.mvpAvatar.radius}
                    onChange={(e) => setLayout({...layout, mvpAvatar: {...layout.mvpAvatar, radius: Number(e.target.value)}})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                </div>
              </div>

              {/* SECTION: MVP NAME */}
              <div className="bg-gray-50 border-2 border-black/10 rounded-2xl p-4">
                <p className="font-bold text-[#ea580c] uppercase tracking-widest text-xs mb-3">👑 Nombre MVP</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Posición X</label>
                    <input 
                      type="number" 
                      value={layout.mvpName.x} 
                      onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, x: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Posición Y</label>
                    <input 
                      type="number" 
                      value={layout.mvpName.y} 
                      onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, y: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Tamaño (px)</label>
                    <input 
                      type="number" 
                      value={layout.mvpName.fontSize} 
                      onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, fontSize: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Límite Ancho</label>
                    <input 
                      type="number" 
                      value={layout.mvpName.maxWidth} 
                      onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, maxWidth: Number(e.target.value)}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-mono font-bold text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Fuente</label>
                    <select 
                      value={layout.mvpName.fontFamily}
                      onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, fontFamily: e.target.value}})}
                      className="w-full bg-white border-2 border-black rounded-lg px-2 py-1 font-bold text-sm h-[34px]"
                    >
                      <option value="Anton">Anton (Gruesa)</option>
                      <option value="Bricolage Grotesque">Bricolage Grotesque</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Impact">Impact</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Color de Texto</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={layout.mvpName.color} 
                        onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, color: e.target.value}})}
                        className="w-10 h-8 border-2 border-black rounded cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={layout.mvpName.color} 
                        onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, color: e.target.value}})}
                        className="flex-1 bg-white border-2 border-black rounded-lg px-2 py-1 font-mono text-sm uppercase font-bold"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 flex justify-between mb-1">
                      <span>Tamaño de Fuente</span>
                      <span className="font-mono font-bold">{layout.mvpName.fontSize}px</span>
                    </label>
                    <input 
                      type="range"
                      min="12"
                      max="120"
                      value={layout.mvpName.fontSize}
                      onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, fontSize: Number(e.target.value)}})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500 flex justify-between mb-1">
                      <span>Ancho Máximo</span>
                      <span className="font-mono font-bold">{layout.mvpName.maxWidth}px</span>
                    </label>
                    <input 
                      type="range"
                      min="150"
                      max="1000"
                      value={layout.mvpName.maxWidth}
                      onChange={(e) => setLayout({...layout, mvpName: {...layout.mvpName, maxWidth: Number(e.target.value)}})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className={`w-full py-4 px-6 rounded-2xl font-display text-base flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-95 border-4 border-black brutalist-shadow mt-6 font-extrabold ${
                copied 
                  ? "bg-emerald-400 text-black" 
                  : "bg-yellow-400 hover:bg-yellow-300 text-black border-b-6 hover:border-b-4"
              }`}
            >
              {copied ? "📋 ¡BALLOT_LAYOUT COPIADO!" : "📋 COPIAR CONFIGURACIÓN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
