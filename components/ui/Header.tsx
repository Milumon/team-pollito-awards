import React from 'react';
import Link from 'next/link';
import { LogOut, Menu, X, Shield } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

type HeaderProps = {
  session: Session | null;
  isAdmin?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  panelName?: string;
  panelHref?: string;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
  showMobileToggle?: boolean;
  scrollToSection?: (section: string) => void;
  // Theme: 'light' for public pages, 'dark' for dashboards
  theme?: 'light' | 'dark';
};

export const Header: React.FC<HeaderProps> = ({
  session,
  isAdmin = false,
  onLogin,
  onLogout,
  panelName,
  panelHref,
  isMobileMenuOpen = false,
  setIsMobileMenuOpen,
  showMobileToggle = true,
  scrollToSection,
  theme = 'light',
}) => {
  const username = session?.user?.email?.split('@')[0] || 'Usuario';

  const isDark = theme === 'dark';
  const headerBg = isDark ? 'bg-[#1b1d22]' : 'bg-white/95 backdrop-blur-sm';
  const headerBorder = isDark ? 'border-b border-white/5' : 'border-b border-[#2D3139]/8';
  const textPrimary = isDark ? 'text-white' : 'text-[#2D3139]';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const brandColor = isDark ? 'text-[#FFC200]' : 'text-[#FFC200]';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const sessionBg = isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200/80';

  return (
    <header className={`${headerBg} ${headerBorder} py-0 px-4 md:px-6 sticky top-0 z-50 ${textPrimary} w-full`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center h-14">
        {/* Logo and Name */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0 text-left decoration-transparent group">
          <span className="text-2xl shrink-0 group-hover:scale-105 transition-transform duration-150">🐣</span>
          <span className={`font-display font-bold text-base tracking-tight ${brandColor} leading-none truncate`}>
            Milumon Community
          </span>
        </Link>

        {/* Navigation - Desktop */}
        {scrollToSection && (
          <nav className={`hidden md:flex items-center gap-5 font-display font-semibold text-sm ${textMuted} md:ml-10 md:mr-auto`}>
            {[
              { key: 'inicio', label: 'Inicio' },
              { key: 'beneficios', label: 'Beneficios' },
              { key: 'stats-evento', label: 'Eventos' },
              { key: 'timeline-ingreso', label: 'Cómo Ingresar' },
              { key: 'reglas-testimonios', label: 'Reglas' },
              { key: 'miembros', label: 'Miembros' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => scrollToSection(key)}
                className={`${hoverBg} hover:${isDark ? 'text-white' : 'text-[#2D3139]'} px-2 py-1 rounded-lg transition-all cursor-pointer text-sm`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Panel badge */}
          {panelName && panelHref && (
            <Link
              href={panelHref}
              className={`hidden sm:flex items-center gap-1.5 font-display font-semibold text-[11px] px-2.5 py-1 rounded-lg transition-all decoration-transparent ${
                isDark
                  ? 'bg-[#FFC200]/10 text-[#FFC200] hover:bg-[#FFC200]/15 border border-[#FFC200]/15'
                  : 'bg-[#FFC200]/10 text-[#D4A000] hover:bg-[#FFC200]/15 border border-[#FFC200]/20'
              }`}
            >
              <Shield className="w-3 h-3" />
              {panelName}
            </Link>
          )}

          {/* Admin panel access badge for desktop admins */}
          {isAdmin && panelHref !== '/admin' && (
            <Link
              href="/admin"
              className={`hidden sm:flex items-center gap-1.5 font-display font-semibold text-[11px] px-2.5 py-1 rounded-lg transition-all decoration-transparent ${
                isDark
                  ? 'bg-[#FFC200]/10 text-[#FFC200] hover:bg-[#FFC200]/15 border border-[#FFC200]/15'
                  : 'bg-[#FFC200]/10 text-[#D4A000] hover:bg-[#FFC200]/15 border border-[#FFC200]/20'
              }`}
            >
              <Shield className="w-3 h-3" />
              Panel Admin
            </Link>
          )}

          {/* Version badge (non-panel pages) */}
          {!panelName && (
            <span className={`hidden sm:inline-flex font-mono text-[10px] px-2 py-0.5 rounded-full ${
              isDark ? 'bg-white/5 text-gray-500 border border-white/5' : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}>
              v2.0
            </span>
          )}

          {/* Desktop User Session */}
          <div className="hidden md:flex items-center">
            {session ? (
              <div className={`flex items-center rounded-xl overflow-hidden h-8 ${sessionBg}`}>
                <div className="flex items-center gap-1.5 px-3 h-full">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                  <span className={`font-display font-semibold text-[11px] ${textMuted} whitespace-nowrap`}>
                    ¡Hola, <span className={`${brandColor} font-bold`}>{username}</span>!
                  </span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className={`flex items-center gap-1 px-2.5 transition-all cursor-pointer h-full focus:outline-none ${
                      isDark
                        ? 'hover:bg-white/5 text-gray-400 hover:text-red-400 border-l border-white/5'
                        : 'hover:bg-gray-100 text-gray-500 hover:text-red-500 border-l border-gray-200'
                    }`}
                    title="Salir"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-semibold font-display">Salir</span>
                  </button>
                )}
              </div>
            ) : (
              onLogin && (
                <button
                  onClick={onLogin}
                  className="flex items-center gap-1.5 font-display font-semibold text-sm bg-[#FFC200] hover:brightness-105 text-black px-4 py-1.5 rounded-xl transition-all cursor-pointer active:scale-[0.97]"
                >
                  🐣 Únete
                </button>
              )
            )}
          </div>

          {/* Mobile hamburger */}
          {showMobileToggle && setIsMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden p-1.5 rounded-lg transition-all cursor-pointer focus:outline-none ${
                isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
