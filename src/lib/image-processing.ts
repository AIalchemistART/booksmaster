'use client'

export interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
}

export interface CropBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Enhance contrast of a receipt image - makes text darker and paper whiter
 * Uses adaptive thresholding approach for better OCR results
 */
export function enhanceContrast(
  canvas: HTMLCanvasElement,
  options: {
    contrast?: number      // 1.0 = normal, 1.5 = 50% more contrast
    brightness?: number    // 0 = normal, positive = brighter
    sharpen?: boolean      // Apply sharpening
  } = {}
): HTMLCanvasElement {
  const { contrast = 1.4, brightness = 10, sharpen = true } = options
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Step 1: Convert to grayscale and apply contrast/brightness
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale using luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    
    // Apply contrast and brightness
    // Formula: newValue = (value - 128) * contrast + 128 + brightness
    let enhanced = (gray - 128) * contrast + 128 + brightness
    
    // Clamp to valid range
    enhanced = Math.max(0, Math.min(255, enhanced))
    
    // Apply to all channels (keep grayscale for better OCR)
    data[i] = enhanced     // R
    data[i + 1] = enhanced // G
    data[i + 2] = enhanced // B
    // Alpha stays the same
  }

  ctx.putImageData(imageData, 0, 0)

  // Step 2: Apply sharpening if enabled
  if (sharpen) {
    applySharpening(canvas)
  }

  return canvas
}

/**
 * Apply a simple sharpening filter using convolution
 */
function applySharpening(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const width = canvas.width
  const height = canvas.height

  // Create a copy for reference
  const original = new Uint8ClampedArray(data)

  // Sharpening kernel (unsharp mask style)
  const kernel = [
    0, -0.5, 0,
    -0.5, 3, -0.5,
    0, -0.5, 0
  ]

  // Apply convolution (skip edges)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // R, G, B channels
        let sum = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c
            sum += original[idx] * kernel[(ky + 1) * 3 + (kx + 1)]
          }
        }
        const idx = (y * width + x) * 4 + c
        data[idx] = Math.max(0, Math.min(255, sum))
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Auto-detect receipt bounds using edge detection and find the largest rectangle
 * Returns crop bounds that remove negative space around the receipt
 */
export function detectReceiptBounds(canvas: HTMLCanvasElement): CropBounds {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const width = canvas.width
  const height = canvas.height
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // Convert to grayscale for edge detection
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2])
  }

  // Simple edge detection using Sobel-like operator
  const edges = new Uint8Array(width * height)
  const threshold = 30

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      
      // Horizontal gradient
      const gx = 
        -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
        -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
        -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)]
      
      // Vertical gradient
      const gy = 
        -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)]
      
      const magnitude = Math.sqrt(gx * gx + gy * gy)
      edges[idx] = magnitude > threshold ? 255 : 0
    }
  }

  // Find bounding box of non-zero pixels (with some margin)
  let minX = width, minY = height, maxX = 0, maxY = 0
  const margin = Math.min(width, height) * 0.02 // 2% margin

  // Scan for content bounds
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      // Check if pixel is part of content (edge or non-white)
      if (edges[idx] > 0 || gray[idx] < 240) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  // Add small padding and ensure valid bounds
  const padding = Math.min(width, height) * 0.01
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(width, maxX + padding)
  maxY = Math.min(height, maxY + padding)

  // Ensure minimum size (at least 10% of image)
  const minSize = Math.min(width, height) * 0.1
  if (maxX - minX < minSize || maxY - minY < minSize) {
    // Return full image if detection failed
    return { x: 0, y: 0, width, height }
  }

  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY)
  }
}

/**
 * Crop an image to the specified bounds and optionally resize
 */
export function cropImage(
  sourceCanvas: HTMLCanvasElement,
  bounds: CropBounds,
  options: {
    maxWidth?: number
    maxHeight?: number
    maintainAspect?: boolean
  } = {}
): HTMLCanvasElement {
  const { maxWidth, maxHeight, maintainAspect = true } = options

  let targetWidth = bounds.width
  let targetHeight = bounds.height

  // Calculate scaling if max dimensions are specified
  if (maxWidth || maxHeight) {
    const scaleX = maxWidth ? maxWidth / bounds.width : 1
    const scaleY = maxHeight ? maxHeight / bounds.height : 1
    
    if (maintainAspect) {
      const scale = Math.min(scaleX, scaleY, 1) // Don't upscale
      targetWidth = Math.round(bounds.width * scale)
      targetHeight = Math.round(bounds.height * scale)
    } else {
      targetWidth = maxWidth ? Math.min(bounds.width, maxWidth) : bounds.width
      targetHeight = maxHeight ? Math.min(bounds.height, maxHeight) : bounds.height
    }
  }

  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = targetWidth
  croppedCanvas.height = targetHeight
  const ctx = croppedCanvas.getContext('2d', { willReadFrequently: true })!

  ctx.drawImage(
    sourceCanvas,
    bounds.x, bounds.y, bounds.width, bounds.height,
    0, 0, targetWidth, targetHeight
  )

  return croppedCanvas
}

/**
 * Load an image file into a canvas
 */
export async function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0)
        resolve(canvas)
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Convert canvas to data URL
 */
export function canvasToDataUrl(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.92): string {
  return canvas.toDataURL(type, quality)
}

/**
 * Convert canvas to File
 */
export async function canvasToFile(canvas: HTMLCanvasElement, filename: string, type = 'image/jpeg'): Promise<File> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob!], filename, { type }))
    }, type, 0.92)
  })
}

/**
 * Full receipt preprocessing pipeline:
 * 1. Load image
 * 2. Detect receipt bounds (crop negative space)
 * 3. Enhance contrast for better OCR
 */
export async function preprocessReceipt(
  file: File,
  options: {
    autoCrop?: boolean
    enhanceContrast?: boolean
    maxWidth?: number
    maxHeight?: number
  } = {}
): Promise<ProcessedImage> {
  const {
    autoCrop = true,
    enhanceContrast: doEnhance = true,
    maxWidth = 2000,
    maxHeight = 3000
  } = options

  // Load image
  let canvas = await loadImageToCanvas(file)

  // Auto-crop to remove negative space
  if (autoCrop) {
    const bounds = detectReceiptBounds(canvas)
    canvas = cropImage(canvas, bounds, { maxWidth, maxHeight })
  }

  // Enhance contrast
  if (doEnhance) {
    canvas = enhanceContrast(canvas, {
      contrast: 1.3,
      brightness: 15,
      sharpen: true
    })
  }

  return {
    dataUrl: canvasToDataUrl(canvas),
    width: canvas.width,
    height: canvas.height
  }
}
