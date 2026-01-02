/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config, { isServer }) => {
    // Handle @xenova/transformers for client-side usage
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Force use of web version of ONNX runtime
        'onnxruntime-node': false,
      }
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
        'sharp': false,
      }
    }
    
    // Ignore native binary files and node-specific modules
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    
    // Ignore .node native binary files
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader'
    })
    
    // Handle tesseract.js worker files
    config.module.rules.push({
      test: /\.worker\.js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/[hash][ext][query]'
      }
    })
    
    return config
  },
}

module.exports = nextConfig
