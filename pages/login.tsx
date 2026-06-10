// pages/login.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
    <div className="flex items-center justify-center min-h-screen bg-background">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-primary">Iniciar sesión</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <label className="block mb-2">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 mt-1"
            required
          />
        </label>
        <label className="block mb-4">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 mt-1"
            required
          />
        </label>
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary/80 transition"
        >
          Entrar
        </button>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleGoogle}
            className="text-sm text-primary hover:underline"
          >
            Continuar con Google
          </button>
        </div>
      </form>
    </div>
  );
}
