/** @type {import('next').NextConfig} */
const nextConfig = {
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
