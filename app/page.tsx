// app/page.tsx
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Pollitos Awards 2026</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFD700] text-black p-4">
        <h1 className="text-5xl font-bold mb-4">Pollitos Awards 2026</h1>
        <p className="text-lg mb-6">
          ¡Es hora de celebrar un año de streams! Vota por tus amigos y compañeros de Roblox.
        </p>
        <a
          href="/vote"
          className="bg-black text-[#FFD700] hover:bg-neutral-900 border-4 border-black font-bold px-6 py-3 rounded-xl transition-all"
        >
          COMENZAR VOTACIÓN
        </a>
      </main>
    </>
  );
}
