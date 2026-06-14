import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['lucide-react'],
  // Relative asset paths — required when UI is served from Electron
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
};

export default nextConfig;
