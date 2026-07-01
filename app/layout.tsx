import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Inter, JetBrains_Mono, Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@fontsource/anton";
import "@fontsource/bricolage-grotesque/400.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/bricolage-grotesque/800.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const siteUrl = "https://teampollito.milumon.dev";

export const viewport = {
  themeColor: "#eab308",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "The Pollitos Awards",
  description:
    "Vota por tus favoritos en The Pollitos Awards y celebra con la comunidad del Team Pollito.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Team Pollito",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "The Pollitos Awards",
    description:
      "Vota por tus favoritos en The Pollitos Awards y celebra con la comunidad del Team Pollito.",
    url: "/",
    siteName: "The Pollitos Awards",
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Pollitos Awards",
    description:
      "Vota por tus favoritos en The Pollitos Awards y celebra con la comunidad del Team Pollito.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} ${fredoka.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}