import Link from 'next/link';
import { Menu, Shield, X } from 'lucide-react';

type AdminHeaderProps = {
  adminEmail: string;
  mobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
};

export function AdminHeader({ adminEmail, mobileMenuOpen, onMobileMenuToggle }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-700/60 bg-[#1b1d22] px-4 shadow-[0_4px_12px_rgba(0,0,0,.25)] md:px-6">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-lg decoration-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1d22]"
        >
          <span className="text-2xl" aria-hidden="true">🐣</span>
          <span className="whitespace-nowrap font-display text-base font-bold text-[#FFD500]">Team Pollito Comunidad</span>
        </Link>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Link
            href="/panel/inicio"
            className="flex items-center gap-1.5 rounded-lg border border-[#FFC200]/20 bg-[#FFC200]/10 px-3 py-2 font-display text-xs font-semibold text-[#FFC200] transition-colors hover:bg-[#FFC200]/15"
          >
            <Shield className="h-3.5 w-3.5" /> Panel del Miembro
          </Link>
          <span className="rounded-xl border border-neutral-700/60 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300">
            {adminEmail}
          </span>
        </div>

        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Cerrar navegación' : 'Abrir navegación'}
          aria-expanded={mobileMenuOpen}
          onClick={onMobileMenuToggle}
          className="ml-auto rounded-lg border border-neutral-700/60 bg-[#24262b] p-1.5 text-gray-200 transition-colors hover:bg-neutral-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC200] lg:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
