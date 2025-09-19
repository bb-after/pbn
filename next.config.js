/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  images: {
    domains: ['ideogram.ai', 'secure.gravatar.com', 'amazonaws.com'],
  },
  transpilePackages: ['@mui/material', '@mui/system', '@mui/x-date-pickers', '@mui/icons-material'],
};

module.exports = nextConfig;
