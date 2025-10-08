/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['maps.googleapis.com', 'lh3.googleusercontent.com'],
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
