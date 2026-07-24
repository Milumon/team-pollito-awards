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
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Header } from '@/components/ui/Header';
import { NavBar } from '@/components/ui/NavBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TikTokRankingLanding } from '@/components/tiktok-rankings/RankingViews';

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
  testimonial?: string | null;
  testimonial_approved?: boolean;
  is_admin?: boolean;
  already_interviewed?: boolean;
};

type VerifiedRobloxProfile = {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  username: string;
};

type Testimonial = {
  roblox_display_name: string;
  roblox_user: string;
  roblox_avatar_url: string | null;
  testimonial: string;
};

// Roles estáticos mapeados por Roblox username
const getMemberRole = (username: string) => {
  const name = username.toLowerCase().replace('@', '').trim();
  if (name.includes('milumon')) return 'Admin 🐣';
  return 'Pollito Oficial 🐣';
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'Admin 🐣': return 'bg-sky-50 text-sky-700 border border-sky-200'; 
    default: return 'bg-gray-50 text-gray-600 border border-gray-200';
  }
};

export default function ComunidadPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [statusInfo, setStatusInfo] = useState<InterviewStatus>({ status: 'none' });

  // Testimonials States
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [userTestimonial, setUserTestimonial] = useState('');
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialSuccess, setTestimonialSuccess] = useState(false);
  const [testimonialError, setTestimonialError] = useState<string | null>(null);
  const [isEditingTestimonial, setIsEditingTestimonial] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);

  // Modal Rules State
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Loading states
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
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
  const [alreadyInterviewed, setAlreadyInterviewed] = useState(false);
  const [verifiedRobloxProfile, setVerifiedRobloxProfile] = useState<VerifiedRobloxProfile | null>(null);
  const [robloxProfileConfirmed, setRobloxProfileConfirmed] = useState(false);
  const [verifyingRoblox, setVerifyingRoblox] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isDuplicate, setIsDuplicate] = useState(false);
  const [conflictedEmail, setConflictedEmail] = useState('');
  const [forceClaim, setForceClaim] = useState(false);
  const [claimReason, setClaimReason] = useState('');
  const [comingSoon, setComingSoon] = useState(false);

  const isAdmin = statusInfo?.is_admin || false;

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

  const fetchUserStatus = async (token: string) => {
    try {
      const res = await fetch('/api/interviews/my-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        console.log('DEBUG: /api/interviews/my-status devolvió:', data);
        setStatusInfo(data);
        if (data.testimonial) {
          setUserTestimonial(data.testimonial);
        }
        if (data.roblox_user) {
          setRobloxUser(data.roblox_user);
          setVerifiedRobloxProfile({
            id: data.roblox_user_id || 0,
            displayName: data.roblox_user,
            avatarUrl: data.avatar_url || null,
            username: data.roblox_user,
          });
          setRobloxProfileConfirmed(true);
        }
        if (data.tiktok_user) {
          setTiktokUser(data.tiktok_user);
        }
      } else {
        const errText = await res.text();
        console.error('DEBUG ERROR: /api/interviews/my-status falló con status:', res.status, errText);
      }
    } catch (err) {
      console.error('DEBUG ERROR: Excepción en fetchUserStatus:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchTestimonials = async () => {
    try {
      const res = await fetch('/api/testimonials');
      if (res.ok) {
        const data = await res.json();
        setTestimonials(data);
      }
    } catch (err) {
      console.error('Error fetching testimonials:', err);
    } finally {
      setLoadingTestimonials(false);
    }
  };

  const handleSendTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestimonialError(null);
    setTestimonialSuccess(false);

    if (!userTestimonial.trim()) {
      setTestimonialError('La opinión no puede estar vacía.');
      return;
    }

    try {
      setTestimonialSubmitting(true);
      const token = session?.access_token;
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ testimonial: userTestimonial.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        setTestimonialError(data.error || 'Error al enviar la opinión.');
        return;
      }

      setTestimonialSuccess(true);
      setIsEditingTestimonial(false);
      setStatusInfo(prev => ({
        ...prev,
        testimonial: userTestimonial.trim(),
        testimonial_approved: false
      }));
      fetchTestimonials();

      // Cerrar modal automáticamente después de mostrar éxito
      setTimeout(() => {
        setShowTestimonialModal(false);
        setTestimonialSuccess(false);
      }, 2000);
    } catch {
      setTestimonialError('Error de red al enviar la opinión.');
    } finally {
      setTestimonialSubmitting(false);
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

  const resetRobloxVerification = () => {
    setVerifiedRobloxProfile(null);
    setRobloxProfileConfirmed(false);
    setIsDuplicate(false);
    setConflictedEmail('');
    setForceClaim(false);
    setClaimReason('');
  };

  const handleVerifyRobloxForInterview = async () => {
    setFormError(null);
    setIsDuplicate(false);
    setConflictedEmail('');

    if (!robloxUser.trim()) {
      setFormError('El nombre de usuario de Roblox es obligatorio.');
      return false;
    }

    try {
      setVerifyingRoblox(true);
      const token = session?.access_token;
      const res = await fetch('/api/profile/verify-roblox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ robloxUsername: robloxUser.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.isDuplicate) {
          setIsDuplicate(true);
          setConflictedEmail(data.conflictedEmail || '');
        }
        setVerifiedRobloxProfile(null);
        setRobloxProfileConfirmed(false);
        setFormError(data.error || 'No se pudo validar ese usuario de Roblox.');
        return false;
      }

      setVerifiedRobloxProfile({
        id: data.id,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl || null,
        username: robloxUser.trim(),
      });
      setRobloxProfileConfirmed(false);
      return true;
    } catch {
      setFormError('Ocurrió un error al consultar Roblox. Intenta nuevamente.');
      return false;
    } finally {
      setVerifyingRoblox(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!alreadyInterviewed && !selectedSlotId) {
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
    if (!robloxProfileConfirmed) {
      await handleVerifyRobloxForInterview();
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
          slotId: alreadyInterviewed ? null : selectedSlotId,
          robloxUsername: robloxUser.trim(),
          tiktokUsername: tiktokUser.trim(),
          isReturning,
          banReason: isReturning ? banReason.trim() : null,
          returnReason: isReturning ? returnReason.trim() : null,
          testimonial: userTestimonial.trim() || null,
          alreadyInterviewed,
          forceClaim,
          claimReason: forceClaim ? claimReason.trim() : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Error al agendar la entrevista.');
        return;
      }

      setFormSuccess(true);
      setIsRescheduling(false);
      setAlreadyInterviewed(false);
      resetRobloxVerification();
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
      fetchTestimonials();
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
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3139] selection:bg-[#FFB000] selection:text-black font-sans flex flex-col justify-between">
      <div id="inicio">
        {/* HEADER NAVBAR */}
        <Header
          session={session}
          isAdmin={isAdmin}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          scrollToSection={scrollToSection}
        />

        {/* Mobile Menu Panel */}
        <NavBar
          variant="drawer"
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          scrollToSection={scrollToSection}
          session={session}
          statusInfo={{ is_admin: isAdmin }}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        {/* CONTENEDOR PRINCIPAL */}
        <div className="max-w-6xl mx-auto px-4 mt-12 space-y-20">
          
          {/* HERO SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left Col: Info */}
            <div className="md:col-span-7 space-y-6">
              {session && statusInfo.status === 'approved' ? (
                <>
                  <div className="flex items-start gap-4">
                    <h2 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none text-[#2D3139] text-left">
                      ¡Bienvenido al Team, <br />
                      <span className="font-display font-bold text-4xl sm:text-5xl md:text-6xl block mt-1 tracking-tighter text-[#FFB000] text-shadow-hard-lg">
                        @{statusInfo.roblox_user || 'POLLITO'}!
                      </span>
                    </h2>
                    <span className="text-5xl md:text-6xl animate-bounce shrink-0 filter drop-shadow-[3px_3px_0_rgba(0,0,0,0.15)]">🐣</span>
                  </div>
                  <p className="font-sans text-sm sm:text-base font-semibold text-[#475569] max-w-xl leading-relaxed text-left">
                    Tu vinculación está activa. Ya eres parte del Team Pollito 🐣. Disfruta de la consola en vivo, dispara sonidos y animaciones en pantalla y destaca en el stream.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/console" className="decoration-transparent">
                      <Button variant="primary" size="lg">
                        ✓ Ir a la Consola
                      </Button>
                    </Link>
                    <Button variant="secondary" size="lg" onClick={() => scrollToSection('testimonios')}>
                      Dejar opinión
                    </Button>
                  </div>
                </>
              ) : session && statusInfo.status === 'pending' ? (
                <>
                  <div className="flex items-start gap-4">
                    <h2 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none text-[#2D3139] text-left">
                      ¡Hola, <br />
                      <span className="font-display font-bold text-4xl sm:text-5xl md:text-6xl block mt-1 tracking-tighter text-[#FFB000] text-shadow-hard-lg">
                        @{statusInfo.roblox_user || 'POLLITO'}!
                      </span>
                    </h2>
                    <span className="text-5xl md:text-6xl animate-bounce shrink-0 filter drop-shadow-[3px_3px_0_rgba(0,0,0,0.15)]">📅</span>
                  </div>
                  <p className="font-sans text-sm sm:text-base font-semibold text-[#475569] max-w-xl leading-relaxed text-left">
                    Tu entrevista de admisión ya está programada. Consulta los detalles de la fecha y el horario del stream de Milumon para participar en vivo.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="primary" size="lg" onClick={() => scrollToSection('admision')}>
                      Ver mi entrevista
                    </Button>
                    <Button variant="secondary" size="lg" onClick={() => scrollToSection('reglas-testimonios')}>
                      Reglas
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <h2 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none text-[#2D3139] text-left">
                      Bienvenidos a <br />
                      <span className="font-display font-bold text-5xl sm:text-6xl md:text-7xl block mt-1 tracking-tighter text-[#FFB000] text-shadow-hard-lg">
                        Milumon Community
                      </span>
                    </h2>
                    <span className="text-5xl md:text-6xl animate-bounce shrink-0 filter drop-shadow-[3px_3px_0_rgba(0,0,0,0.15)]">🐣</span>
                  </div>
                  <p className="font-sans text-sm sm:text-base font-semibold text-[#475569] max-w-xl leading-relaxed text-left">
                    La comunidad oficial para fans de Milumon. Conéctate con otros pollitos, participa en eventos semanales y sé parte de algo lindo en Roblox y TikTok.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="primary" size="lg" onClick={handleJoinClick}>
                      <Users className="w-4 h-4" />
                      Únete a la Comunidad
                    </Button>
                    <Button variant="secondary" size="lg" onClick={() => scrollToSection('timeline-ingreso')}>
                      ¿Cómo funciona?
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Right Col: Mascot / Avatar — sin marco brutalista */}
            <div className="md:col-span-5 flex justify-center">
              {session && statusInfo.status === 'approved' && statusInfo.avatar_url ? (
                <div className="relative w-full max-w-[280px] aspect-square">
                  <div className="absolute inset-0 bg-[#FFF9E6] rounded-3xl -rotate-3" />
                  <img
                    src={statusInfo.avatar_url}
                    alt={statusInfo.roblox_user}
                    className="relative w-full h-full object-cover rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
                  />
                  <span className="absolute -bottom-3 -right-3 text-4xl animate-bounce select-none">🐣</span>
                </div>
              ) : (
                <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#FFF9E6] rounded-3xl -rotate-3" />
                  <img
                    src="/images/hero-chick.png"
                    alt="Milumon Chick Mascot"
                    className="relative w-full h-full object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const div = document.createElement('div');
                        div.className = 'relative text-center';
                        div.innerHTML = `<div class='text-9xl animate-bounce select-none'>🐣</div>`;
                        parent.appendChild(div);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* BENEFICIOS SECTION */}
          <section id="beneficios" className="space-y-6 pt-8">
            <div className="text-center">
              <h3 className="font-display font-bold text-3xl tracking-tight leading-none text-[#2D3139]">
                ¿Qué obtienes al entrar? 🐣
              </h3>
              <p className="font-sans text-xs text-gray-500 font-bold mt-2">
                Beneficios especiales para toda el que sea Team Pollito
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { emoji: '🐣', title: 'Juega en vivo con Milumon', desc: 'Únete a las partidas de Roblox y diviértete.' },
                { emoji: '📣', title: 'Controla el Stream', desc: 'Envía divertidos sonidos y mensajes TTS en vivo.' },
                { emoji: '🎁', title: 'Sorteos de Robux', desc: 'Participa automáticamente en los sorteos del grupo.' },
                { emoji: '✨', title: 'Lluvia de Efectos', desc: 'Lanza animaciones de patitas y plumas en pantalla.' },
                { emoji: '⭐', title: 'Destaca tu Avatar', desc: 'Muestra tu personaje oficial en la lista de miembros.' },
                { emoji: '🤝', title: 'Conoce nuevos amigos', desc: 'Charla y juega con otros pollitos de la comunidad.' }
              ].map((b, i) => (
                <div key={i} className="bg-white border border-gray-200/80 p-7 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,.1)] hover:translate-y-[-2px] transition-all duration-200 flex flex-col items-start gap-4">
                  <span className="text-4xl">{b.emoji}</span>
                  <div className="text-left">
                    <h4 className="font-display font-bold text-base tracking-tight text-[#2D3139] leading-tight">
                      {b.title}
                    </h4>
                    <p className="font-sans text-sm text-gray-500 leading-relaxed mt-2">
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <TikTokRankingLanding />

          {/* TIMELINE DE INGRESO */}
          <section id="timeline-ingreso" className="space-y-8 pt-8">
            <div className="text-center">
              <h3 className="font-display font-bold text-3xl tracking-tight leading-none text-[#2D3139]">
                Cómo ingresar al Team Pollito 🐣
              </h3>
              <p className="font-sans text-sm text-gray-500 mt-2">
                Sigue estos 5 sencillos pasos para unirte
              </p>
            </div>
            {/* Desktop: horizontal con línea conectora */}
            <div className="relative">
              <div className="hidden md:block absolute top-5 left-[10%] right-[10%] h-px border-t border-dashed border-gray-200 z-0" />
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {[
                  { id: '1', title: 'Inicia Sesión', desc: 'Inicia sesión de forma rápida y segura con tu cuenta de Google.' },
                  { id: '2', title: 'Elige tu Horario', desc: 'Selecciona una fecha y hora libre en nuestro calendario de admisiones.' },
                  { id: '3', title: 'Vincula Cuentas', desc: 'Introduce tus nombres oficiales de Roblox y TikTok para tu verificación.' },
                  { id: '4', title: 'Entrevista en Vivo', desc: 'Preséntate en el stream en vivo de Milumon en la fecha que elegiste.' },
                  { id: '5', title: 'Acceso VIP', desc: '¡Listo! Si eres aprobado, obtendrás tu rango VIP y la consola de stream.' }
                ].map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-[#FFC200]/15 text-[#D4A000] font-display font-bold text-base flex items-center justify-center border border-[#FFC200]/30">
                      {step.id}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-[#2D3139] leading-tight">
                        {step.title}
                      </h4>
                      <p className="font-sans text-xs text-gray-500 leading-relaxed mt-1">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* REGLAS & TESTIMONIOS */}
          <section id="reglas-testimonios" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-8">
            {/* Reglas (5 cols) */}
            <div id="reglas" className="lg:col-span-5 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <span className="text-lg">📋</span>
                <h3 className="font-display font-bold text-xl text-[#2D3139]">Reglas principales</h3>
              </div>
              <div className="space-y-3">
                {[
                  { id: '01', title: 'Respeto ante todo', desc: 'Sé amable y respeta a todos los miembros.' },
                  { id: '02', title: 'No spam ni autopromoción', desc: 'Mantén el chat limpio y de calidad.' },
                  { id: '03', title: 'No toxicidad', desc: 'Cero tolerancia a comportamientos tóxicos.' }
                ].map(rule => (
                  <div key={rule.id} className="flex items-start gap-3 py-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#FFC200]/15 text-[#D4A000] font-display font-bold text-xs flex items-center justify-center border border-[#FFC200]/20">{rule.id}</span>
                    <div>
                      <h4 className="font-display font-semibold text-sm text-[#2D3139] leading-none">{rule.title}</h4>
                      <p className="font-sans text-xs text-gray-500 leading-snug mt-1">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowRulesModal(true)}
                className="w-full py-2.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97]"
              >
                Ver reglamento completo 📋
              </button>
            </div>

            {/* Opiniones Dinámicas (7 cols) */}
            <div id="testimonios" className="lg:col-span-7 bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,.06)] space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <span className="text-lg">⭐</span>
                <h3 className="font-display font-bold text-xl text-[#2D3139]">Lo que dicen los pollitos</h3>
              </div>
              
              {loadingTestimonials ? (
                <div className="flex justify-center items-center py-12">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                    <Loader className="w-8 h-8 text-[#FFC200]" />
                  </motion.div>
                </div>
              ) : testimonials.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <p className="font-sans text-sm text-gray-400">
                    No hay opiniones aprobadas aún.
                  </p>
                </div>
              ) : (
                <div className="space-y-0 max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin divide-y divide-gray-50">
                  {testimonials.map((t, idx) => (
                    <div key={idx} className="py-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                        {t.roblox_avatar_url ? (
                          <img src={t.roblox_avatar_url} alt={t.roblox_display_name} className="w-full h-full object-cover" style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }} />
                        ) : (
                          <span className="text-lg">🐣</span>
                        )}
                      </div>
                      <div className="text-left font-sans flex-grow">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-display font-semibold text-sm text-[#2D3139] leading-none">{t.roblox_display_name}</h4>
                            <span className="text-[10px] text-gray-400">@{t.roblox_user}</span>
                          </div>
                          <span className="text-xs text-amber-400">★★★★★</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mt-2 italic border-l-2 border-[#FFC200]/50 pl-2.5">
                          &quot;{t.testimonial}&quot;
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Dejar / editar opinión (Botón para abrir Modal) */}
              {session && statusInfo.status === 'approved' && (
                <div className="border-t border-gray-100 pt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setUserTestimonial(statusInfo.testimonial || '');
                      setShowTestimonialModal(true);
                      setTestimonialError(null);
                      setTestimonialSuccess(false);
                    }}
                    className="w-full sm:w-auto py-2.5 px-5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97] flex items-center justify-center gap-2"
                  >
                    <span>💬</span>
                    {statusInfo.testimonial ? 'Editar mi opinión' : 'Dejar mi opinión'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ADMISIÓN / VIP SECTION */}
          <section id="admision" className="pt-8">
            {session && !loadingStatus && statusInfo.status === 'approved' ? (
              null
            ) : (
              /* ================= ADMISSIONS CALENDAR / BOOKING ================= */
              <div className="max-w-3xl mx-auto w-full">
                
                {/* IF NOT LOGGED IN ACCORDION PANEL */}
                {!session && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-[0_4px_12px_rgba(0,0,0,.06)] text-center space-y-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="font-display font-bold text-lg leading-none text-[#2D3139]">Acceso de Admisión</h3>
                    <p className="font-sans text-sm text-gray-500 leading-relaxed">
                      Inicia sesión con Google para agendar tu entrevista de admisión los días viernes y vincular tus cuentas oficiales.
                    </p>
                    <button
                      onClick={handleLogin}
                      className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97]"
                    >
                      🔐 Iniciar Sesión con Google
                    </button>
                  </div>
                )}

                {/* LOADING STATE */}
                {session && loadingStatus && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-[0_4px_12px_rgba(0,0,0,.06)] text-center">
                    <motion.div className="mx-auto w-fit" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                      <Loader className="w-6 h-6 text-[#FFC200]" />
                    </motion.div>
                    <p className="font-sans text-sm text-gray-400 mt-4">Cargando tu estado...</p>
                  </div>
                )}

                {/* PENDING INTERVIEW STATUS */}
                {session && !loadingStatus && statusInfo.status === 'pending' && !isRescheduling && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,.06)] space-y-4 text-center">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto">
                      <Clock className="w-6 h-6 text-amber-500 animate-pulse" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-amber-600">Entrevista Agendada</h3>
                    
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-left space-y-1.5 font-sans text-sm">
                      {statusInfo.interview_date ? (
                        <>
                          <p className="text-gray-600">
                            📅 Fecha: <span className="font-semibold text-[#2D3139]">{formatDate(statusInfo.interview_date)}</span>
                          </p>
                          <p className="text-gray-600">
                            🕒 Hora: <span className="font-semibold text-[#2D3139]">{statusInfo.interview_time ? formatTime(statusInfo.interview_time) : ''} hs</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-[#2D3139] font-semibold text-xs flex items-center gap-1">
                          ⚡ Aprobación manual pendiente (Ya pasaste entrevista)
                        </p>
                      )}
                      <div className="border-t border-amber-100 pt-2 text-xs text-gray-400">
                        <p>• Roblox: @{statusInfo.roblox_user}</p>
                        <p>• TikTok: @{statusInfo.tiktok_user}</p>
                      </div>
                    </div>
                    <p className="font-sans text-xs text-gray-500 leading-snug">
                      {statusInfo.interview_date 
                        ? 'Milumon te llamará en su transmisión. Ten Roblox abierto y permanece atento al directo.'
                        : 'Tu solicitud de ingreso directo está siendo revisada por los administradores.'
                      }
                    </p>
                    <button
                      onClick={() => {
                        setRobloxUser(statusInfo.roblox_user || '');
                        setTiktokUser(statusInfo.tiktok_user || '');
                        setAlreadyInterviewed(statusInfo.already_interviewed || false);
                        resetRobloxVerification();
                        setIsRescheduling(true);
                      }}
                      className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-display font-semibold text-xs rounded-xl transition-all cursor-pointer mt-2"
                    >
                      Modificar datos / Reprogramar
                    </button>
                  </div>
                )}

                {/* REJECTED STATUS FOR GUESTS */}
                {session && !loadingStatus && statusInfo.status === 'rejected' && !isRescheduling && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,.06)] space-y-4 text-center">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-red-500 leading-none">Solicitud Rechazada</h3>
                    
                    <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl space-y-1.5 font-sans text-left">
                      <p className="font-semibold text-red-400 text-xs">Motivo brindado:</p>
                      <p className="text-sm text-gray-500 bg-white border border-red-100 p-2 rounded-lg italic">
                        &quot;{statusInfo.rejection_reason || 'Datos inválidos en Roblox/TikTok.'}&quot;
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setRobloxUser(statusInfo.roblox_user || '');
                        setTiktokUser(statusInfo.tiktok_user || '');
                        setIsReturning(false);
                        resetRobloxVerification();
                        setIsRescheduling(true);
                      }}
                      className="w-full py-2.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97]"
                    >
                      Corregir y Re-agendar
                    </button>
                  </div>
                )}

                {/* THE INTERACTIVE CALENDAR FOR BOOKING */}
                {session && !loadingStatus && showBookingForm && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.06)] space-y-4">
                    
                    <div className="border-b border-gray-100 pb-3 text-left">
                      <h3 className="font-display font-bold text-sm flex items-center gap-1.5 text-[#2D3139]">
                        📅 Entrevistas de Admisión
                      </h3>
                      <p className="font-sans text-xs text-gray-400 mt-0.5">Todos los viernes</p>
                    </div>

                    <p className="font-sans text-xs text-gray-600 leading-relaxed text-left border-b border-black/10 pb-2">
                      Agenda tu entrevista para conocer al equipo y formar parte de la comunidad.
                    </p>

                    {formSuccess && (
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center space-y-2 text-emerald-700">
                        <Check className="w-7 h-7 text-emerald-500 mx-auto" />
                        <p className="font-display font-semibold text-sm">¡Reservado!</p>
                        <p className="font-sans text-sm text-emerald-600">Tu entrevista fue registrada.</p>
                        <button 
                          onClick={() => { setFormSuccess(false); setSelectedDate(null); setSelectedSlotId(''); }} 
                          className="font-display font-bold text-[10px] underline cursor-pointer block mx-auto text-[#2D3139]"
                        >
                          VOLVER
                        </button>
                      </div>
                    )}

                    {!formSuccess && (
                      <div>
                        {/* Opción para saltar el calendario si ya fue entrevistado */}
                        <div className="flex items-center gap-2 bg-[#FCF9F2] border border-amber-200 rounded-xl p-3 text-left mb-4">
                          <input
                            type="checkbox"
                            id="already-interviewed"
                            checked={alreadyInterviewed}
                            onChange={(e) => {
                              setAlreadyInterviewed(e.target.checked);
                              if (e.target.checked) {
                                setSelectedSlotId('already-interviewed-temp');
                              } else {
                                setSelectedSlotId('');
                              }
                            }}
                            className="w-4 h-4 accent-[#FFC200] cursor-pointer"
                          />
                          <label htmlFor="already-interviewed" className="text-xs text-[#2D3139] font-medium cursor-pointer select-none">
                            Ya pasé mi entrevista en el directo de Milumon (Vincular directamente)
                          </label>
                        </div>

                        {!alreadyInterviewed ? (
                          <div>
                        {/* Calendar Month Header */}
                        <div className="flex justify-between items-center font-sans text-sm px-2 mb-3 text-gray-500">
                          <span className="font-semibold">&lt;</span>
                          <span className="font-display font-bold text-[#2D3139]">{monthName} {currentYear}</span>
                          <span className="font-semibold">&gt;</span>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center font-sans text-[10px] font-bold text-gray-500 uppercase mb-2 border-b border-black/10 pb-1">
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

                            let cellBg = 'bg-white hover:bg-[#FCF9F2]';
                            let cellText = 'text-[#2D3139]';
                            let cellBorder = 'border-3 border-black';
                            
                            if (isFriday) {
                              cellBg = 'bg-[#FFF9E6] hover:bg-[#FFF0C0]';
                              cellBorder = 'border border-[#FFC200]/30';
                              if (hasSlots) {
                                cellBg = 'bg-[#FFC200] hover:brightness-105 text-black';
                                cellBorder = 'border border-[#FFC200]';
                              }
                            }
                            
                            if (isSelected) {
                              cellBg = 'bg-[#FFC200] text-black';
                              cellBorder = 'border border-[#FFC200]';
                              cellText = 'text-black';
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
                                className={`aspect-square rounded-xl flex flex-col items-center justify-center font-display font-bold text-xs transition-all ${cellBg} ${cellText} ${cellBorder} ${hasSlots ? 'cursor-pointer' : 'opacity-30 cursor-default'}`}
                              >
                                <span>{cell.getDate()}</span>
                                {hasSlots && (
                                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-black' : 'bg-white'}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlotId('admission-help');
                              setShowHowItWorks(prev => !prev);
                            }}
                            className="w-full py-2.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97]"
                          >
                            Agendar entrevista
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowHowItWorks(prev => !prev);
                            }}
                            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-[#2D3139] border border-gray-200 font-display font-semibold text-sm rounded-xl transition-all cursor-pointer"
                          >
                            Cómo funciona
                          </button>
                        </div>

                        {/* How it works modal details */}
                        {showHowItWorks && (
                          <div className="bg-[#FCF9F2] border-3 border-black p-3.5 rounded-2xl text-left font-sans text-xs mt-3 space-y-1.5 leading-snug shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                            <p className="font-display font-bold text-[#FFB000]">💡 GUÍA RÁPIDA:</p>
                            <p>1. Selecciona un día viernes resaltado en amarillo en el calendario.</p>
                            <p>2. Elige una de las horas libres listadas abajo.</p>
                            <p>3. Completa tus nombres reales de Roblox y TikTok.</p>
                            <p>4. Conéctate el día acordado al directo de Milumon en TikTok para tu charla 1:1.</p>
                          </div>
                        )}

                        {/* Slots and booking forms */}
                        {selectedDate && (
                          <div className="mt-4 space-y-4 pt-4 border-t border-dashed border-gray-200">
                            <p className="font-sans text-[10px] font-bold uppercase text-gray-500 text-left">
                              Horarios disponibles ({activeDateSlots.length}):
                            </p>
                            
                            {activeDateSlots.length === 0 ? (
                              <p className="font-sans text-xs font-bold text-red-600 text-left">No hay horarios libres para esta fecha.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {activeDateSlots.map(s => {
                                  const isSel = selectedSlotId === s.id;
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => setSelectedSlotId(s.id)}
                                      className={`px-3 py-1.5 rounded-lg border font-display font-semibold text-sm transition-all cursor-pointer ${isSel ? 'bg-[#FFC200] text-black border-[#FFC200]' : 'bg-white hover:bg-gray-50 text-[#2D3139] border-gray-200'}`}
                                    >
                                      {formatTime(s.slot_time)}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {selectedSlotId && selectedSlotId !== 'admission-help' && (
                              <form onSubmit={handleBook} className="space-y-4 pt-2">
                                <div className="flex border border-gray-200 rounded-xl overflow-hidden text-center text-sm font-display font-semibold">
                                  <button
                                    type="button"
                                    onClick={() => { setIsReturning(false); setFormError(null); }}
                                    className={`flex-grow py-1.5 ${!isReturning ? 'bg-[#FFC200] text-black' : 'bg-gray-50 text-gray-400'}`}
                                  >
                                    Nuevo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setIsReturning(true); setFormError(null); }}
                                    className={`flex-grow py-1.5 border-l border-gray-200 ${isReturning ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-400'}`}
                                  >
                                    Re-Ingreso
                                  </button>
                                </div>

                                  <div className="space-y-2 text-left">
                                    <div>
                                      <label className="block text-xs font-sans font-medium text-gray-500 mb-0.5">Usuario Roblox</label>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={robloxUser}
                                          onChange={(e) => {
                                            setRobloxUser(e.target.value);
                                            resetRobloxVerification();
                                          }}
                                          placeholder="Ej: MilumonRoblox"
                                          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 text-[#2D3139]"
                                        />
                                        <button
                                          type="button"
                                          disabled={verifyingRoblox || !robloxUser.trim()}
                                          onClick={handleVerifyRobloxForInterview}
                                          className="px-4 py-2 bg-[#2b2d31] hover:bg-neutral-800 text-white font-display font-semibold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
                                        >
                                          {verifyingRoblox ? 'Validando...' : 'Validar'}
                                        </button>
                                      </div>
                                    </div>
                                    {isDuplicate && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                                        <p className="text-xs text-amber-800 font-sans font-medium">
                                          Esta cuenta ya está vinculada al correo <span className="font-semibold">{conflictedEmail}</span>. ¿Es tu cuenta de Roblox pero perdiste acceso a tu correo anterior?
                                        </p>
                                        <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={forceClaim}
                                            onChange={(e) => {
                                              setForceClaim(e.target.checked);
                                              if (e.target.checked) {
                                                setFormError(null);
                                              }
                                            }}
                                            className="rounded text-[#FFC200] focus:ring-[#FFC200]/30"
                                          />
                                          Solicitar vinculación de todas formas
                                        </label>
                                        {forceClaim && (
                                          <div className="mt-2">
                                            <label className="block text-[10px] font-sans font-semibold text-amber-800 mb-0.5">Explicación del reclamo (opcional)</label>
                                            <textarea
                                              value={claimReason}
                                              onChange={(e) => setClaimReason(e.target.value)}
                                              placeholder="Ej: Perdí mi correo anterior o cambié de cuenta principal"
                                              rows={2}
                                              className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg font-sans text-xs focus:outline-none text-gray-800"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div>
                                      <label className="block text-xs font-sans font-medium text-gray-500 mb-0.5">Usuario TikTok</label>
                                      <input
                                        type="text"
                                        value={tiktokUser}
                                        onChange={(e) => setTiktokUser(e.target.value)}
                                        placeholder="Ej: @Milumon"
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 text-[#2D3139]"
                                      />
                                    </div>
                                    {verifiedRobloxProfile && (
                                      <div className={`rounded-xl border p-3 ${robloxProfileConfirmed ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                        <div className="flex items-center gap-3">
                                          {verifiedRobloxProfile.avatarUrl ? (
                                            <img
                                              src={verifiedRobloxProfile.avatarUrl}
                                              alt={verifiedRobloxProfile.displayName}
                                              className="w-14 h-14 rounded-xl object-cover border border-white"
                                              style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }}
                                            />
                                          ) : (
                                            <div className="w-14 h-14 rounded-xl bg-white border border-amber-100 flex items-center justify-center text-2xl">
                                              🐣
                                            </div>
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <p className="font-display font-semibold text-sm text-[#2D3139] truncate">
                                              {verifiedRobloxProfile.displayName}
                                            </p>
                                            <p className="font-sans text-xs text-gray-500 truncate">
                                              @{verifiedRobloxProfile.username} · ID {verifiedRobloxProfile.id}
                                            </p>
                                            <p className={`font-sans text-[11px] font-semibold mt-1 ${robloxProfileConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                              {robloxProfileConfirmed ? 'Perfil confirmado' : 'Confirma que este es tu perfil de Roblox'}
                                            </p>
                                          </div>
                                        </div>

                                        {!robloxProfileConfirmed && (
                                          <div className="grid grid-cols-2 gap-2 mt-3">
                                            <button
                                              type="button"
                                              onClick={resetRobloxVerification}
                                              className="py-2 bg-white hover:bg-gray-50 text-[#2D3139] border border-gray-200 font-display font-semibold text-xs rounded-xl transition-all cursor-pointer"
                                            >
                                              Editar usuario
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setRobloxProfileConfirmed(true);
                                                setFormError(null);
                                              }}
                                              className="py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-display font-semibold text-xs rounded-xl transition-all cursor-pointer"
                                            >
                                              Sí, es mi perfil
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div>
                                      <label className="block text-xs font-sans font-medium text-gray-500 mb-0.5">Opinión (opcional)</label>
                                      <textarea
                                        value={userTestimonial}
                                        onChange={(e) => setUserTestimonial(e.target.value.substring(0, 150))}
                                        placeholder="Cuéntanos brevemente qué opinas del Team (Máx. 150 caracteres)"
                                        rows={2}
                                        maxLength={150}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 text-[#2D3139]"
                                      />
                                    </div>

                                    {isReturning && (
                                      <div className="space-y-2 pt-1 border-t border-gray-100">
                                        <div>
                                          <label className="block text-xs font-sans font-medium text-gray-500 mb-0.5">¿Motivo del ban?</label>
                                          <textarea
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 text-[#2D3139]"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-sans font-medium text-gray-500 mb-0.5">¿Por qué deberías volver?</label>
                                          <textarea
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 text-[#2D3139]"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {formError && (
                                    <div className="bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-start gap-1.5 text-red-500">
                                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                      <p className="font-sans text-sm">{formError}</p>
                                    </div>
                                  )}

                                  <button
                                    type="submit"
                                    disabled={submitting || (!robloxProfileConfirmed && !forceClaim)}
                                    className={`w-full py-2.5 font-display font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isReturning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[#FFC200] hover:brightness-105 text-black'} active:scale-[0.97]`}
                                  >
                                    {submitting ? 'Reservando...' : 'Enviar Postulación'}
                                  </button>
                                </form>
                              )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4 pt-2">
                        <p className="font-sans text-xs text-gray-500 text-left leading-relaxed">
                          Como ya has pasado la entrevista, por favor proporciona tus nombres oficiales de Roblox y TikTok para procesar tu aprobación de forma manual.
                        </p>
                        <form onSubmit={handleBook} className="space-y-4">
                          <div className="space-y-2 text-left">
                            <div>
                              <label className="block text-xs font-sans font-medium text-gray-500 mb-0.5">Usuario de Roblox</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={robloxUser}
                                  onChange={(e) => {
                                    setRobloxUser(e.target.value);
                                    resetRobloxVerification();
                                  }}
                                  placeholder="Ej: MilumonRoblox"
                                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 text-[#2D3139]"
                                />
                                <button
                                  type="button"
                                  disabled={verifyingRoblox || !robloxUser.trim()}
                                  onClick={handleVerifyRobloxForInterview}
                                  className="px-4 py-2 bg-[#2b2d31] hover:bg-neutral-800 text-white font-display font-semibold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
                                >
                                  {verifyingRoblox ? 'Validando...' : 'Validar'}
                                </button>
                              </div>
                            </div>
                            {isDuplicate && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                                <p className="text-xs text-amber-800 font-sans font-medium">
                                  Esta cuenta ya está vinculada al correo <span className="font-semibold">{conflictedEmail}</span>. ¿Es tu cuenta de Roblox pero perdiste acceso a tu correo anterior?
                                </p>
                                <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={forceClaim}
                                    onChange={(e) => {
                                      setForceClaim(e.target.checked);
                                      if (e.target.checked) {
                                        setFormError(null);
                                      }
                                    }}
                                    className="rounded text-[#FFC200] focus:ring-[#FFC200]/30"
                                  />
                                  Solicitar vinculación de todas formas
                                </label>
                                {forceClaim && (
                                  <div className="mt-2">
                                    <label className="block text-[10px] font-sans font-semibold text-amber-800 mb-0.5">Explicación del reclamo (opcional)</label>
                                    <textarea
                                      value={claimReason}
                                      onChange={(e) => setClaimReason(e.target.value)}
                                      placeholder="Ej: Perdí mi correo anterior o cambié de cuenta principal"
                                      rows={2}
                                      className="w-full px-2 py-1 bg-white border border-amber-200 rounded-lg font-sans text-xs focus:outline-none text-gray-800"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-sans font-medium text-gray-500 mb-0.5">Usuario de TikTok</label>
                              <input
                                type="text"
                                value={tiktokUser}
                                onChange={(e) => setTiktokUser(e.target.value)}
                                placeholder="Ej: @Milumon"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 text-[#2D3139]"
                              />
                            </div>
                            {verifiedRobloxProfile && (
                              <div className={`rounded-xl border p-3 ${robloxProfileConfirmed ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <div className="flex items-center gap-3">
                                  {verifiedRobloxProfile.avatarUrl ? (
                                    <img
                                      src={verifiedRobloxProfile.avatarUrl}
                                      alt={verifiedRobloxProfile.displayName}
                                      className="w-14 h-14 rounded-xl object-cover border border-white"
                                      style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }}
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-xl bg-white border border-amber-100 flex items-center justify-center text-2xl">
                                      🐣
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-display font-semibold text-sm text-[#2D3139] truncate">
                                      {verifiedRobloxProfile.displayName}
                                    </p>
                                    <p className="font-sans text-xs text-gray-500 truncate">
                                      @{verifiedRobloxProfile.username} · ID {verifiedRobloxProfile.id}
                                    </p>
                                    <p className={`font-sans text-[11px] font-semibold mt-1 ${robloxProfileConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {robloxProfileConfirmed ? 'Perfil confirmado' : 'Confirma que este es tu perfil de Roblox'}
                                    </p>
                                  </div>
                                </div>

                                {!robloxProfileConfirmed && (
                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                    <button
                                      type="button"
                                      onClick={resetRobloxVerification}
                                      className="py-2 bg-white hover:bg-gray-50 text-[#2D3139] border border-gray-200 font-display font-semibold text-xs rounded-xl transition-all cursor-pointer"
                                    >
                                      Editar usuario
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRobloxProfileConfirmed(true);
                                        setFormError(null);
                                      }}
                                      className="py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-display font-semibold text-xs rounded-xl transition-all cursor-pointer"
                                    >
                                      Sí, es mi perfil
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-sans font-medium text-gray-500 mb-0.5">Opinión (opcional)</label>
                              <textarea
                                value={userTestimonial}
                                onChange={(e) => setUserTestimonial(e.target.value.substring(0, 150))}
                                placeholder="Cuéntanos brevemente qué opinas del Team (Máx. 150 caracteres)"
                                rows={2}
                                maxLength={150}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 text-[#2D3139]"
                              />
                            </div>
                          </div>

                          {formError && (
                            <div className="bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-start gap-1.5 text-red-500">
                              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              <p className="font-sans text-sm">{formError}</p>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={submitting || (!robloxProfileConfirmed && !forceClaim)}
                            className="w-full py-2.5 font-display font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-[#FFC200] hover:brightness-105 text-black active:scale-[0.97]"
                          >
                            {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                  </div>
                )}

              </div>
            )}
          </section>

          {/* SECCIÓN MIEMBROS OFICIALES */}
          <section id="miembros" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,.06)] space-y-6 pt-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="font-display font-bold text-xl flex items-center gap-2 text-[#2D3139]">
                👥 Miembros Oficiales
              </h3>
              <button
                onClick={() => { setComingSoon(true); setTimeout(() => setComingSoon(false), 2500); }}
                className="px-3 py-1.5 text-sm font-sans text-gray-400 hover:text-[#2D3139] transition-colors cursor-pointer"
              >
                Ver todos →
              </button>
            </div>

            {comingSoon && (
              <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold text-gray-500 mb-3 text-center animate-fade-in">
                Próximamente grilla expandida con filtros.
              </div>
            )}

            {loadingMembers ? (
              <div className="flex justify-center items-center py-12">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                  <Loader className="w-8 h-8 text-[#FFC200]" />
                </motion.div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="font-sans text-sm text-gray-400">
                  No hay miembros oficiales registrados aún. ¡Sé el primero!
                </p>
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto pr-1.5 scrollbar-thin">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-1">
                  {sortedMembers.map((member) => {
                    const role = getMemberRole(member.roblox_user);
                    
                    return (
                      <motion.div
                        key={member.roblox_user}
                        whileHover={{ scale: 1.03, y: -2 }}
                        className="bg-white border border-gray-200/80 p-4 rounded-2xl text-center flex flex-col items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,.06)] hover:shadow-[0_8px_20px_rgba(0,0,0,.1)] transition-all"
                      >
                        <div className="w-14 h-14 rounded-full border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                          {member.roblox_avatar_url ? (
                            <img
                              src={member.roblox_avatar_url}
                              alt={member.roblox_display_name}
                              className="w-full h-full object-cover"
                              style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }}
                            />
                          ) : (
                            <span className="text-2xl">🐣</span>
                          )}
                        </div>
                        
                        <div className="w-full">
                          <p className="font-display font-bold text-xs text-[#2D3139] leading-none truncate">
                            {member.roblox_display_name}
                          </p>
                          <p className="font-sans text-[10px] text-gray-400 mt-0.5 truncate">
                            @{member.roblox_user}
                          </p>
                        </div>

                        <span className={`font-sans text-[9px] tracking-wide px-2 py-0.5 rounded-full ${getRoleColor(role)}`}>
                          {role}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

        </div>
      </div>

      {/* MODAL DE REGLAS COMPLETAS */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-[0_24px_80px_rgba(0,0,0,0.2)] relative">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 bg-gray-50 hover:bg-gray-100 rounded-xl w-8 h-8 flex items-center justify-center font-sans text-sm text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
              <span className="text-xl">📋</span>
              <h3 className="font-display font-bold text-xl text-[#2D3139]">Reglamento Completo</h3>
            </div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
              {[
                { id: '01', title: 'Respeto ante todo', desc: 'Sé amable y respeta a todos los miembros.' },
                { id: '02', title: 'No spam ni autopromoción', desc: 'Mantén el chat limpio y de calidad.' },
                { id: '03', title: 'No toxicidad', desc: 'Cero tolerancia a comportamientos tóxicos o discusiones agresivas.' },
                { id: '04', title: 'Sigue al staff', desc: 'Escucha y respeta las indicaciones de moderadores y administradores.' },
                { id: '05', title: 'Diviértete', desc: 'Disfruta al máximo, apoya a los demás y pásala de 10.' }
              ].map(rule => (
                <div key={rule.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#FFC200]/15 text-[#D4A000] font-display font-bold text-xs flex items-center justify-center border border-[#FFC200]/20">{rule.id}</span>
                  <div>
                    <h4 className="font-display font-semibold text-sm text-[#2D3139]">{rule.title}</h4>
                    <p className="font-sans text-xs text-gray-500 leading-snug mt-0.5">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowRulesModal(false)}
              className="mt-5 w-full py-2.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE DEJAR / EDITAR OPINIÓN */}
      {showTestimonialModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-[0_24px_80px_rgba(0,0,0,0.2)] relative">
            <button
              onClick={() => {
                setShowTestimonialModal(false);
                setTestimonialError(null);
                setTestimonialSuccess(false);
              }}
              className="absolute top-4 right-4 bg-gray-50 hover:bg-gray-100 rounded-xl w-8 h-8 flex items-center justify-center font-sans text-sm text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <span className="text-xl">💬</span>
              <h3 className="font-display font-bold text-xl text-[#2D3139]">
                {statusInfo.testimonial ? 'Editar mi opinión' : '¿Qué opinas de la comunidad?'}
              </h3>
            </div>

            <div className="space-y-4">
              {statusInfo.testimonial && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-left">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-display font-semibold text-xs text-gray-500">Tu opinión enviada:</span>
                    <span className={`font-display font-semibold text-[10px] px-2 py-0.5 rounded-full ${statusInfo.testimonial_approved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {statusInfo.testimonial_approved ? '✓ Aprobado' : '⏳ Pendiente'}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-gray-600 italic border-l-2 border-[#FFC200]/50 pl-2.5">
                    &quot;{statusInfo.testimonial}&quot;
                  </p>
                </div>
              )}

              <form onSubmit={handleSendTestimonial} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="font-display font-semibold text-sm text-[#2D3139] block">
                    Tu comentario
                  </label>
                  <textarea
                    value={userTestimonial}
                    onChange={(e) => setUserTestimonial(e.target.value.substring(0, 150))}
                    placeholder="Escribe tu opinión aquí..."
                    rows={3}
                    maxLength={150}
                    className="w-full px-3 py-2 bg-white border border-gray-200 text-[#2D3139] rounded-xl font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC200]/30 resize-none"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Máx. 150 caracteres. Aparece en la landing una vez aprobado.</span>
                    <span className={userTestimonial.length >= 140 ? 'text-amber-600 font-bold' : ''}>
                      {userTestimonial.length}/150
                    </span>
                  </div>
                </div>

                {testimonialError && (
                  <p className="text-red-500 font-sans text-xs flex items-center gap-1">
                    <span>✕</span> {testimonialError}
                  </p>
                )}
                {testimonialSuccess && (
                  <p className="text-emerald-600 font-sans text-xs flex items-center gap-1">
                    <span>✓</span> Opinión guardada. Pendiente de moderación.
                  </p>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTestimonialModal(false);
                      setTestimonialError(null);
                      setTestimonialSuccess(false);
                    }}
                    className="py-2 px-4 bg-white hover:bg-gray-50 text-[#2D3139] border border-gray-200 font-display font-semibold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={testimonialSubmitting || !userTestimonial.trim() || userTestimonial.trim() === statusInfo.testimonial}
                    className="py-2 px-5 bg-[#FFC200] hover:brightness-105 disabled:opacity-50 text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97]"
                  >
                    {testimonialSubmitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-16 border-t border-gray-200 py-8 px-6 select-none shrink-0 bg-[#FDFBF7]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐣</span>
            <span className="font-display font-bold text-sm text-[#2D3139]">Milumon Community</span>
            <span className="text-gray-300">|</span>
            <span className="font-sans text-xs text-gray-400">© 2025</span>
          </div>
          <div className="flex items-center gap-6 font-sans text-sm text-gray-400">
            <Link href="/awards" className="hover:text-[#2D3139] transition-colors">
              🏆 Pollito Awards
            </Link>
            <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="hover:text-[#2D3139] transition-colors">Discord</a>
            <a href="https://tiktok.com/@milumon_gaming" target="_blank" rel="noopener noreferrer" className="hover:text-[#2D3139] transition-colors">TikTok</a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#2D3139] transition-colors">YouTube</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
