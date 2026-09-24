import type { NextConfig } from "next";

// Deploying under a sub-path (e.g. behind Nginx at /certificados on a shared
// host) needs this set at build time -- see src/lib/utils/base-path.ts for
// the runtime helper that mirrors it for redirect()/fetch() calls Next.js
// doesn't rewrite automatically.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  basePath,
  async redirects() {
    return [
      // "Empresas" was renamed to "Clientes" -- keep old bookmarked/shared
      // links working. source/destination are auto-prefixed with basePath.
      { source: "/empresas/:path*", destination: "/clientes/:path*", permanent: false },
      { source: "/empresas", destination: "/clientes", permanent: false },
      // The certificates table briefly lived at "/certificados" -- renamed to
      // "/painel-certificados" to avoid colliding visually with the
      // NEXT_PUBLIC_BASE_PATH sub-path (also "/certificados"), which stacked
      // into a confusing "/certificados/certificados" URL.
      { source: "/certificados", destination: "/painel-certificados", permanent: false },
    ];
  },
};

export default nextConfig;
