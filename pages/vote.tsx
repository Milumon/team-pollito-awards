// pages/vote.tsx
import { useEffect, useState } from 'react';
import { supabase, type Vote } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Nominee {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

// Placeholder nominees – replace with real data later
const placeholders: Nominee[] = [
  { id: '1', name: 'Pollito A', description: 'El más creativo' },
  { id: '2', name: 'Pollito B', description: 'El más divertido' },
  { id: '3', name: 'Pollito C', description: 'El más amable' },
];

export default function VotePage() {
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // In a real app fetch nominees from Supabase; using placeholders now
    setNominees(placeholders);
  }, []);

  const handleVote = async (nomineeId: string) => {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }
    const { error: insertError } = await supabase.from('votes').insert({
      user_id: session.user.id,
      nominee_id: nomineeId,
    } as any);
    if (insertError) {
      setError(insertError.message);
    } else {
      alert('¡Gracias por tu voto!');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center py-8 bg-background min-h-screen">
      <h1 className="text-3xl font-bold text-primary mb-6">Vota por tu Pollito favorito</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 w-full max-w-5xl">
        {nominees.map((n) => (
          <div key={n.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col items-center">
            {n.imageUrl ? (
              <img src={n.imageUrl} alt={n.name} className="w-24 h-24 object-cover rounded-full mb-2" />
            ) : (
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2 text-xl">🎉</div>
            )}
            <h2 className="text-xl font-semibold text-foreground mb-1">{n.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 text-center">{n.description}</p>
            <button
              onClick={() => handleVote(n.id)}
              disabled={loading}
              className="mt-auto bg-primary text-white px-4 py-2 rounded hover:bg-primary/80 transition"
            >
              {loading ? 'Votando…' : 'Votar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
