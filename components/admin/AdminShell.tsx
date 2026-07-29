'use client';

import { LogOut, Menu, Shield, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

const navigation = [
  { href: '/admin/inicio', label: 'Inicio', icon: '📊' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: '👑' },
  { href: '/admin/postulaciones', label: 'Postulaciones', icon: '📝' },
  { href: '/admin/testimonios', label: 'Testimonios', icon: '💬' },
  { href: '/admin/clasificaciones', label: 'Clasificaciones', icon: '🎵' },
  { href: '/admin/agenda', label: 'Agenda', icon: '📅' },
  { href: '/admin/nominados', label: 'Nominados', icon: '👥' },
  { href: '/admin/votos', label: 'Votos', icon: '📊' },
  { href: '/admin/operaciones', label: 'Otras operaciones', icon: '🛠️' },
];

const legacyShellRoutes = new Set([
  '/admin/operaciones',
  '/admin/postulaciones',
  '/admin/testimonios',
  '/admin/clasificaciones',
  '/admin/agenda',
  '/admin/nominados',
  '/admin/votos',
]);

export function AdminShell({
  adminEmail,
  children,
}: Readonly<{ adminEmail: string; children: React.ReactNode }>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (legacyShellRoutes.has(pathname)) {
    return children;
  }

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.assign('/');
  };

  const sidebar = (
    <>
      <div>
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Comunidad
        </p>
        <nav aria-label="Panel de Control" className="space-y-1">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-xl border-3 border-black px-3 py-2.5 font-display text-sm font-semibold shadow-[3px_3px_0_0_#FFD500] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#FFD500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#24262b] ${
                  active
                    ? 'bg-[#FFD500] text-black shadow-[3px_3px_0_0_#FFD500]'
                    : 'bg-[#1b1d22] text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto space-y-2 border-t-3 border-black pt-4">
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-xl border-3 border-black bg-white/5 py-2 font-display text-sm font-semibold text-gray-300 shadow-[3px_3px_0_0_#FFD500] hover:translate-x-[1px] hover:translate-y-[1px] hover:text-white hover:shadow-[2px_2px_0_0_#FFD500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#24262b]"
        >
          Volver al inicio
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-3 border-black bg-red-500/10 py-2 font-display text-sm font-semibold text-red-300 shadow-[3px_3px_0_0_#FFD500] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-red-500/20 hover:shadow-[2px_2px_0_0_#FFD500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#24262b]"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#1e1f22] font-sans text-gray-200 antialiased">
      <header className="sticky top-0 z-50 border-b-3 border-black bg-[#1b1d22] px-4 shadow-[0_4px_0_0_#FFD500] md:px-6">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1d22]">
            <span className="text-2xl" aria-hidden>🐣</span>
            <span className="truncate font-display text-base font-bold text-[#FFD500]">
              Team Pollito Comunidad
            </span>
          </Link>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <span className="flex items-center gap-1.5 rounded-lg border-3 border-black bg-[#FFD500] px-2.5 py-1 font-display text-[11px] font-semibold text-black shadow-[2px_2px_0_0_#FFD500]">
              <Shield className="h-3 w-3" /> Administrador
            </span>
            <span className="rounded-xl border-3 border-black bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200 shadow-[2px_2px_0_0_#FFD500]">
              {adminEmail}
            </span>
          </div>
          <button
            type="button"
            aria-label="Abrir navegación"
            onClick={() => setMobileMenuOpen(true)}
            className="ml-auto rounded-lg border-3 border-black bg-[#24262b] p-1.5 text-gray-200 shadow-[2px_2px_0_0_#FFD500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r-3 border-black bg-[#24262b] p-4 shadow-[4px_0_0_0_#FFD500] lg:flex">
          {sidebar}
        </aside>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Cerrar navegación"
              className="absolute inset-0 bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[260px] flex-col border-r-3 border-black bg-[#24262b] p-4 shadow-[4px_0_0_0_#FFD500]">
              <div className="mb-4 flex items-center justify-between border-b-3 border-black pb-4">
                <span className="text-xs font-semibold text-gray-400">Navegación</span>
                <button
                  type="button"
                  aria-label="Cerrar navegación"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border-3 border-black bg-white/5 p-1.5 text-gray-200 shadow-[2px_2px_0_0_#FFD500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {sidebar}
            </aside>
          </div>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
