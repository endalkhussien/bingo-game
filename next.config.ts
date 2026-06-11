import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export — ideal for Electron desktop (no Node server needed)
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['lucide-react'],
};

export default nextConfig;
