/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  images: {
    domains: ['ideogram.ai', 'secure.gravatar.com'],
  },
};

module.exports = nextConfig;
