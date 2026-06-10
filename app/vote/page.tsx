"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@/src/data/categories';
import { Category, Nominee as NomineeType } from '@/src/types';
import RobloxAvatar from '@/components/RobloxAvatar';

export default function VotePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatIdx, setActiveCatIdx] = useState(0);
  const [selectedNomineeId, setSelectedNomineeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<any>(null);
  const router = useRouter();

  // Load categories and check auth session
  useEffect(() => {
    setCategories(CATEGORIES);

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
      } else {
        setUserSession(session);
      }
    };
    checkSession();
  }, [router]);

  const handleVote = async () => {
    if (!selectedNomineeId) return;
    setLoading(true);
    setError(null);

    const activeCategory = categories[activeCatIdx];

    const { error: insertError } = await supabase.from('votes').insert({
      user_id: userSession?.user?.id,
      nominee_id: selectedNomineeId,
      category_id: activeCategory.id,
    } as any);

    if (insertError) {
      if (insertError.code === '23505') {
        setError('⚠️ Ya has votado en esta categoría.');
      } else {
        setError(insertError.message);
      }
    } else {
      alert('¡Voto guardado con éxito! 🎉');
      // Advance to next category if possible
      if (activeCatIdx < categories.length - 1) {
        setActiveCatIdx(activeCatIdx + 1);
        setSelectedNomineeId(null);
      } else {
        alert('¡Has terminado de votar en todas las categorías! 🏆');
        router.push('/');
      }
    }
    setLoading(false);
  };

  if (!categories.length || !userSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFD700] text-black">
        <div className="w-8 h-8 border-4 border-black border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  const activeCategory = categories[activeCatIdx];

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#FFD700] text-black p-4 font-sans select-none">
      <div className="w-full max-w-4xl flex-grow flex flex-col items-center py-6">
        
        {/* Navigation / Header info */}
        <div className="w-full flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/')}
            className="bg-white hover:bg-gray-150 border-4 border-black rounded-xl px-4 py-2 text-xs font-comic font-black text-black cursor-pointer active:scale-95 transition-all brutalist-shadow-sm"
          >
            👈 INICIO
          </button>
          <div className="inline-block bg-black text-[#FFD700] font-display text-xs px-3.5 py-1.5 rounded-xl uppercase tracking-widest font-black transform rotate-1 border-2 border-black">
            Categoría {activeCatIdx + 1} de {categories.length}
          </div>
        </div>

        {/* Categories Tab Selector */}
        <div className="w-full flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
          {categories.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCatIdx(i);
                setSelectedNomineeId(null);
                setError(null);
              }}
              className={`px-4 py-2.5 rounded-xl border-4 border-black font-display text-sm uppercase tracking-wide cursor-pointer transition-all whitespace-nowrap brutalist-shadow-sm ${
                i === activeCatIdx
                  ? 'bg-black text-[#FFD700] translate-y-[2px] shadow-none'
                  : 'bg-white text-black hover:bg-yellow-50'
              }`}
            >
              {cat.emoji} {cat.title}
            </button>
          ))}
        </div>

        {/* Category Main Card */}
        <div className="w-full bg-white border-4 border-black rounded-[2rem] p-6 brutalist-shadow mb-6 text-center max-w-2xl">
          <div className="w-16 h-16 bg-yellow-100 rounded-full border-4 border-black flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{activeCategory.emoji}</span>
          </div>
          <h1 className="text-3xl font-black font-display uppercase mb-2 tracking-tight text-black">
            {activeCategory.title}
          </h1>
          <div className="bg-orange-50 border-4 border-black p-4 rounded-2xl max-w-lg mx-auto font-comic text-xs font-bold text-gray-700 italic">
            “{activeCategory.description}”
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="w-full max-w-2xl bg-red-50 border-4 border-black p-4 rounded-[1.5rem] mb-6 text-sm font-black text-red-600 font-comic">
            {error}
          </div>
        )}

        {/* Nominees Grid */}
        <div className="w-full max-w-2xl grid gap-4 mb-8">
          {activeCategory.nominees.map((nominee) => {
            const isSelected = selectedNomineeId === nominee.id;
            return (
              <button
                key={nominee.id}
                onClick={() => setSelectedNomineeId(nominee.id)}
                className={`w-full text-left p-4 rounded-2xl flex items-center justify-between border-4 select-none cursor-pointer transition-all brutalist-shadow-sm hover:-translate-y-[1px] ${
                  isSelected
                    ? 'bg-yellow-100 border-black ring-4 ring-black/10'
                    : 'bg-white border-black hover:bg-yellow-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-2 border-black flex items-center justify-center bg-yellow-50 overflow-visible">
                    <RobloxAvatar config={nominee.avatar} size={48} />
                  </div>
                  <div>
                    <p className="font-display text-lg uppercase text-black">
                      {nominee.name}
                    </p>
                    <p className="font-comic text-[10px] uppercase font-bold text-gray-400">
                      Roblox: @{nominee.id}
                    </p>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full border-4 border-black flex items-center justify-center ${
                  isSelected ? 'bg-black text-[#FFD700]' : 'bg-gray-100'
                }`}>
                  {isSelected && (
                    <span className="text-xs font-black">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Voting Action Button */}
        <button
          onClick={handleVote}
          disabled={!selectedNomineeId || loading}
          className={`w-full max-w-2xl py-4 font-display font-black text-lg uppercase tracking-widest rounded-2xl border-4 border-black border-b-8 transition-all ${
            selectedNomineeId && !loading
              ? 'bg-black text-[#FFD700] hover:bg-neutral-900 cursor-pointer active:translate-y-1 active:border-b-4'
              : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed border-b-4'
          }`}
        >
          {loading ? 'ENVIANDO VOTO...' : '🗳️ CONFIRMAR VOTO'}
        </button>

      </div>
    </main>
  );
}
