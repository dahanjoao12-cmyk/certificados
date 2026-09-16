import type { NextConfig } from "next";

// Deploying under a sub-path (e.g. behind Nginx at /certificados on a shared
// host) needs this set at build time -- see src/lib/utils/base-path.ts for
// the runtime helper that mirrors it for redirect()/fetch() calls Next.js
// doesn't rewrite automatically.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  basePath,
};

export default nextConfig;
