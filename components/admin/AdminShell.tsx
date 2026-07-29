'use client';

import { LogOut, Menu, Shield, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { supabase } from '@/lib/supabaseClient';

const navigation = [
  { href: '/admin/inicio', label: 'Inicio', icon: '📊' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: '👑' },
];

export function AdminShell({
  adminEmail,
  children,
}: Readonly<{ adminEmail: string; children: React.ReactNode }>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 font-display text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[#FFC200]/10 text-[#FFC200]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto space-y-2 border-t border-white/5 pt-4">
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-xl bg-white/5 py-2 font-display text-sm font-semibold text-gray-300 hover:text-white"
        >
          Volver al inicio
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-500/10 py-2 font-display text-sm font-semibold text-red-400 hover:bg-red-500/15"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesion
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#1e1f22] font-sans text-gray-200 antialiased">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#1b1d22] px-4 md:px-6">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="text-2xl" aria-hidden>🐣</span>
            <span className="truncate font-display text-base font-bold text-[#FFC200]">
              Milumon Community
            </span>
          </Link>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <span className="flex items-center gap-1.5 rounded-lg border border-[#FFC200]/15 bg-[#FFC200]/10 px-2.5 py-1 font-display text-[11px] font-semibold text-[#FFC200]">
              <Shield className="h-3 w-3" /> Administrador
            </span>
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-300">
              {adminEmail}
            </span>
          </div>
          <button
            type="button"
            aria-label="Abrir navegacion"
            onClick={() => setMobileMenuOpen(true)}
            className="ml-auto rounded-lg p-1.5 text-gray-400 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-[260px] shrink-0 flex-col bg-[#24262b] p-4 lg:flex">
          {sidebar}
        </aside>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Cerrar navegacion"
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative flex h-full w-[260px] flex-col bg-[#24262b] p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-semibold text-gray-400">Navegacion</span>
                <button
                  type="button"
                  aria-label="Cerrar navegacion"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-white/5 p-1.5 text-gray-400"
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
