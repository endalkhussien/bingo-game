import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  transpilePackages: ['lucide-react'],
};

export default nextConfig;
