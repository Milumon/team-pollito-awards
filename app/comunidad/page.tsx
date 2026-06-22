'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Clock,
  AlertTriangle,
  Check,
  Lock,
  ArrowRight,
  ShieldAlert,
  LogOut,
  Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

type Member = {
  roblox_user: string;
  roblox_display_name: string;
  roblox_avatar_url: string | null;
};

type Slot = {
  id: string;
  slot_date: string;
  slot_time: string;
};

type InterviewStatus = {
  status: 'none' | 'pending' | 'official' | 'approved' | 'rejected';
  interview_date?: string;
  interview_time?: string;
  roblox_user?: string;
  tiktok_user?: string;
  ban_reason?: string;
  return_reason?: string;
  rejection_reason?: string;
  avatar_url?: string | null;
};

type SessionType = {
  access_token: string;
  user: {
    email?: string;
  };
} | null;

export default function ComunidadPage() {
  const [session, setSession] = useState<SessionType>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [statusInfo, setStatusInfo] = useState<InterviewStatus>({ status: 'none' });
  
  // Loading states (initialized to true since we fetch on mount)
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [robloxUser, setRobloxUser] = useState('');
  const [tiktokUser, setTiktokUser] = useState('');
  const [banReason, setBanReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const res = await fetch('/api/interviews/slots');
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchUserStatus = async (token: string) => {
    try {
      const res = await fetch('/api/interviews/my-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatusInfo(data);
      }
    } catch (err) {
      console.error('Error fetching interview status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/comunidad`,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSlotId) {
      setFormError('Por favor selecciona un horario para tu entrevista.');
      return;
    }
    if (!robloxUser.trim()) {
      setFormError('El nombre de usuario de Roblox es obligatorio.');
      return;
    }
    if (!tiktokUser.trim()) {
      setFormError('El nombre de usuario de TikTok es obligatorio.');
      return;
    }
    if (isReturning && (!banReason.trim() || !returnReason.trim())) {
      setFormError('Por favor completa todos los campos explicando tu situación.');
      return;
    }

    try {
      setSubmitting(true);
      const token = session?.access_token;
      const res = await fetch('/api/interviews/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          slotId: selectedSlotId,
          robloxUsername: robloxUser.trim(),
          tiktokUsername: tiktokUser.trim(),
          isReturning,
          banReason: isReturning ? banReason.trim() : null,
          returnReason: isReturning ? returnReason.trim() : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Error al agendar la entrevista.');
        return;
      }

      setFormSuccess(true);
      setIsRescheduling(false);
      fetchSlots();
      if (token) {
        fetchUserStatus(token);
      }
    } catch {
      setFormError('Ocurrió un error de red. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  // Fetch initial data & auth state
  useEffect(() => {
    // Run fetching as a deferred microtask to satisfy set-state-in-effect
    Promise.resolve().then(() => {
      fetchMembers();
      fetchSlots();
    });

    // Check auth session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      Promise.resolve().then(() => {
        setSession(currentSession);
        if (currentSession) {
          setLoadingStatus(true);
          fetchUserStatus(currentSession.access_token);
        }
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      Promise.resolve().then(() => {
        setSession(currentSession);
        if (currentSession) {
          setLoadingStatus(true);
          fetchUserStatus(currentSession.access_token);
        } else {
          setStatusInfo({ status: 'none' });
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const showBookingForm = statusInfo.status === 'none' || statusInfo.status === 'rejected' || isRescheduling;

  return (
    <div className="min-h-screen bg-[#FFD700] text-black selection:bg-black selection:text-[#FFD700] font-sans pb-16">
      
      {/* HEADER NAVBAR */}
      <header className="bg-white border-b-4 border-black py-4 px-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-comic font-black text-xs border-2 border-black bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 rounded-lg active:scale-95 transition-all text-black decoration-transparent">
              ← IR A VOTACIÓN
            </Link>
            <h1 className="font-display text-2xl uppercase tracking-tight text-shadow-hard shrink-0 hidden sm:block">
              🐣 TEAM POLLITO
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <span className="font-comic text-xs font-black hidden md:block">
                  Hola, <span className="underline decoration-2">{session.user.email}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 font-comic text-xs font-black border-2 border-black bg-white hover:bg-gray-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-1.5 font-comic text-xs font-black border-2 border-black bg-white hover:bg-gray-100 px-4 py-1.5 rounded-lg brutalist-shadow-sm active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                🔐 ENTRAR CON GOOGLE
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="bg-white border-4 border-black p-8 rounded-3xl brutalist-shadow text-center relative overflow-hidden mb-12">
          <div className="absolute top-2 right-2 opacity-10 font-display text-9xl -rotate-12 select-none">🐣</div>
          <h2 className="font-display text-4xl sm:text-5xl uppercase mb-3 tracking-wide">
            PORTAL DE COMUNIDAD
          </h2>
          <p className="font-comic text-sm sm:text-base font-bold text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Unite al Team Pollito oficial, reservá tu entrevista de admisión los días viernes y compartí momentos interactivos en vivo con Milumon.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDE: RULES & MEMBERS (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* RULES CARD */}
            <div className="bg-white border-4 border-black rounded-3xl p-6 brutalist-shadow">
              <h3 className="font-display text-xl uppercase mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                📋 REGLAS GENERALES DEL TEAM
              </h3>
              <ul className="space-y-3.5 font-comic text-sm font-bold text-gray-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0">🐤</span>
                  <span><strong>Respeto Mutuo:</strong> Respetar a Milumon y a todos los miembros de la comunidad en los chats, streams y en Roblox. No se toleran insultos ni actitudes tóxicas.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0">🐤</span>
                  <span><strong>Uso de la Consola:</strong> No spamear audios o TTS en vivo. El uso irresponsable de la consola VIP resultará en la pérdida inmediata de los privilegios.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0">🐤</span>
                  <span><strong>Puntualidad en Entrevistas:</strong> Si agendás un horario los viernes, por favor conectate al directo de Milumon en ese bloque de tiempo.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0">🐤</span>
                  <span><strong>Nick Oficial 🐣:</strong> Llevar con orgullo el prefijo 🐣 en Roblox una vez aprobado. Representás al Team Pollito.</span>
                </li>
              </ul>
            </div>

            {/* MEMBERS LIST */}
            <div className="bg-white border-4 border-black rounded-3xl p-6 brutalist-shadow">
              <h3 className="font-display text-xl uppercase mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                🌟 MIEMBROS OFICIALES ({members.length})
              </h3>

              {loadingMembers ? (
                <div className="flex justify-center items-center py-12">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                    <Loader className="w-8 h-8 text-black" />
                  </motion.div>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12 bg-yellow-50 rounded-2xl border-2 border-dashed border-gray-300">
                  <p className="font-comic text-xs font-bold text-gray-500 uppercase">
                    No hay miembros oficiales registrados aún. ¡Sé el primero!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {members.map((member) => (
                    <motion.div
                      key={member.roblox_user}
                      whileHover={{ scale: 1.03, y: -2 }}
                      className="bg-yellow-50/50 border-3 border-black p-3.5 rounded-2xl text-center flex flex-col items-center justify-between shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all"
                    >
                      {member.roblox_avatar_url ? (
                        <img
                          src={member.roblox_avatar_url}
                          alt={member.roblox_display_name}
                          className="w-16 h-16 rounded-full border-2 border-black object-cover mb-2"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-black bg-yellow-300 flex items-center justify-center text-xl mb-2">
                          🐣
                        </div>
                      )}
                      <p className="font-display text-sm uppercase text-black leading-none truncate max-w-full">
                        {member.roblox_display_name}
                      </p>
                      <p className="font-comic text-[10px] text-gray-600 font-bold mt-1 truncate max-w-full">
                        @{member.roblox_user}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDE: BOOKING & STATUS (4 cols) */}
          <div className="lg:col-span-4">
            
            {/* IF NOT LOGGED IN */}
            {!session && (
              <div className="bg-white border-4 border-black rounded-3xl p-6 brutalist-shadow text-center space-y-4 sticky top-24">
                <div className="w-14 h-14 bg-red-100 border-3 border-black rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7 text-red-600 stroke-[3]" />
                </div>
                <h3 className="font-display text-xl uppercase">Acceso Restringido</h3>
                <p className="font-comic text-xs font-bold text-gray-600 leading-relaxed">
                  Para agendar tu entrevista de viernes, verificar tu estado de postulación o acceder a privilegios, debes iniciar sesión con tu cuenta de Google.
                </p>
                <button
                  onClick={handleLogin}
                  className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-comic text-xs uppercase font-black border-2 border-black rounded-xl brutalist-shadow-sm active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  🔐 ENTRAR CON GOOGLE
                </button>
              </div>
            )}

            {/* IF LOGGED IN */}
            {session && (
              <div className="sticky top-24 space-y-6">
                
                {/* LOADING USER STATUS */}
                {loadingStatus && (
                  <div className="bg-white border-4 border-black rounded-3xl p-8 brutalist-shadow text-center">
                    <motion.div className="mx-auto" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                      <Loader className="w-8 h-8 text-black" />
                    </motion.div>
                    <p className="font-comic text-xs font-bold text-gray-600 uppercase mt-4">
                      Verificando tu estado...
                    </p>
                  </div>
                )}

                {/* APPROVED STATUS CARD */}
                {!loadingStatus && statusInfo.status === 'approved' && (
                  <div className="bg-white border-4 border-black rounded-3xl p-6 brutalist-shadow text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 border-4 border-black rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                      👑
                    </div>
                    <h3 className="font-display text-xl text-green-700 uppercase">¡Miembro Oficial!</h3>
                    
                    <div className="bg-orange-50 border-3 border-black p-3.5 rounded-2xl text-center flex flex-col items-center">
                      {statusInfo.avatar_url ? (
                        <img
                          src={statusInfo.avatar_url}
                          alt={statusInfo.roblox_user}
                          className="w-16 h-16 rounded-full border-2 border-black object-cover mb-2"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-black bg-yellow-300 flex items-center justify-center text-xl mb-2">
                          🐣
                        </div>
                      )}
                      <p className="font-comic text-xs font-bold text-gray-700">
                        Roblox: <span className="font-black text-black">@{statusInfo.roblox_user}</span>
                      </p>
                      <p className="font-comic text-xs font-bold text-gray-700">
                        TikTok: <span className="font-black text-black">@{statusInfo.tiktok_user}</span>
                      </p>
                    </div>

                    <p className="font-comic text-xs font-bold text-gray-600 leading-relaxed">
                      ¡Tu cuenta está vinculada y verificada! Ya podés interactuar en los directos utilizando la consola de interacción en vivo.
                    </p>
                    <Link
                      href="/"
                      className="block text-center w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-comic text-xs uppercase font-black border-2 border-black rounded-xl brutalist-shadow-sm active:translate-y-0.5 active:shadow-none transition-all decoration-transparent"
                    >
                      ✓ IR A LA CONSOLA EN VIVO
                    </Link>
                  </div>
                )}

                {/* PENDING STATUS CARD */}
                {!loadingStatus && statusInfo.status === 'pending' && (
                  <div className="bg-white border-4 border-black rounded-3xl p-6 brutalist-shadow space-y-4">
                    <div className="w-14 h-14 bg-yellow-100 border-3 border-black rounded-full flex items-center justify-center mx-auto">
                      <Clock className="w-7 h-7 text-yellow-600 stroke-[3] animate-pulse" />
                    </div>
                    <h3 className="font-display text-xl text-center text-yellow-700 uppercase">Entrevista Agendada</h3>
                    
                    <div className="bg-yellow-50 border-3 border-black p-4 rounded-2xl text-left space-y-2">
                      <p className="font-comic text-xs font-bold text-gray-800">
                        📅 Fecha: <span className="font-black text-black">{statusInfo.interview_date ? formatDate(statusInfo.interview_date) : 'Sin fecha'}</span>
                      </p>
                      <p className="font-comic text-xs font-bold text-gray-800">
                        🕒 Hora: <span className="font-black text-black">{statusInfo.interview_time ? formatTime(statusInfo.interview_time) : 'Sin hora'}</span>
                      </p>
                      <div className="border-t border-black/10 pt-2 text-[10px] font-comic text-gray-500">
                        <p>• Roblox: @{statusInfo.roblox_user}</p>
                        <p>• TikTok: @{statusInfo.tiktok_user}</p>
                      </div>
                    </div>

                    <p className="font-comic text-[11px] font-bold text-gray-600 leading-relaxed text-center">
                      Milumon te entrevistará en su directo de TikTok en este horario. ¡Estate conectado en Roblox y en el stream!
                    </p>
                  </div>
                )}

                {/* REJECTED STATUS CARD */}
                {!loadingStatus && statusInfo.status === 'rejected' && !isRescheduling && (
                  <div className="bg-white border-4 border-black rounded-3xl p-6 brutalist-shadow space-y-4">
                    <div className="w-14 h-14 bg-red-100 border-3 border-black rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-7 h-7 text-red-600 stroke-[3]" />
                    </div>
                    <h3 className="font-display text-xl text-center text-red-700 uppercase">Postulación Rechazada</h3>
                    
                    <div className="bg-red-50 border-3 border-black p-4 rounded-2xl space-y-2">
                      <p className="font-comic text-xs font-black text-red-700">Motivo del rechazo:</p>
                      <p className="font-comic text-xs text-gray-800 bg-white border-2 border-black p-2.5 rounded-xl italic font-bold">
                        &quot;{statusInfo.rejection_reason || 'Los datos brindados no son correctos o no coinciden en Roblox/TikTok.'}&quot;
                      </p>
                    </div>

                    <p className="font-comic text-[11px] font-bold text-gray-600 leading-relaxed text-center">
                      No te preocupes, podés corregir tus nombres oficiales y volver a agendar un horario para entrevistarte de nuevo.
                    </p>

                    <button
                      onClick={() => {
                        setRobloxUser(statusInfo.roblox_user || '');
                        setTiktokUser(statusInfo.tiktok_user || '');
                        setBanReason(statusInfo.ban_reason || '');
                        setReturnReason(statusInfo.return_reason || '');
                        setIsReturning(!!statusInfo.ban_reason);
                        setIsRescheduling(true);
                      }}
                      className="w-full py-3 bg-[#ea580c] hover:bg-orange-600 text-white font-comic text-xs uppercase font-black border-2 border-black rounded-xl brutalist-shadow-sm active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                    >
                      Corregir y Volver a Agendar
                    </button>
                  </div>
                )}

                {/* BOOKING FORM WORKFLOW */}
                {!loadingStatus && showBookingForm && (
                  <div className="bg-white border-4 border-black rounded-3xl p-5 brutalist-shadow space-y-4">
                    <h3 className="font-display text-xl uppercase border-b-2 border-black pb-2 flex items-center gap-2">
                      📅 AGENDAR ENTREVISTA
                    </h3>

                    {formSuccess && (
                      <div className="bg-green-50 border-2 border-black p-3.5 rounded-xl text-center space-y-2">
                        <Check className="w-8 h-8 text-green-600 mx-auto stroke-[3]" />
                        <p className="font-display text-sm text-green-800 uppercase leading-none">¡Entrevista Agendada!</p>
                        <p className="font-comic text-xs text-green-700 font-bold">Tu horario se registró con éxito en la agenda de Milumon.</p>
                      </div>
                    )}

                    {!formSuccess && (
                      <form onSubmit={handleBook} className="space-y-4">
                        
                        {/* TOGGLE WORKFLOW */}
                        <div className="flex border-2 border-black rounded-xl overflow-hidden text-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setIsReturning(false);
                              setFormError(null);
                            }}
                            className={`flex-1 py-2 font-comic text-[11px] font-black uppercase transition-all ${!isReturning ? 'bg-yellow-400 text-black' : 'bg-white text-gray-500'}`}
                          >
                            Postulante Nuevo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsReturning(true);
                              setFormError(null);
                            }}
                            className={`flex-1 py-2 font-comic text-[11px] font-black border-l-2 border-black uppercase transition-all ${isReturning ? 'bg-[#ea580c] text-white' : 'bg-white text-gray-500'}`}
                          >
                            Pedido Re-ingreso
                          </button>
                        </div>

                        {/* INPUTS */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-black uppercase text-black mb-1">Usuario de Roblox</label>
                            <input
                              type="text"
                              value={robloxUser}
                              onChange={(e) => setRobloxUser(e.target.value)}
                              placeholder="milumon_gamer"
                              className="w-full px-3 py-2 border-2 border-black rounded-xl font-comic text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black uppercase text-black mb-1">Usuario de TikTok</label>
                            <input
                              type="text"
                              value={tiktokUser}
                              onChange={(e) => setTiktokUser(e.target.value)}
                              placeholder="@milumon_gamer"
                              className="w-full px-3 py-2 border-2 border-black rounded-xl font-comic text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                          </div>

                          {/* IF RETURNING */}
                          {isReturning && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="space-y-3 overflow-hidden"
                            >
                              <div>
                                <label className="block text-[11px] font-black uppercase text-black mb-1">¿Por qué fuiste baneado?</label>
                                <textarea
                                  value={banReason}
                                  onChange={(e) => setBanReason(e.target.value)}
                                  placeholder="Ej: Spam de audios o mal comportamiento..."
                                  rows={2}
                                  className="w-full px-3 py-2 border-2 border-black rounded-xl font-comic text-xs focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-black uppercase text-black mb-1">¿Por qué querés regresar?</label>
                                <textarea
                                  value={returnReason}
                                  onChange={(e) => setReturnReason(e.target.value)}
                                  placeholder="Explicá tus motivos sinceros..."
                                  rows={2}
                                  className="w-full px-3 py-2 border-2 border-black rounded-xl font-comic text-xs focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* SLOTS LIST */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-black uppercase text-black border-b border-black/10 pb-1">
                            Selecciona un viernes libre:
                          </label>

                          {loadingSlots ? (
                            <div className="flex justify-center py-4">
                              <Loader className="w-5 h-5 text-black animate-spin" />
                            </div>
                          ) : slots.length === 0 ? (
                            <div className="bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-xl p-4 text-center">
                              <p className="font-comic text-[11px] font-bold text-gray-500">
                                🚫 No hay slots disponibles en este momento. Milumon los habilitará pronto.
                              </p>
                            </div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
                              {slots.map((slot) => {
                                const isSelected = selectedSlotId === slot.id;
                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => setSelectedSlotId(slot.id)}
                                    className={`w-full text-left p-2.5 rounded-xl border-2 font-comic text-xs font-bold transition-all flex items-center justify-between active:scale-98 ${isSelected
                                      ? 'bg-black text-yellow-400 border-black'
                                      : 'bg-white hover:bg-gray-50 text-slate-800 border-gray-200'
                                      }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-black text-[10px] uppercase text-gray-400 leading-none mb-1">
                                        {formatDate(slot.slot_date)}
                                      </span>
                                      <span className="font-bold text-xs">{formatTime(slot.slot_time)} hs</span>
                                    </div>
                                    <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-yellow-400' : 'text-gray-300'}`} />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* ERROR & ACTIONS */}
                        {formError && (
                          <div className="bg-red-50 border-2 border-black p-2.5 rounded-xl flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="font-comic text-[10.5px] font-bold text-red-700 leading-snug">{formError}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {isRescheduling && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsRescheduling(false);
                                setFormError(null);
                              }}
                              className="px-3 py-3 bg-white hover:bg-gray-100 text-black font-comic text-xs uppercase font-black border-2 border-black rounded-xl active:scale-95 transition-all"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={submitting || slots.length === 0}
                            className={`flex-grow py-3 text-black font-comic text-xs uppercase font-black border-2 border-black rounded-xl brutalist-shadow-sm active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isReturning ? 'bg-orange-500 hover:bg-orange-400' : 'bg-yellow-400 hover:bg-yellow-300'}`}
                          >
                            {submitting ? 'Guardando...' : 'Confirmar Reserva'}
                          </button>
                        </div>

                      </form>
                    )}
                  </div>
                )}
                
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
