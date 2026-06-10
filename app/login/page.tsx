"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/vote');
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setError(error.message);
  };

  return (
    <>
      <Head>
        <title>Login – Pollitos Awards 2026</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-[#FFD700] p-4 font-sans text-black">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2rem] border-4 border-black brutalist-shadow w-full max-w-md">
          <h2 className="text-4xl font-black mb-6 text-black tracking-tight text-center uppercase font-display">
            Iniciar sesión
          </h2>
          {error && (
            <div className="bg-red-50 border-2 border-black p-3 rounded-xl mb-4 text-xs font-bold text-red-600 font-comic">
              ⚠️ {error}
            </div>
          )}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-comic">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-4 border-black p-3 rounded-xl font-bold bg-yellow-50 focus:bg-white transition-colors text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-comic">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-4 border-black p-3 rounded-xl font-bold bg-yellow-50 focus:bg-white transition-colors text-sm"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-display font-black text-base tracking-wider rounded-xl border-4 border-black border-b-8 hover:border-b-4 transition-all cursor-pointer active:translate-y-1 block focus:outline-none uppercase"
          >
            Entrar 👉
          </button>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleGoogle}
              className="font-comic text-xs uppercase font-extrabold text-[#ea580c] hover:underline"
            >
              Continuar con Google
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
