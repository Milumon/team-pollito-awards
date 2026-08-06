'use client';

import { FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';

import { Header } from '@/components/ui/Header';
import { NavBar } from '@/components/ui/NavBar';

type Account = {
  id: string;
  edition: 'java' | 'bedrock';
  username: string;
  player_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  rejection_reason: string | null;
  verified_at: string | null;
  approved_at?: string | null;
  created_at?: string;
  code?: string | null;
  link_code_expires_at?: string | null;
};

const steps = ['Tu cuenta', 'Solicita', 'Entra', 'Confirma', 'Listo'];

function isVerified(account: Account | null) {
  return Boolean(account?.verified_at && account.status === 'approved');
}

function formatDate(value?: string | null) {
  if (!value) return 'Hoy';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value));
}

export default function MinecraftLinkForm() {
  const [edition, setEdition] = useState<'java' | 'bedrock'>('java');
  const [username, setUsername] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeExpired, setCodeExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const formHasChanges = useRef(false);

  useEffect(() => {
    let active = true;
    const loadAccount = async () => {
      try {
        const response = await fetch('/api/minecraft/link', { cache: 'no-store' });
        const payload = await response.json() as { accounts?: Account[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la vinculación.');
        if (!active) return;
        const accounts = payload.accounts ?? [];
        const current = accounts.find((item) => item.edition === edition) ?? accounts[0] ?? null;
        setAccount(current);
        if (formHasChanges.current) return;
        if (!formHasChanges.current && current?.username) setUsername(current.username);
        if (!formHasChanges.current && current?.edition) setEdition(current.edition);
        if (current?.code && !isVerified(current)) {
          setCode(current.code);
          setExpiresAt(current.link_code_expires_at ?? null);
          setCodeExpired(false);
        }
        if (isVerified(current) && !replaceMode) {
          setCode(null);
          setStep(5);
        } else if (!replaceMode && current?.code) {
          setStep((current.verified_at ? 4 : 3));
        }
        if (!replaceMode && current?.status === 'pending' && current.link_code_expires_at && !current.code && new Date(current.link_code_expires_at).getTime() < Date.now()) {
          setCode(null);
          setExpiresAt(null);
          setCodeExpired(true);
          setStep(1);
          setMessage(null);
        }
      } catch (error: unknown) {
        if (active && !account) setMessage(error instanceof Error ? error.message : 'No se pudo cargar la vinculación.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadAccount();
    const interval = window.setInterval(loadAccount, code ? 4000 : 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [code, replaceMode, step]);

  useEffect(() => {
    if (!code || !expiresAt) return;

    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) {
        setCode(null);
        setExpiresAt(null);
        setCodeExpired(true);
        setStep(1);
      }
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [code, expiresAt]);

  const requestCode = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/minecraft/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edition, username, playerId: '' }),
      });
      const payload = await response.json() as { account?: Account; code?: string; expiresAt?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || 'No se pudo crear la solicitud.');
      setAccount(payload.account ?? null);
      setCode(payload.code ?? null);
      setExpiresAt(payload.expiresAt ?? null);
      setCodeExpired(false);
      formHasChanges.current = false;
      setStep(3);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'No se pudo crear la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await requestCode();
  };

  const copyCommand = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(`/link ${code}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const beginReplacement = () => {
    setReplaceMode(true);
    setCode(null);
    setCodeExpired(false);
    formHasChanges.current = true;
    setStep(1);
    setMessage(null);
  };

  const editAccount = () => {
    setCode(null);
    setExpiresAt(null);
    setRemainingSeconds(null);
    setCodeExpired(false);
    formHasChanges.current = true;
    setStep(1);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3139] selection:bg-[#FFB000] selection:text-black">
      <Header session={null} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <NavBar variant="drawer" isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="mb-8 flex items-center gap-3"><span className="text-4xl">🐣</span><div><p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-[#D4A000]">Minecraft · Team Pollito</p><h1 className="font-display text-4xl font-black uppercase leading-[0.92] tracking-tight text-[#2D3139] sm:text-5xl">Vincula tu cuenta</h1></div></div>

        {!replaceMode && account && isVerified(account) ? <SuccessCard account={account} onReplace={beginReplacement} /> : loading ? <p className="text-[#64748B]">Cargando tu aventura...</p> : (
          <>
            <Progress current={step} />
            {codeExpired && <ExpiredCard saving={saving} onRegenerate={requestCode} />}
            {replaceMode && <div className="mb-6 rounded-2xl border border-amber-200 bg-[#FFF7DC] p-4 text-sm font-medium text-[#7A6330]">Estás creando una nueva vinculación. La anterior dejará de funcionar cuando completes este proceso.</div>}
            {step === 1 && <StepOne edition={edition} setEdition={(value) => { formHasChanges.current = true; setEdition(value); }} username={username} setUsername={(value) => { formHasChanges.current = true; setUsername(value); }} onNext={() => { setMessage(null); setStep(2); }} />}
            {step === 2 && <StepTwo edition={edition} username={username} saving={saving} onBack={() => setStep(1)} onSubmit={submit} />}
            {step === 3 && code && <StepThree edition={edition} code={code} expiresAt={expiresAt} remainingSeconds={remainingSeconds} saving={saving} onNext={() => setStep(4)} onBack={editAccount} onRegenerate={requestCode} onCopy={copyCommand} copied={copied} />}
            {step === 4 && code && <StepFour code={code} saving={saving} onBack={editAccount} onRegenerate={requestCode} onCopy={copyCommand} copied={copied} message={message} />}
            {message && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{message}</p>}
          </>
        )}
      </main>
    </div>
  );
}

function Progress({ current }: Readonly<{ current: number }>) {
  return <div className="mb-8"><div className="mb-3 flex justify-between text-xs font-bold text-[#9A8D70]"><span>Paso {current} de 5</span><span>{steps[current - 1]}</span></div><div className="flex gap-2">{steps.map((label, index) => <div key={label} className={`h-3 flex-1 rounded-full ${index < current ? 'bg-[#FFD500]' : 'bg-[#E8DFC5]'}`} aria-label={label} />)}</div></div>;
}

function StepOne({ edition, setEdition, username, setUsername, onNext }: Readonly<{ edition: 'java' | 'bedrock'; setEdition: (value: 'java' | 'bedrock') => void; username: string; setUsername: (value: string) => void; onNext: () => void }>) {
  return <Card title="Empecemos, pollito" icon="🥚"><p className="text-sm font-medium text-[#64748B]">Escribe el nombre exacto que usas en Minecraft.</p><label className="mt-5 block text-sm font-bold text-[#45413A]">Edición<select value={edition} onChange={(event) => setEdition(event.target.value as 'java' | 'bedrock')} className="mt-2 w-full rounded-xl border border-[#E8DFC5] bg-[#FFFDF5] px-4 py-3 text-[#2D3139]"><option value="java">Java</option><option value="bedrock">Bedrock</option></select></label><label className="mt-4 block text-sm font-bold text-[#45413A]">Username de Minecraft<input value={username} onChange={(event) => setUsername(event.target.value)} required maxLength={32} className="mt-2 w-full rounded-xl border border-[#E8DFC5] bg-[#FFFDF5] px-4 py-3 text-[#2D3139]" placeholder="Ejemplo: Pollito123" /></label><button type="button" onClick={onNext} disabled={!username.trim()} className="mt-6 w-full rounded-xl bg-[#FFD500] px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-50">Continuar ✨</button></Card>;
}

function StepTwo({ edition, username, saving, onBack, onSubmit }: Readonly<{ edition: string; username: string; saving: boolean; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }>) {
  return <Card title="Revisa tus datos" icon="🎟️"><div className="rounded-2xl bg-[#FFF7DC] p-4"><p className="text-xs font-bold uppercase text-[#9A8D70]">Tu cuenta</p><p className="mt-1 text-xl font-black text-[#2D3139]">{username}</p><p className="text-sm font-medium text-[#7A6330]">Minecraft {edition}</p></div><p className="mt-5 text-sm font-medium leading-relaxed text-[#64748B]">Al solicitar, recibirás un código para vincular tu cuenta dentro del servidor.</p><form onSubmit={onSubmit} className="mt-6 flex gap-3"><button type="button" onClick={onBack} className="rounded-xl border border-[#E8DFC5] px-4 py-3 font-bold text-[#64748B]">Atrás</button><button disabled={saving} className="flex-1 rounded-xl bg-[#FFD500] px-5 py-3 font-black text-black disabled:opacity-50">{saving ? 'Creando...' : 'Solicitar acceso'}</button></form></Card>;
}

function ConnectionDetails({ port }: Readonly<{ port: string }>) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2200);
  };
  return <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#E8DFC5] bg-[#FFFDF5] p-4"><p className="text-xs font-bold uppercase tracking-widest text-[#9A8D70]">Dirección</p><p className="mt-2 font-mono text-lg font-black text-[#2D3139]">mc.milumon.dev</p><button type="button" onClick={() => copy('mc.milumon.dev', 'address')} className="mt-3 rounded-lg bg-[#FFD500] px-3 py-2 text-xs font-black text-black">{copied === 'address' ? '✅ Copiada' : 'Copiar dirección'}</button></div><div className="rounded-xl border border-[#E8DFC5] bg-[#FFFDF5] p-4"><p className="text-xs font-bold uppercase tracking-widest text-[#9A8D70]">Puerto</p><p className="mt-2 font-mono text-lg font-black text-[#2D3139]">{port}</p><button type="button" onClick={() => copy(port, 'port')} className="mt-3 rounded-lg bg-[#FFD500] px-3 py-2 text-xs font-black text-black">{copied === 'port' ? '✅ Copiado' : 'Copiar puerto'}</button></div><button type="button" onClick={() => copy(`mc.milumon.dev\n${port}`, 'both')} className="sm:col-span-2 rounded-xl border border-[#E8DFC5] px-4 py-3 text-sm font-black text-[#64748B]">{copied === 'both' ? '✅ Datos copiados' : 'Copiar dirección y puerto'}</button></div>;
}

function StepThree({ edition, code, expiresAt, remainingSeconds, saving, onNext, onBack, onRegenerate, onCopy, copied }: Readonly<{ edition: 'java' | 'bedrock'; code: string; expiresAt: string | null; remainingSeconds: number | null; saving: boolean; onNext: () => void; onBack: () => void; onRegenerate: () => void; onCopy: () => void; copied: boolean }>) {
  const port = edition === 'bedrock' ? '19132' : '25565';
  const countdown = remainingSeconds === null ? '10 minutos' : remainingSeconds >= 60 ? `${Math.ceil(remainingSeconds / 60)} minutos` : `${remainingSeconds} segundos`;
  return <Card title="Ahora termina la vinculación" icon="🎉"><p className="text-sm font-medium leading-relaxed text-[#64748B]">Entrar al servidor todavía no termina el proceso. Sigue estos pasos:</p><div className="mt-5 rounded-2xl border-2 border-[#FFD500] bg-[#FFFDF5] p-4"><ol className="space-y-4 text-sm font-bold text-[#2D3139]"><li><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD500]">1</span>Agrega el servidor en Minecraft.</li><li><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD500]">2</span>Entra con tu usuario y crea tu contraseña si AuthMe te la pide.</li><li><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD500]">3</span>Abre el chat y escribe exactamente el comando de abajo.</li><li><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD500]">4</span>Espera el mensaje de cuenta verificada.</li></ol></div><ConnectionDetails port={port} /><div className="mt-5 rounded-2xl border-2 border-emerald-300 bg-[#ECFDF3] p-4"><p className="font-black text-emerald-800">IMPORTANTE: debes escribir este comando en el chat</p><Command code={code} onCopy={onCopy} copied={copied} /></div><div className="mt-5 rounded-2xl border border-amber-200 bg-[#FFF7DC] p-4"><p className="font-bold text-[#8B6B00]">🔒 No compartas tu contraseña</p><p className="mt-1 text-sm font-medium leading-relaxed text-[#7A6330]">Usa una contraseña solo para Minecraft. No uses la de Google.</p></div><p className="mt-4 text-center text-sm font-black text-[#8B6B00]">⏰ Tienes aproximadamente {countdown} para usarlo.</p><p className="mt-1 text-center text-xs text-[#9A8D70]">El código se vence a las {expiresAt ? new Date(expiresAt).toLocaleTimeString('es-PE') : 'pronto'}.</p><button type="button" onClick={onNext} className="mt-6 w-full rounded-xl bg-[#FFD500] px-5 py-3 font-black text-black">Ya escribí /link en el chat ✅</button><button type="button" onClick={onRegenerate} disabled={saving} className="mt-3 w-full rounded-xl border border-orange-200 bg-[#FFF7DC] px-5 py-3 text-sm font-black text-[#8B6B00] disabled:opacity-50">{saving ? 'Generando otro código...' : '⚠️ No funciona: generar otro código'}</button><button type="button" onClick={onBack} className="mt-3 w-full rounded-xl border border-[#E8DFC5] px-5 py-3 text-sm font-bold text-[#64748B]">✏️ Cambiar mi usuario</button></Card>;
}

function ExpiredCard({ saving, onRegenerate }: Readonly<{ saving: boolean; onRegenerate: () => void }>) {
  return <section className="mb-6 rounded-3xl border-2 border-orange-300 bg-[#FFF7DC] p-6 shadow-[7px_7px_0_#FCD34D] sm:p-8"><div className="flex items-center gap-3"><span className="text-4xl" aria-hidden>⏰</span><h2 className="font-display text-2xl font-black text-[#7A4A00]">Tu código ya venció</h2></div><p className="mt-4 text-sm font-medium leading-relaxed text-[#7A6330]">No pasa nada: tu cuenta sigue guardada. Genera un código nuevo y úsalo en Minecraft.</p><button type="button" onClick={onRegenerate} disabled={saving} className="mt-5 w-full rounded-xl bg-[#FFD500] px-5 py-4 text-base font-black text-black disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Generando...' : 'Generar un código nuevo'}</button></section>;
}

function StepFour({ code, saving, onBack, onRegenerate, onCopy, copied, message }: Readonly<{ code: string; saving: boolean; onBack: () => void; onRegenerate: () => void; onCopy: () => void; copied: boolean; message: string | null }>) {
  return <Card title="Estamos comprobando" icon="🔎"><div className="text-center"><div className="mx-auto flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-[#FFF7DC] text-4xl">🐣</div><p className="mt-5 text-lg font-bold text-[#2D3139]">Mira el chat de Minecraft</p><p className="mt-2 text-sm font-medium leading-relaxed text-[#64748B]">Si todavía no lo hiciste, escribe ahora este comando en el chat:</p></div><Command code={code} onCopy={onCopy} copied={copied} /><p className="mt-4 text-center text-xs font-medium text-[#9A8D70]">{message || 'Esperando la confirmación del servidor...'}</p><button type="button" onClick={onRegenerate} disabled={saving} className="mt-5 w-full rounded-xl border border-orange-200 bg-[#FFF7DC] px-5 py-3 text-sm font-black text-[#8B6B00] disabled:opacity-50">{saving ? 'Generando otro código...' : '⚠️ No funciona: generar otro código'}</button><button type="button" onClick={onBack} className="mt-3 w-full rounded-xl border border-[#E8DFC5] px-5 py-3 text-sm font-bold text-[#64748B]">✏️ Cambiar mi usuario</button></Card>;
}

function Command({ code, onCopy, copied }: Readonly<{ code: string; onCopy: () => void; copied: boolean }>) {
  return <div className="mt-5 rounded-2xl border-2 border-emerald-300 bg-[#ECFDF3] p-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Comando para Minecraft</p><p className="mt-2 break-all font-mono text-2xl font-black tracking-wide text-[#166534]">/link {code}</p><button type="button" onClick={onCopy} className="mt-4 w-full rounded-xl bg-[#22C55E] px-4 py-3 text-sm font-black text-white">{copied ? '✅ ¡Copiado!' : '📋 Copiar comando'}</button></div>;
}

function Card({ title, icon, children }: Readonly<{ title: string; icon: string; children: ReactNode }>) {
  return <section className="rounded-3xl border-2 border-[#FFD500] bg-white p-6 shadow-[7px_7px_0_#FFDFA0] sm:p-8"><div className="flex items-center gap-3"><span className="text-4xl" aria-hidden>{icon}</span><h2 className="font-display text-2xl font-black text-[#2D3139]">{title}</h2></div>{children}</section>;
}

function SuccessCard({ account, onReplace }: Readonly<{ account: Account; onReplace: () => void }>) {
  const port = account.edition === 'bedrock' ? '19132' : '25565';
  return <section className="rounded-3xl border-2 border-emerald-300 bg-white p-6 text-center shadow-[7px_7px_0_#A7F3D0] sm:p-10"><div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-[#FFF7DC] text-5xl"><img src={`https://mc-heads.net/avatar/${encodeURIComponent(account.username)}/96`} alt="" className="h-full w-full" onError={(event) => { event.currentTarget.style.display = 'none'; }} />🐣</div><p className="mt-5 text-sm font-bold uppercase tracking-widest text-emerald-600">Cuenta vinculada</p><h2 className="mt-2 font-display text-3xl font-black text-[#2D3139]">¡Todo listo, {account.username}! 🎉</h2><span className="mt-4 inline-flex rounded-full bg-[#DCFCE7] px-4 py-2 text-sm font-black text-[#166534]">Activo ✅</span><div className="mx-auto mt-6 max-w-sm rounded-2xl bg-[#FFFDF5] p-4 text-left text-sm font-medium text-[#64748B]"><p><strong className="text-[#2D3139]">Edición:</strong> {account.edition}</p><p className="mt-1"><strong className="text-[#2D3139]">Vinculada:</strong> {formatDate(account.verified_at)}</p></div><p className="mt-6 text-sm font-medium text-[#64748B]">Abre Minecraft y agrega estos datos en campos separados:</p><ConnectionDetails port={port} /><button type="button" onClick={onReplace} className="mt-5 text-sm font-bold text-[#9A8D70] underline">Vincular otra cuenta</button></section>;
}
