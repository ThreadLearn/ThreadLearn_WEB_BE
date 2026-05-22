/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker deployments
  output: 'standalone',

  // Enable experimental server actions if needed
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'winston', 'bcryptjs'],
  },
};

module.exports = nextConfig;
