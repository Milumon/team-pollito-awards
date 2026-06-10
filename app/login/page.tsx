// app/login/page.tsx
import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function LoginPage() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <>
      <Head>
        <title>Login – Pollitos Awards 2026</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-[#FFD700] p-4">
        <div className="bg-white rounded-xl shadow-xl border-4 border-black p-8 max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-4 text-center text-black">Iniciar sesión</h1>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-2 border-black p-2 rounded"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border-2 border-black p-2 rounded"
            />
            <button
              type="submit"
              className="w-full bg-black text-[#FFD700] hover:bg-neutral-900 font-bold py-2 rounded border-4 border-black"
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
