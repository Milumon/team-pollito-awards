'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Clock,
  AlertTriangle,
  Check,
  Lock,
  ShieldAlert,
  LogOut,
  Loader,
  Users,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

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

// Roles estáticos mapeados por Roblox username
const getMemberRole = (username: string) => {
  const name = username.toLowerCase().replace('@', '').trim();
  if (name.includes('milumon')) return 'Owner';
  if (name === 'zkylerrbx' || name === 'zkyler') return 'Admin';
  if (name === 'nekolixrbx' || name === 'nekolix') return 'Moderador';
  if (name === 'xioramrbx' || name === 'xioram') return 'Moderador';
  return 'Miembro';
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'Owner': return 'bg-yellow-400 text-black border-black';
    case 'Admin': return 'bg-red-500 text-white border-black';
    case 'Moderador': return 'bg-green-500 text-white border-black';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export default function ComunidadPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [statusInfo, setStatusInfo] = useState<InterviewStatus>({ status: 'none' });
  const [stats, setStats] = useState({
    totalProfiles: 2847,
    officialMembers: 147,
    pendingInterviews: 23,
    eventsThisMonth: 8,
  });

  // Loading states
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
  const [showHowItWorks, setShowHowItWorks] = useState(false);

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
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/comunidad/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
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
        redirectTo: `${window.location.origin}/`,
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
      fetchStats();
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleJoinClick = () => {
    if (!session) {
      handleLogin();
    } else {
      scrollToSection('admision');
    }
  };

  // Fetch initial data & auth state
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchMembers();
      fetchSlots();
      fetchStats();
    });

    supabase.auth.getSession().then((res) => {
      const currentSession = res.data?.session || null;
      Promise.resolve().then(() => {
        setSession(currentSession);
        if (currentSession) {
          setLoadingStatus(true);
          fetchUserStatus(currentSession.access_token);
        }
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, currentSession: Session | null) => {
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

  const sortedMembers = [...members].sort((a, b) => {
    const aIsStr = a.roblox_user.toLowerCase().includes('milumon');
    const bIsStr = b.roblox_user.toLowerCase().includes('milumon');
    if (aIsStr && !bIsStr) return -1;
    if (!aIsStr && bIsStr) return 1;
    return 0;
  });

  // Calendar Helpers (Mes Corriente)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthName = now.toLocaleString('es-ES', { month: 'long' }).toUpperCase();

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const totalDays = lastDay.getDate();

  // Ajustar semana LUN=0, DOM=6
  const startDayOfWeek = firstDay.getDay(); 
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const calendarCells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push(new Date(currentYear, currentMonth, d));
  }

  // Filtrar slots de la fecha seleccionada
  const selectedDateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : '';
  const activeDateSlots = slots.filter(s => s.slot_date === selectedDateStr);

  return (
    <div className="min-h-screen bg-[#FFD700] text-black selection:bg-black selection:text-[#FFD700] font-sans flex flex-col justify-between">
      <div id="inicio">
        {/* HEADER NAVBAR */}
        <header className="bg-white border-b-4 border-black py-4 px-6 sticky top-0 z-50 shadow-[0_4px_0_0_#000]">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🐣</span>
              <h1 className="font-display text-xl uppercase tracking-tight text-shadow-hard hidden sm:block">
                MILUMON COMMUNITY
              </h1>
              <h1 className="font-display text-xl uppercase tracking-tight text-shadow-hard sm:hidden">
                MILUMON
              </h1>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-6 font-comic text-xs font-black uppercase">
              <button onClick={() => scrollToSection('inicio')} className="hover:underline hover:text-orange-600 transition-all cursor-pointer">Inicio</button>
              <button onClick={() => scrollToSection('reglas')} className="hover:underline hover:text-orange-600 transition-all cursor-pointer">Reglas</button>
              <button onClick={() => scrollToSection('miembros')} className="hover:underline hover:text-orange-600 transition-all cursor-pointer">Miembros</button>
              <button onClick={() => scrollToSection('admision')} className="hover:underline hover:text-orange-600 transition-all cursor-pointer">Admisiones</button>
              <button onClick={() => scrollToSection('evento')} className="hover:underline hover:text-orange-600 transition-all cursor-pointer">Eventos</button>
            </nav>

            <div className="flex items-center gap-3">
              {session ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-yellow-50 border-2 border-black rounded-lg px-2.5 py-1">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-ping" />
                    <span className="font-comic text-[10px] font-black hidden lg:inline">
                      Hola, <span className="underline">{session.user.email?.split('@')[0]}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 font-comic text-[10px] font-black border-2 border-black bg-white hover:bg-red-100 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Salir
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-1.5 font-comic text-[10px] font-black border-2 border-black bg-black text-white hover:bg-yellow-400 hover:text-black px-4 py-2 rounded-lg brutalist-shadow-sm active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  🐣 ÚNETE A LA COMUNIDAD
                </button>
              )}
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <div className="max-w-6xl mx-auto px-4 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-12">
            {/* Left Col: Info */}
            <div className="md:col-span-7 space-y-6">
              <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl uppercase tracking-wide leading-none text-shadow-hard">
                BIENVENIDO A <br />
                <span className="text-white text-shadow-hard">MILUMON</span> <br />
                COMMUNITY
              </h2>
              <p className="font-comic text-sm sm:text-base font-bold text-black max-w-xl leading-relaxed">
                La comunidad oficial para fans de Milumon. Conéctate con otros pollitos, participa en eventos semanales y sé parte de algo legendario en Roblox y TikTok.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleJoinClick}
                  className="flex items-center gap-2 px-6 py-3.5 bg-[#FFD700] hover:bg-yellow-300 text-black font-comic text-sm uppercase font-black border-3 border-black rounded-xl shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  Únete a la comunidad
                </button>
                <button
                  onClick={() => scrollToSection('reglas')}
                  className="flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-gray-100 text-black font-comic text-sm uppercase font-black border-3 border-black rounded-xl shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                >
                  Conoce más
                </button>
              </div>
            </div>

            {/* Right Col: Mascot Frame */}
            <div className="md:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm aspect-square bg-[#ff9f1c] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#000] overflow-hidden flex items-center justify-center p-4">
                <img
                  src="/images/hero-chick.png"
                  alt="Milumon Chick Mascot"
                  className="w-full h-full object-contain drop-shadow-[4px_4px_0_rgba(0,0,0,0.55)]"
                  onError={(e) => {
                    // Fallback visual si el usuario aún no sube su archivo
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const div = document.createElement('div');
                      div.className = 'text-center space-y-2';
                      div.innerHTML = `
                        <div class='text-9xl animate-bounce'>🐣</div>
                        <div class='font-display text-lg uppercase bg-white border-2 border-black rounded-lg px-3 py-1 shadow-[2px_2px_0_0_#000]'>MILUMON</div>
                        <div class='font-comic text-[9px] text-black font-bold'>Colocá tu imagen en public/images/hero-chick.png</div>
                      `;
                      parent.appendChild(div);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* STATS / KPI ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0_0_#000] flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 border-2 border-black rounded-xl flex items-center justify-center text-xl shrink-0">
                👥
              </div>
              <div>
                <p className="font-display text-lg leading-none">
                  {loadingStats ? '...' : stats.totalProfiles.toLocaleString('es-ES')}
                </p>
                <p className="font-comic text-[9px] font-black text-gray-500 uppercase leading-none mt-1">Total Miembros</p>
              </div>
            </div>

            <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0_0_#000] flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 border-2 border-black rounded-xl flex items-center justify-center text-xl shrink-0">
                🛡️
              </div>
              <div>
                <p className="font-display text-lg leading-none">
                  {loadingStats ? '...' : stats.officialMembers.toLocaleString('es-ES')}
                </p>
                <p className="font-comic text-[9px] font-black text-gray-500 uppercase leading-none mt-1">Oficiales (VIP)</p>
              </div>
            </div>

            <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0_0_#000] flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 border-2 border-black rounded-xl flex items-center justify-center text-xl shrink-0">
                📅
              </div>
              <div>
                <p className="font-display text-lg leading-none">
                  {loadingStats ? '...' : stats.pendingInterviews}
                </p>
                <p className="font-comic text-[9px] font-black text-gray-500 uppercase leading-none mt-1">Próximas Citas</p>
              </div>
            </div>

            <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0_0_#000] flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 border-2 border-black rounded-xl flex items-center justify-center text-xl shrink-0">
                ⚡
              </div>
              <div>
                <p className="font-display text-lg leading-none">
                  {loadingStats ? '...' : stats.eventsThisMonth}
                </p>
                <p className="font-comic text-[9px] font-black text-gray-500 uppercase leading-none mt-1">Eventos este mes</p>
              </div>
            </div>
          </div>

          {/* MAIN GRID CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: RULES & MEMBERS (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* RULES SECTION */}
              <div id="reglas" className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000]">
                <h3 className="font-display text-xl uppercase mb-6 border-b-2 border-black pb-2 flex items-center gap-2">
                  📋 REGLAS GENERALES DE LA COMUNIDAD
                </h3>
                <div className="space-y-3">
                  {[
                    { id: '01', title: 'Respeto ante todo', desc: 'Sé amable y respeta a todos los miembros de la comunidad en Roblox y chats.' },
                    { id: '02', title: 'No spam ni autopromoción', desc: 'Mantén los chats de streams limpios, relevantes y libres de spam innecesario.' },
                    { id: '03', title: 'No toxicidad', desc: 'Cero tolerancia a comportamientos tóxicos, insultos o discriminación de cualquier tipo.' },
                    { id: '04', title: 'Sigue al staff', desc: 'Escucha y respeta las indicaciones de los moderadores y administradores del canal.' },
                    { id: '05', title: 'Diviértete', desc: '¡Disfruta, participa de los sorteos, del vivo y crea momentos increíbles con el equipo!' }
                  ].map(rule => (
                    <div key={rule.id} className="border-2 border-black p-3 rounded-xl flex items-center gap-4 bg-yellow-50/20">
                      <div className="bg-[#FFD700] text-black font-display text-sm border-2 border-black rounded-lg px-2 py-1 shadow-[2px_2px_0_0_#000] shrink-0">
                        {rule.id}
                      </div>
                      <div className="text-left">
                        <h4 className="font-display text-xs uppercase text-black leading-none mb-1">{rule.title}</h4>
                        <p className="font-comic text-[11px] font-bold text-gray-500 leading-snug">{rule.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <button 
                    onClick={() => alert('Próximamente se cargará el reglamento expandido del Team.')}
                    className="font-comic text-xs font-black underline hover:text-orange-600 cursor-pointer"
                  >
                    VER REGLAS COMPLETAS
                  </button>
                </div>
              </div>

              {/* MEMBERS SECTION */}
              <div id="miembros" className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000]">
                <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
                  <h3 className="font-display text-xl uppercase flex items-center gap-2">
                    👥 MIEMBROS OFICIALES ({members.length})
                  </h3>
                  <button
                    onClick={() => alert('Próximamente grilla expandida con filtros.')}
                    className="font-comic text-xs font-black uppercase underline hover:text-orange-600 cursor-pointer"
                  >
                    Ver todos &gt;
                  </button>
                </div>

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
                  <div className="max-h-[360px] overflow-y-auto pr-1.5 scrollbar-thin">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
                      {sortedMembers.map((member) => {
                        const role = getMemberRole(member.roblox_user);
                        const isStreamer = role === 'Owner';
                        
                        return (
                          <motion.div
                            key={member.roblox_user}
                            whileHover={{ scale: 1.03, y: -2 }}
                            className={`border-3 border-black p-3.5 rounded-2xl text-center flex flex-col items-center justify-between shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all relative ${isStreamer
                              ? 'bg-amber-100 border-amber-500 shadow-[4px_4px_0_0_#f97316]'
                              : 'bg-yellow-50/30'
                            }`}
                          >
                            <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 font-black text-[6.5px] uppercase tracking-wider px-1.5 py-0.5 border border-black rounded shadow-[1px_1px_0_0_#000] rotate-2 z-10 ${getRoleColor(role)}`}>
                              {role}
                            </span>
                            
                            <div className="mt-2.5">
                              {member.roblox_avatar_url ? (
                                <img
                                  src={member.roblox_avatar_url}
                                  alt={member.roblox_display_name}
                                  className={`w-14 h-14 rounded-full border-2 object-cover mb-2 ${isStreamer ? 'border-amber-500 ring-2 ring-amber-300' : 'border-black'
                                    }`}
                                />
                              ) : (
                                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl mb-2 ${isStreamer ? 'border-amber-500 bg-amber-200' : 'border-black bg-yellow-300'
                                  }`}>
                                  🐣
                                </div>
                              )}
                            </div>
                            
                            <p className="font-display text-[11px] uppercase text-black leading-none truncate max-w-full">
                              {member.roblox_display_name}
                            </p>
                            <p className="font-comic text-[9px] text-gray-500 font-bold mt-1 truncate max-w-full">
                              @{member.roblox_user}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ¿LISTO PARA UNIRTE? BANNER */}
              <div className="bg-black text-[#FFD700] border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0_0_#000] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left space-y-1 max-w-lg">
                  <h4 className="font-display text-xl uppercase tracking-wider text-white">¿LISTO PARA UNIRTE?</h4>
                  <p className="font-comic text-[11px] font-bold text-yellow-300 leading-snug">
                    Forma parte de una comunidad épica y participa en eventos interactivos en vivo, sonido en stream y sorteos de Roblox.
                  </p>
                </div>
                <button
                  onClick={handleJoinClick}
                  className="flex items-center gap-1.5 px-5 py-3 bg-[#FFD700] hover:bg-yellow-300 text-black font-display text-xs uppercase border-2 border-black rounded-xl shadow-[3px_3px_0_0_#fff] active:translate-y-0.5 active:shadow-none transition-all shrink-0 cursor-pointer"
                >
                  Únete ahora <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: ADMISSION / PROFILE & EVENT (4 cols) */}
            <div id="admision" className="lg:col-span-4 space-y-8">
              
              {/* CONDITIONAL AREA: CALENDAR (GUEST/CANDIDATE) OR PROFILE CARD (APPROVED VIP) */}
              {session && !loadingStatus && statusInfo.status === 'approved' ? (
                /* ================= VIP PROFILE PANEL ================= */
                <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000] space-y-5 text-center">
                  <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 to-amber-300 border-3 border-black rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-[3px_3px_0_0_#000] animate-bounce">
                    👑
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg uppercase">¡Ya sos Miembro Oficial!</h3>
                    <p className="font-comic text-[11px] font-bold text-gray-500 leading-relaxed max-w-xs mx-auto">
                      Formás parte del selecto **Team Pollito**. Tu vinculación está activa y tenés acceso a la Consola VIP en vivo.
                    </p>
                  </div>

                  <div className="bg-yellow-50/50 border-2 border-black p-3.5 rounded-2xl flex items-center gap-3.5 shadow-[2px_2px_0_0_#000]">
                    <div className="w-12 h-12 rounded-xl bg-white border-2 border-black overflow-hidden flex items-center justify-center shrink-0">
                      {statusInfo.avatar_url ? (
                        <img
                          src={statusInfo.avatar_url}
                          alt={statusInfo.roblox_user}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">🐣</span>
                      )}
                    </div>
                    <div className="text-left min-w-0 font-comic">
                      <span className="bg-[#ea580c] text-white border border-black rounded px-1.5 py-0.2 text-[7px] font-black uppercase tracking-wider">VIP MEMBER</span>
                      <p className="font-display text-xs uppercase text-black leading-none truncate mt-1">
                        @{statusInfo.roblox_user}
                      </p>
                      <p className="text-[9px] text-gray-500 font-bold mt-0.5 truncate">
                        TikTok: @{statusInfo.tiktok_user}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/console"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-[#FFD700] hover:bg-yellow-300 text-black font-display text-xs uppercase border-3 border-black rounded-xl shadow-[4px_4px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all decoration-transparent"
                    >
                      ✓ IR A LA CONSOLA VIP
                    </Link>
                  </div>
                </div>
              ) : (
                /* ================= ADMISSIONS CALENDAR / BOOKING ================= */
                <div className="space-y-6">
                  
                  {/* IF NOT LOGGED IN ACCORDION PANEL */}
                  {!session && (
                    <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000] text-center space-y-4">
                      <div className="w-12 h-12 bg-red-100 border-2 border-black rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6 text-red-600 stroke-[3]" />
                      </div>
                      <h3 className="font-display text-lg uppercase">Acceso de Admisión</h3>
                      <p className="font-comic text-[11px] font-bold text-gray-500 leading-relaxed">
                        Inicia sesión con Google para agendar tu entrevista de admisión los días viernes y vincular tus cuentas oficiales.
                      </p>
                      <button
                        onClick={handleLogin}
                        className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-comic text-xs uppercase font-black border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        🔐 INICIAR SESIÓN
                      </button>
                    </div>
                  )}

                  {/* LOADING STATE */}
                  {session && loadingStatus && (
                    <div className="bg-white border-4 border-black rounded-3xl p-8 shadow-[6px_6px_0_0_#000] text-center">
                      <motion.div className="mx-auto" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                        <Loader className="w-6 h-6 text-black" />
                      </motion.div>
                      <p className="font-comic text-[10px] font-black text-gray-500 uppercase mt-4">
                        Cargando tu estado...
                      </p>
                    </div>
                  )}

                  {/* PENDING INTERVIEW STATUS */}
                  {session && !loadingStatus && statusInfo.status === 'pending' && (
                    <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000] space-y-4 text-center">
                      <div className="w-12 h-12 bg-yellow-100 border-2 border-black rounded-full flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6 text-yellow-600 stroke-[3] animate-pulse" />
                      </div>
                      <h3 className="font-display text-lg text-yellow-700 uppercase">Entrevista Agendada</h3>
                      
                      <div className="bg-yellow-50 border-2 border-black p-3.5 rounded-2xl text-left space-y-1.5 font-comic text-xs">
                        <p className="font-bold text-gray-700">
                          📅 Fecha: <span className="font-black text-black">{statusInfo.interview_date ? formatDate(statusInfo.interview_date) : ''}</span>
                        </p>
                        <p className="font-bold text-gray-700">
                          🕒 Hora: <span className="font-black text-black">{statusInfo.interview_time ? formatTime(statusInfo.interview_time) : ''} hs</span>
                        </p>
                        <div className="border-t border-black/10 pt-1 text-[9px] text-gray-500">
                          <p>• Roblox: @{statusInfo.roblox_user}</p>
                          <p>• TikTok: @{statusInfo.tiktok_user}</p>
                        </div>
                      </div>
                      <p className="font-comic text-[10px] font-bold text-gray-400 leading-snug text-center">
                        Milumon te llamará en su stream. Tené Roblox abierto y estate atento al directo.
                      </p>
                    </div>
                  )}

                  {/* REJECTED STATUS FOR GUESTS */}
                  {session && !loadingStatus && statusInfo.status === 'rejected' && !isRescheduling && (
                    <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000] space-y-4 text-center">
                      <div className="w-12 h-12 bg-red-100 border-2 border-black rounded-full flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6 text-red-600 stroke-[3]" />
                      </div>
                      <h3 className="font-display text-lg text-red-700 uppercase">Solicitud Rechazada</h3>
                      
                      <div className="bg-red-50 border-2 border-black p-3 rounded-xl space-y-1.5 font-comic text-left">
                        <p className="font-black text-red-700 text-[10px]">Motivo brindado:</p>
                        <p className="text-[10px] text-gray-800 bg-white border border-black p-2 rounded-lg italic font-bold">
                          &quot;{statusInfo.rejection_reason || 'Datos inválidos en Roblox/TikTok.'}&quot;
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setRobloxUser(statusInfo.roblox_user || '');
                          setTiktokUser(statusInfo.tiktok_user || '');
                          setIsReturning(false);
                          setIsRescheduling(true);
                        }}
                        className="w-full py-3 bg-[#ea580c] hover:bg-orange-600 text-white font-comic text-xs uppercase font-black border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                      >
                        Corregir y Re-agendar
                      </button>
                    </div>
                  )}

                  {/* THE INTERACTIVE CALENDAR FOR BOOKING */}
                  {session && !loadingStatus && showBookingForm && (
                    <div className="bg-white border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0_0_#000] space-y-4">
                      
                      <div className="border-b-2 border-black pb-2">
                        <h3 className="font-display text-base uppercase flex items-center gap-1.5">
                          📅 ADMISIÓN: {monthName} {currentYear}
                        </h3>
                        <p className="font-comic text-[9px] text-gray-400 font-bold uppercase leading-none mt-1">Todos los viernes de entrevistas</p>
                      </div>

                      {formSuccess && (
                        <div className="bg-green-50 border-2 border-black p-4 rounded-xl text-center space-y-2">
                          <Check className="w-7 h-7 text-green-600 mx-auto stroke-[3]" />
                          <p className="font-display text-sm text-green-800 uppercase leading-none">¡Reservado!</p>
                          <p className="font-comic text-[11px] text-green-700 font-bold">Tu entrevista fue registrada. Recargá la página si no ves tu horario.</p>
                          <button 
                            onClick={() => { setFormSuccess(false); setSelectedDate(null); setSelectedSlotId(''); }} 
                            className="font-comic text-[10px] font-black underline cursor-pointer block mx-auto"
                          >
                            Volver
                          </button>
                        </div>
                      )}

                      {!formSuccess && (
                        <div>
                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1 text-center font-comic text-[9px] font-black text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">
                            <div>Lun</div>
                            <div>Mar</div>
                            <div>Mié</div>
                            <div>Jue</div>
                            <div>Vie</div>
                            <div>Sáb</div>
                            <div>Dom</div>
                          </div>
                          
                          <div className="grid grid-cols-7 gap-1.5">
                            {calendarCells.map((cell, idx) => {
                              if (!cell) {
                                return <div key={`empty-${idx}`} className="aspect-square" />;
                              }
                              
                              const cellDateStr = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`;
                              const cellSlots = slots.filter(s => s.slot_date === cellDateStr);
                              const hasSlots = cellSlots.length > 0;
                              const isFriday = cell.getDay() === 5;
                              const isSelected = selectedDate && selectedDate.getDate() === cell.getDate();

                              let cellBg = 'bg-white hover:bg-gray-50';
                              let cellText = 'text-black';
                              let cellBorder = 'border border-gray-200';
                              
                              if (isFriday) {
                                cellBg = 'bg-yellow-400/20';
                                cellBorder = 'border-2 border-[#FFD700]';
                                if (hasSlots) {
                                  cellBg = 'bg-[#FFD700] hover:bg-yellow-300';
                                  cellBorder = 'border-2 border-black';
                                }
                              }
                              
                              if (isSelected) {
                                cellBg = 'bg-black text-white';
                                cellBorder = 'border-2 border-black';
                                cellText = 'text-white';
                              }

                              return (
                                <button
                                  key={`day-${cell.getDate()}`}
                                  type="button"
                                  disabled={!hasSlots}
                                  onClick={() => {
                                    setSelectedDate(cell);
                                    setSelectedSlotId(''); // reset slots
                                  }}
                                  className={`aspect-square rounded-lg flex flex-col items-center justify-center font-comic text-xs font-black transition-all active:scale-95 ${cellBg} ${cellText} ${cellBorder} ${hasSlots ? 'cursor-pointer' : 'opacity-40 cursor-default'}`}
                                >
                                  <span>{cell.getDate()}</span>
                                  {hasSlots && (
                                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-black'}`} />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-4">
                            <button
                              type="button"
                              onClick={() => setShowHowItWorks(prev => !prev)}
                              className="flex-1 py-2 bg-white hover:bg-gray-50 text-black font-comic text-[10px] font-black border-2 border-black rounded-lg active:scale-95 transition-all text-center cursor-pointer"
                            >
                              CÓMO FUNCIONA
                            </button>
                          </div>

                          {/* How it works modal details */}
                          {showHowItWorks && (
                            <div className="bg-yellow-50 border-2 border-black p-3.5 rounded-xl text-left font-comic text-[10.5px] mt-3 space-y-1 leading-snug">
                              <p className="font-black text-black">💡 GUÍA RÁPIDA:</p>
                              <p>1. Seleccioná un día viernes resaltado en amarillo en el calendario.</p>
                              <p>2. Elegí una de las horas libres listadas abajo.</p>
                              <p>3. Completá tus nombres reales de Roblox y TikTok.</p>
                              <p>4. Conectate el día acordado al vivo de Milumon en TikTok para tu charla 1:1.</p>
                            </div>
                          )}

                          {/* Slots and booking forms */}
                          {selectedDate && (
                            <div className="mt-4 space-y-4 pt-4 border-t-2 border-dashed border-gray-200">
                              <p className="font-comic text-[10px] font-black uppercase text-gray-400">
                                Horarios disponibles ({activeDateSlots.length}):
                              </p>
                              
                              {activeDateSlots.length === 0 ? (
                                <p className="font-comic text-xs font-bold text-red-500">No hay horarios libres para esta fecha.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {activeDateSlots.map(s => {
                                    const isSel = selectedSlotId === s.id;
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSelectedSlotId(s.id)}
                                        className={`px-3 py-1.5 rounded-lg border-2 font-comic text-[11px] font-black transition-all active:scale-95 cursor-pointer ${isSel ? 'bg-black text-yellow-400 border-black' : 'bg-white hover:bg-gray-50 text-black border-gray-300'}`}
                                      >
                                        {formatTime(s.slot_time)}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {selectedSlotId && (
                                <form onSubmit={handleBook} className="space-y-4 pt-2">
                                  <div className="flex border-2 border-black rounded-lg overflow-hidden text-center text-[10px] font-black uppercase">
                                    <button
                                      type="button"
                                      onClick={() => { setIsReturning(false); setFormError(null); }}
                                      className={`flex-grow py-1.5 ${!isReturning ? 'bg-yellow-400 text-black' : 'bg-white text-gray-400'}`}
                                    >
                                      Nuevo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setIsReturning(true); setFormError(null); }}
                                      className={`flex-grow py-1.5 border-l-2 border-black ${isReturning ? 'bg-[#ea580c] text-white' : 'bg-white text-gray-400'}`}
                                    >
                                      Re-Ingreso
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    <div>
                                      <label className="block text-[10px] font-black uppercase mb-0.5">Usuario Roblox</label>
                                      <input
                                        type="text"
                                        value={robloxUser}
                                        onChange={(e) => setRobloxUser(e.target.value)}
                                        placeholder="Ej: MilumonRoblox"
                                        className="w-full px-2.5 py-1.5 border-2 border-black rounded-lg font-comic text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-black uppercase mb-0.5">Usuario TikTok</label>
                                      <input
                                        type="text"
                                        value={tiktokUser}
                                        onChange={(e) => setTiktokUser(e.target.value)}
                                        placeholder="Ej: @Milumon"
                                        className="w-full px-2.5 py-1.5 border-2 border-black rounded-lg font-comic text-xs focus:outline-none focus:ring-1 focus:ring-yellow-400"
                                      />
                                    </div>

                                    {isReturning && (
                                      <div className="space-y-2 pt-1 border-t border-gray-100">
                                        <div>
                                          <label className="block text-[10px] font-black uppercase mb-0.5">¿Motivo del ban?</label>
                                          <textarea
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                            rows={2}
                                            className="w-full px-2.5 py-1.5 border-2 border-black rounded-lg font-comic text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-black uppercase mb-0.5">¿Por qué deberías volver?</label>
                                          <textarea
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            rows={2}
                                            className="w-full px-2.5 py-1.5 border-2 border-black rounded-lg font-comic text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {formError && (
                                    <div className="bg-red-50 border-2 border-black p-2.5 rounded-lg flex items-start gap-1.5">
                                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                      <p className="font-comic text-[10px] font-bold text-red-700 leading-snug">{formError}</p>
                                    </div>
                                  )}

                                  <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-full py-2.5 font-comic text-xs font-black uppercase border-2 border-black rounded-lg shadow-[3px_3px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 ${isReturning ? 'bg-orange-500 hover:bg-orange-400 text-white' : 'bg-yellow-400 hover:bg-yellow-300 text-black'}`}
                                  >
                                    {submitting ? 'Reservando...' : 'Confirmar Reserva'}
                                  </button>
                                </form>
                              )}
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

              {/* UPCOMING EVENT CARD */}
              <div id="evento" className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0_0_#000] space-y-4">
                <div className="flex justify-between items-center border-b-2 border-black pb-2">
                  <h3 className="font-display text-sm uppercase flex items-center gap-1.5">
                    ⭐ PRÓXIMO EVENTO
                  </h3>
                  <button
                    onClick={() => alert('Próximamente calendario completo de streams.')}
                    className="font-comic text-[10px] font-black uppercase underline hover:text-orange-600 cursor-pointer"
                  >
                    Ver calendario
                  </button>
                </div>
                
                <div className="flex items-stretch border-3 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_#000]">
                  {/* Date Badge */}
                  <div className="bg-black text-[#FFD700] w-20 flex flex-col justify-center items-center text-center p-2 shrink-0 select-none">
                    <span className="font-comic text-[9px] font-black uppercase leading-none mb-1">MAYO</span>
                    <span className="font-display text-3xl leading-none">24</span>
                  </div>
                  {/* Info */}
                  <div className="bg-white flex-1 p-3.5 text-left flex flex-col justify-between">
                    <div>
                      <h4 className="font-display text-xs uppercase text-black leading-tight">NOCHE DE JUEGOS</h4>
                      <p className="font-comic text-[9.5px] text-gray-500 font-bold leading-normal mt-0.5">Con Milumon y la comunidad</p>
                    </div>
                    <div className="mt-3.5 space-y-1 text-[9.5px] font-comic font-black text-gray-800">
                      <p className="flex items-center gap-1">🕒 Sábado 9:00 PM (hora Perú)</p>
                      <p className="flex items-center gap-1 text-[#9146ff]">🎮 En vivo por Twitch</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* FOOTER BRUTALISTA */}
      <footer className="mt-16 bg-black text-[#FFD700] border-t-4 border-black py-8 px-6 text-center select-none shrink-0 shadow-[0_-4px_0_0_#000]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-comic text-xs font-black">
          <p>© 2026 Comunidad Oficial del Team Pollito. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/awards" className="text-yellow-400 hover:text-white underline decoration-2 font-display uppercase tracking-wider text-[10px]">
              🏆 Resultados Históricos - Pollito Awards
            </Link>
          </div>
          <div className="flex items-center gap-4 text-white text-lg">
            <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-all">🎮</a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-all">📺</a>
            <a href="https://tiktok.com/@milumon_gaming" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-all">📱</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
