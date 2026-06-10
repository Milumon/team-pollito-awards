// components/Layout.tsx
import Link from 'next/link';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 bg-white/30 backdrop-blur-md border-b border-white/20 shadow-sm z-10">
        <nav className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <Link href="/" className="text-xl font-bold text-primary">
            Pollitos Awards
          </Link>
          <button
            className="md:hidden focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
          <ul className={`md:flex space-x-4 ${menuOpen ? "block" : "hidden"}`}>
            <li>
              <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            </li>
            <li>
              <Link href="/vote" className="hover:text-primary transition-colors">Votar</Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
            </li>
          </ul>
        </nav>
      </header>
          <button
            className="md:hidden focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
          <ul className={`md:flex space-x-4 ${menuOpen ? "block" : "hidden"}`}>
            <li>
              <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            </li>
            <li>
              <Link href="/vote" className="hover:text-primary transition-colors">Votar</Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1 max-w-7xl mx-auto p-4">{children}</main>
      <footer className="border-t border-gray-200 py-4 text-center text-sm">
        © 2026 Pollitos Awards – Todos los derechos reservados.
      </footer>
    </div>
  );
}
