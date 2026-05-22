const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker deployments
  output: 'standalone',

  // Enable experimental server actions if needed
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'winston', 'bcryptjs'],
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

module.exports = nextConfig;
