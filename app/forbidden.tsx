import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-[#2b2d31] text-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-xl border border-neutral-700/60">
            🛡️
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-white leading-none">ACCESO RESTRINGIDO</h1>
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Permisos insuficientes</p>
          </div>
        </div>

        <p className="text-sm font-semibold text-gray-400 mb-6 leading-relaxed">
          Tu cuenta no posee permisos para entrar a este espacio del Panel de Control.
        </p>

        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#FFC200] px-4 py-3 font-display text-sm font-semibold text-black transition hover:brightness-105"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
