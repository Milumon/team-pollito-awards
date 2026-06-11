import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

const siteUrl = "https://teampollito.milumon.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "The Pollitos Awards",
  description:
    "Vota por tus favoritos en The Pollitos Awards y celebra con la comunidad del Team Pollito.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}