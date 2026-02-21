const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Point file tracing at the monorepo root so Vercel picks up shared/ correctly
  // and stops warning about multiple lockfiles.
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['@aegisos/shared'],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

module.exports = nextConfig;
