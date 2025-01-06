/** @type {import('next').NextConfig} */
const nextConfig = {
    productionBrowserSourceMaps: true,
    images: {
        domains: ['ideogram.ai']
    }
}

module.exports = nextConfig
