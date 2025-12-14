'use client'

// Dynamic imports to avoid SSR issues with onnxruntime-node
let transformersModule: any = null

const getTransformers = async () => {
  if (!transformersModule) {
    transformersModule = await import('@xenova/transformers')
  }
  return transformersModule
}

let model: any = null
let processor: any = null
let isLoading = false

export interface SegmentedRegion {
  id: number
  mask: ImageData
  boundingBox: { x: number; y: number; width: number; height: number }
  area: number
  croppedImageData: string // base64 data URL
}

export async function loadSAMModel(
  onProgress?: (progress: number, status: string) => void
): Promise<void> {
  if (model && processor) return
  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise((r) => setTimeout(r, 100))
    }
    return
  }

  isLoading = true
  try {
    onProgress?.(0, 'Loading SAM model...')
    
    const { SamModel, AutoProcessor } = await getTransformers()
    
    model = await SamModel.from_pretrained('Xenova/slimsam-77-uniform', {
      progress_callback: (data: any) => {
        if (data.status === 'progress') {
          const percent = Math.round((data.loaded / data.total) * 100)
          onProgress?.(percent, `Downloading model: ${percent}%`)
        }
      },
    })
    
    onProgress?.(50, 'Loading processor...')
    processor = await AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform')
    
    onProgress?.(100, 'Model loaded!')
  } finally {
    isLoading = false
  }
}

export function isSAMLoaded(): boolean {
  return model !== null && processor !== null
}

async function generateMaskAtPoint(
  rawImage: any,
  point: [number, number]
): Promise<{ mask: any; score: number } | null> {
  try {
    const input_points = [[[point[0], point[1]]]]
    const inputs = await processor(rawImage, input_points)
    const outputs = await model(inputs)
    
    const masks = await processor.post_process_masks(
      outputs.pred_masks,
      inputs.original_sizes,
      inputs.reshaped_input_sizes
    )
    
    // Get the best mask (highest IoU score)
    const scores = outputs.iou_scores.data
    const bestIdx = scores.indexOf(Math.max(...scores))
    
    return {
      mask: masks[0][bestIdx],
      score: scores[bestIdx],
    }
  } catch (e) {
    console.error('Error generating mask at point:', point, e)
    return null
  }
}

function maskToImageData(mask: any, width: number, height: number): ImageData {
  const imageData = new ImageData(width, height)
  const maskData = mask.data
  
  for (let i = 0; i < maskData.length; i++) {
    const idx = i * 4
    const value = maskData[i] ? 255 : 0
    imageData.data[idx] = value     // R
    imageData.data[idx + 1] = value // G
    imageData.data[idx + 2] = value // B
    imageData.data[idx + 3] = maskData[i] ? 255 : 0 // A
  }
  
  return imageData
}

function getBoundingBox(mask: any, width: number, height: number): { x: number; y: number; width: number; height: number } {
  const maskData = mask.data
  let minX = width, minY = height, maxX = 0, maxY = 0
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (maskData[idx]) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function getMaskArea(mask: any): number {
  const maskData = mask.data
  let area = 0
  for (let i = 0; i < maskData.length; i++) {
    if (maskData[i]) area++
  }
  return area
}

function cropImageToRegion(
  canvas: HTMLCanvasElement,
  boundingBox: { x: number; y: number; width: number; height: number },
  padding: number = 10
): string {
  const ctx = canvas.getContext('2d')!
  
  // Add padding
  const x = Math.max(0, boundingBox.x - padding)
  const y = Math.max(0, boundingBox.y - padding)
  const width = Math.min(canvas.width - x, boundingBox.width + padding * 2)
  const height = Math.min(canvas.height - y, boundingBox.height + padding * 2)
  
  // Create cropped canvas
  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = width
  croppedCanvas.height = height
  const croppedCtx = croppedCanvas.getContext('2d')!
  
  croppedCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height)
  
  return croppedCanvas.toDataURL('image/png')
}

function masksOverlap(mask1: any, mask2: any, threshold: number = 0.5): boolean {
  const data1 = mask1.data
  const data2 = mask2.data
  
  let intersection = 0
  let union = 0
  
  for (let i = 0; i < data1.length; i++) {
    const a = data1[i] ? 1 : 0
    const b = data2[i] ? 1 : 0
    intersection += a && b ? 1 : 0
    union += a || b ? 1 : 0
  }
  
  const iou = union > 0 ? intersection / union : 0
  return iou > threshold
}

export async function segmentReceipts(
  imageSource: string | File,
  onProgress?: (progress: number, status: string) => void
): Promise<SegmentedRegion[]> {
  // Ensure model is loaded
  await loadSAMModel(onProgress)
  
  onProgress?.(0, 'Processing image...')
  
  // Convert File to data URL if needed
  let imageUrl: string
  if (imageSource instanceof File) {
    imageUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.readAsDataURL(imageSource)
    })
  } else {
    imageUrl = imageSource
  }
  
  // Load image using dynamic import
  const { RawImage } = await getTransformers()
  const rawImage = await RawImage.read(imageUrl)
  const width = rawImage.width
  const height = rawImage.height
  
  // Create canvas for cropping
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  
  // Draw image to canvas
  const img = new Image()
  img.src = imageUrl
  await new Promise((resolve) => (img.onload = resolve))
  ctx.drawImage(img, 0, 0)
  
  // Generate grid of points for automatic segmentation
  const gridSize = 4 // 4x4 grid = 16 points
  const points: [number, number][] = []
  
  for (let i = 1; i < gridSize; i++) {
    for (let j = 1; j < gridSize; j++) {
      points.push([
        Math.round((width * i) / gridSize),
        Math.round((height * j) / gridSize),
      ])
    }
  }
  
  onProgress?.(10, 'Detecting objects...')
  
  // Generate masks for each point
  const allMasks: { mask: any; score: number }[] = []
  
  for (let i = 0; i < points.length; i++) {
    const result = await generateMaskAtPoint(rawImage, points[i])
    if (result && result.score > 0.7) {
      allMasks.push(result)
    }
    onProgress?.(10 + Math.round((i / points.length) * 60), `Scanning region ${i + 1}/${points.length}`)
  }
  
  onProgress?.(70, 'Filtering receipt regions...')
  
  // Filter and deduplicate masks
  const uniqueMasks: { mask: any; score: number }[] = []
  const minArea = width * height * 0.01 // At least 1% of image
  const maxArea = width * height * 0.9  // At most 90% of image
  
  for (const maskResult of allMasks) {
    const area = getMaskArea(maskResult.mask)
    
    // Filter by area
    if (area < minArea || area > maxArea) continue
    
    // Filter by aspect ratio (receipts are usually taller than wide or roughly square)
    const bb = getBoundingBox(maskResult.mask, width, height)
    const aspectRatio = bb.width / bb.height
    if (aspectRatio > 3 || aspectRatio < 0.2) continue // Skip very wide or very tall shapes
    
    // Check for overlap with existing masks
    const overlaps = uniqueMasks.some((m) => masksOverlap(m.mask, maskResult.mask, 0.5))
    if (!overlaps) {
      uniqueMasks.push(maskResult)
    }
  }
  
  onProgress?.(80, 'Extracting receipt images...')
  
  // Convert to SegmentedRegion format
  const regions: SegmentedRegion[] = uniqueMasks.map((m, idx) => {
    const boundingBox = getBoundingBox(m.mask, width, height)
    return {
      id: idx,
      mask: maskToImageData(m.mask, width, height),
      boundingBox,
      area: getMaskArea(m.mask),
      croppedImageData: cropImageToRegion(canvas, boundingBox),
    }
  })
  
  // Sort by vertical position (top to bottom)
  regions.sort((a, b) => a.boundingBox.y - b.boundingBox.y)
  
  onProgress?.(100, `Found ${regions.length} receipt(s)`)
  
  return regions
}
