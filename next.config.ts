import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@supabase/supabase-js'],
  experimental: {
    authInterrupts: true,
  },
  turbopack: {},
  async redirects() {
    return [
      {
        source: '/comunidad',
        destination: '/',
        permanent: true,
      },
      {
        source: '/awards',
        destination: '/premios',
        permanent: true,
      },
    ];
  },
};

export default withPWA(nextConfig);
