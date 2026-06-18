import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Static export only for production (Electron). Dev server needs full RSC so /admin/license/ navigation works.
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' as const } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['lucide-react'],
  // Absolute /_next paths — required for nested routes (e.g. /login/) over http://127.0.0.1
  assetPrefix: undefined,
  // Pin tracing to this app — avoids picking up parent lockfiles (e.g. ~/pnpm-lock.yaml)
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
