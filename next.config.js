/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
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
      }
    }
    
    // Ignore native modules
    config.externals = config.externals || []
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
    })
    
    return config
  },
}

module.exports = nextConfig
