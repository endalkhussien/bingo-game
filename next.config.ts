import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['lucide-react'],
  // Relative asset paths — required when UI is served from Electron
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  // Pin tracing to this app — avoids picking up parent lockfiles (e.g. ~/pnpm-lock.yaml)
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
