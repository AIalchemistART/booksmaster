/**
 * Image Lazy Loading & Compression Utilities
 * Optimizes image loading for receipt thumbnails and full images
 */

// Image loading states
export type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error'

// Compression quality levels
export type CompressionQuality = 'low' | 'medium' | 'high' | 'original'

const QUALITY_SETTINGS: Record<CompressionQuality, number> = {
  low: 0.3,
  medium: 0.6,
  high: 0.85,
  original: 1.0
}

const MAX_DIMENSIONS: Record<CompressionQuality, number> = {
  low: 200,      // Thumbnails
  medium: 600,   // Preview
  high: 1200,    // Full view
  original: 4096 // Max supported
}

/**
 * Intersection Observer for lazy loading
 */
export function createLazyLoadObserver(
  onVisible: (element: Element) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '100px', // Start loading 100px before visible
    threshold: 0.1,
    ...options
  }
  
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        onVisible(entry.target)
      }
    })
  }, defaultOptions)
}

/**
 * Compress image using canvas
 */
export async function compressImage(
  imageData: string,
  quality: CompressionQuality = 'medium'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          resolve(imageData) // Return original if canvas not supported
          return
        }
        
        // Calculate dimensions
        const maxDim = MAX_DIMENSIONS[quality]
        let { width, height } = img
        
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw with smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        
        // Get compressed data
        const qualityValue = QUALITY_SETTINGS[quality]
        const compressed = canvas.toDataURL('image/jpeg', qualityValue)
        
        resolve(compressed)
      } catch (error) {
        console.error('Image compression failed:', error)
        resolve(imageData) // Return original on error
      }
    }
    
    img.onerror = () => {
      console.error('Failed to load image for compression')
      resolve(imageData) // Return original on error
    }
    
    img.src = imageData
  })
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(
  imageData: string,
  maxSize: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          resolve(imageData)
          return
        }
        
        // Calculate thumbnail dimensions maintaining aspect ratio
        let { width, height } = img
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        
        canvas.width = width
        canvas.height = height
        
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'medium'
        ctx.drawImage(img, 0, 0, width, height)
        
        // Use lower quality for thumbnails
        const thumbnail = canvas.toDataURL('image/jpeg', 0.5)
        resolve(thumbnail)
      } catch (error) {
        console.error('Thumbnail generation failed:', error)
        resolve(imageData)
      }
    }
    
    img.onerror = () => resolve(imageData)
    img.src = imageData
  })
}

/**
 * Preload an image
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(
  sources: string[],
  concurrency: number = 3
): Promise<Map<string, HTMLImageElement | null>> {
  const results = new Map<string, HTMLImageElement | null>()
  
  // Process in batches
  for (let i = 0; i < sources.length; i += concurrency) {
    const batch = sources.slice(i, i + concurrency)
    const promises = batch.map(async src => {
      try {
        const img = await preloadImage(src)
        results.set(src, img)
      } catch {
        results.set(src, null)
      }
    })
    await Promise.all(promises)
  }
  
  return results
}

/**
 * Get image dimensions from data URL
 */
export function getImageDimensions(
  imageData: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = imageData
  })
}

/**
 * Check if image data is valid
 */
export function isValidImageData(data: string): boolean {
  if (!data) return false
  return data.startsWith('data:image/') || 
         data.startsWith('http://') || 
         data.startsWith('https://')
}

/**
 * Estimate image memory size in bytes
 */
export function estimateImageMemorySize(dataUrl: string): number {
  if (!dataUrl) return 0
  
  // Remove data URL prefix
  const base64 = dataUrl.split(',')[1]
  if (!base64) return dataUrl.length
  
  // Base64 encoding increases size by ~33%
  return Math.round(base64.length * 0.75)
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
