'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Loader } from 'lucide-react';

type RobloxOnboardingProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userSession: any;
};

type OnboardingStep = 'input' | 'confirming' | 'confirmed';

export default function RobloxOnboarding({
  isOpen,
  onClose,
  onConfirm,
  userSession,
}: RobloxOnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('input');
  const [robloxUsername, setRobloxUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [displayData, setDisplayData] = useState<{
    id: number;
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);

  const handleVerify = async () => {
    setError(null);

    if (!robloxUsername.trim()) {
      setError('Por favor ingresá tu nombre de usuario de Roblox');
      return;
    }

    setStep('confirming');

    try {
      const response = await fetch('/api/profile/verify-roblox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userSession?.session?.access_token}`,
        },
        body: JSON.stringify({ robloxUsername: robloxUsername.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudo verificar el usuario');
        setStep('input');
        return;
      }

      setDisplayData({
        id: data.id,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      });
      setStep('confirmed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setStep('input');
    }
  };

  const handleConfirmAndClose = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-lg p-6 relative"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg bg-white hover:bg-gray-100 active:scale-95 transition-all"
            >
              <X className="w-5 h-5 stroke-[3]" />
            </button>

            <div className="mb-5">
              <h2 className="font-display text-2xl text-black uppercase tracking-normal mb-1">
                🐣 Vinculá tu Usuario Roblox
              </h2>
              <p className="font-comic text-xs text-gray-600 uppercase tracking-wider font-bold">
                Así sabemos quién votó por quién
              </p>
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1: INPUT */}
              {step === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="bg-yellow-50 border-2 border-black rounded-xl p-3">
                    <p className="text-xs font-comic font-bold text-gray-700 leading-relaxed">
                      🔍 Escribe tu nombre de usuario de Roblox (usuario no apodo). Te buscaremos automáticamente.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-black uppercase mb-2 tracking-wide">
                      Tu Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      placeholder="milumon_gaming"
                      value={robloxUsername}
                      onChange={(e) => {
                        setRobloxUsername(e.target.value);
                        setError(null);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && robloxUsername.trim()) {
                          handleVerify();
                        }
                      }}
                      className="w-full px-4 py-3 border-3 border-black rounded-xl font-comic text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:opacity-50 transition-all"
                      disabled={false}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border-2 border-black p-3 rounded-lg">
                      <p className="text-xs font-comic font-bold text-red-700">⚠️ {error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={onClose}
                      className="flex-1 px-3 py-3 bg-white text-black border-2 border-black rounded-lg font-comic text-xs uppercase font-black hover:bg-gray-100 active:scale-95 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={!robloxUsername.trim()}
                      className="flex-1 px-3 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg font-comic text-xs uppercase font-black border-2 border-black active:translate-y-1 disabled:cursor-not-allowed transition-all"
                    >
                      Buscar →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: CONFIRMING */}
              {step === 'confirming' && (
                <motion.div
                  key="confirming"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  >
                    <Loader className="w-10 h-10 text-orange-500" strokeWidth={3} />
                  </motion.div>
                  <p className="mt-4 font-comic text-sm font-bold text-gray-700 uppercase">
                    Buscando tu usuario...
                  </p>
                </motion.div>
              )}

              {/* STEP 3: CONFIRMED */}
              {step === 'confirmed' && displayData && (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-black flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600 stroke-[3]" />
                    </div>
                  </div>

                  <div className="bg-orange-50 border-4 border-black rounded-2xl p-4 text-center">
                    {displayData.avatarUrl ? (
                      <img
                        src={displayData.avatarUrl}
                        alt="Avatar Roblox"
                        className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-3 border-black shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-yellow-200 border-3 border-black flex items-center justify-center text-3xl">
                        🐣
                      </div>
                    )}
                    <p className="font-display text-xl text-black uppercase tracking-normal leading-none mb-1">
                      {displayData.displayName}
                    </p>
                    <p className="font-comic text-xs text-gray-600 uppercase font-bold">
                      ID: {displayData.id}
                    </p>
                  </div>

                  <div className="bg-yellow-100 border-2 border-dashed border-yellow-600 rounded-lg p-3">
                    <p className="text-xs font-comic font-bold text-gray-700 text-center">
                      ¿Es el tuyo? Confirm para continuar. 👇
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setStep('input');
                        setRobloxUsername('');
                        setDisplayData(null);
                        setError(null);
                      }}
                      className="flex-1 px-3 py-3 bg-white text-black border-2 border-black rounded-lg font-comic text-xs uppercase font-black hover:bg-gray-100 active:scale-95 transition-all"
                    >
                      ← Cambiar
                    </button>
                    <button
                      onClick={handleConfirmAndClose}
                      className="flex-1 px-3 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-comic text-xs uppercase font-black border-2 border-black active:translate-y-1 transition-all"
                    >
                      ✓ Confirmar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
