/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    turbopack: {},
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = config.watchOptions || {}
      config.watchOptions.ignored = [
        ...(Array.isArray(config.watchOptions.ignored) ? config.watchOptions.ignored : [config.watchOptions.ignored].filter(Boolean)),
        '**/db.json',
        '**/scratch/**',
      ]
    }
    return config
  }
}

export default nextConfig
