'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'team-pollito-pwa-dismissed-at';
let deferredInstallPrompt: InstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

export function requestPwaInstall() {
  window.dispatchEvent(new Event('team-pollito:install'));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as InstallPromptEvent;
    promptListeners.forEach((listener) => listener());
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    promptListeners.forEach((listener) => listener());
  });
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isAppleMobileDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

export function PwaInstallWidget() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY));
    const wasDismissedRecently = Number.isFinite(dismissedAt)
      && dismissedAt > 0
      && Date.now() - dismissedAt < 24 * 60 * 60 * 1000;
    setIsIOS(isAppleMobileDevice());
    const syncPrompt = () => setInstallPrompt(deferredInstallPrompt);
    const handleInstallRequest = () => {
      window.localStorage.removeItem(DISMISS_KEY);
      setIsOpen(true);
    };
    promptListeners.add(syncPrompt);
    syncPrompt();
    window.addEventListener('team-pollito:install', handleInstallRequest);
    const timer = isStandalone() || wasDismissedRecently
      ? undefined
      : window.setTimeout(() => {
          if (deferredInstallPrompt || isAppleMobileDevice()) setIsOpen(true);
        }, 3000);

    return () => {
      if (timer) window.clearTimeout(timer);
      promptListeners.delete(syncPrompt);
      window.removeEventListener('team-pollito:install', handleInstallRequest);
    };
  }, []);

  if ((!installPrompt && !isIOS) || !isOpen) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsOpen(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    setIsInstalling(true);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsOpen(false);
    } else {
      setInstallPrompt(null);
    }
    setIsInstalling(false);
  };

  return (
    <aside className="fixed inset-x-4 bottom-5 z-[60] mx-auto w-auto max-w-sm rounded-2xl border border-[#eadfbd] bg-white p-4 shadow-[0_16px_40px_rgba(76,59,18,.18)] sm:inset-x-auto sm:right-5 sm:mx-0">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso de instalación"
        className="absolute right-3 top-3 rounded-lg px-2 py-1 text-sm text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
      >
        ×
      </button>
      <div className="flex gap-3 pr-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF7D6] text-2xl">🐣</div>
        <div>
          <p className="font-display text-sm font-bold text-[#2D3139]">Lleva el Team Pollito contigo</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
            {isIOS ? 'Ten el Team Pollito a un toque desde tu pantalla de inicio.' : 'Instala la app para entrar más rápido desde tu celular.'}
          </p>
        </div>
      </div>
      {isIOS && (
        <ol className="mt-3 space-y-2 rounded-xl bg-[#FFF9E6] p-3 text-xs font-medium text-[#66552A]">
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-bold text-[#D4A000]">1</span> Pulsa el botón Compartir de Safari.</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-bold text-[#D4A000]">2</span> Elige “Añadir a pantalla de inicio”.</li>
        </ol>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={dismiss} className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">
          Ahora no
        </button>
        {!isIOS && (
          <button type="button" onClick={() => void install()} disabled={isInstalling} className="rounded-lg bg-[#FFC200] px-3 py-2 text-xs font-bold text-black transition hover:brightness-105 disabled:opacity-60">
            {isInstalling ? 'Instalando...' : 'Instalar app'}
          </button>
        )}
      </div>
    </aside>
  );
}
