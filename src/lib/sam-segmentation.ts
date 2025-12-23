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

export interface ReceiptCropResult {
  croppedDataUrl: string
  originalWidth: number
  originalHeight: number
  width: number
  height: number
  cropBounds: { x: number; y: number; width: number; height: number }
  confidence: number
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
    console.log(`[SAM-MASK] Generating mask for point:`, point)
    const input_points = [[[point[0], point[1]]]]
    console.log(`[SAM-MASK] Processing inputs...`)
    const inputs = await processor(rawImage, input_points)
    console.log(`[SAM-MASK] Running model inference...`)
    const outputs = await model(inputs)
    console.log(`[SAM-MASK] Post-processing masks...`)
    
    const masks = await processor.post_process_masks(
      outputs.pred_masks,
      inputs.original_sizes,
      inputs.reshaped_input_sizes
    )
    console.log(`[SAM-MASK] Masks generated, validating...`)
    console.log(`[SAM-MASK] Masks structure:`, masks)
    
    // Validate masks structure
    if (!masks || !masks[0]) {
      console.warn('[SAM-MASK] No masks generated for point:', point)
      return null
    }
    
    // Get the best mask (highest IoU score)
    const scores = outputs.iou_scores.data || outputs.iou_scores
    console.log(`[SAM-MASK] Scores array:`, scores, 'length:', scores?.length)
    const bestIdx = scores.indexOf(Math.max(...scores))
    console.log(`[SAM-MASK] Best score index:`, bestIdx)
    
    // masks is [Tensor] - access the first tensor
    const maskTensor = masks[0]
    console.log(`[SAM-MASK] Mask tensor:`, maskTensor, 'dims:', maskTensor.dims)
    
    // For SAM, the tensor has shape [batch, num_masks, height, width]
    // dims[0] = batch (1), dims[1] = num_masks (3), dims[2] = height, dims[3] = width
    const numMasks = maskTensor.dims[1]
    const maskHeight = maskTensor.dims[2]
    const maskWidth = maskTensor.dims[3]
    const maskSize = maskHeight * maskWidth
    
    console.log(`[SAM-MASK] Extracting mask ${bestIdx} from tensor with ${numMasks} masks, size ${maskWidth}x${maskHeight}`)
    
    // Extract the specific mask data from the tensor
    // The data is laid out as: [batch0_mask0, batch0_mask1, batch0_mask2]
    const startIdx = bestIdx * maskSize
    const endIdx = startIdx + maskSize
    const maskData = maskTensor.data.slice(startIdx, endIdx)
    
    console.log(`[SAM-MASK] Extracted mask data, length: ${maskData.length}, expected: ${maskSize}`)
    console.log(`[SAM-MASK] Mask generated successfully, score:`, scores[bestIdx])
    
    // Return a mask object with data property that downstream functions expect
    return {
      mask: { 
        data: maskData,
        width: maskWidth,
        height: maskHeight
      },
      score: scores[bestIdx],
    }
  } catch (e) {
    console.error('[SAM-MASK] Error generating mask at point:', point, e)
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

/**
 * Detect receipt borders and crop out negative space
 * Uses SAM to find the main receipt region in a phone photo
 * Returns a cropped image focused on just the receipt
 */
export async function detectAndCropReceipt(
  imageSource: string | File,
  onProgress?: (progress: number, status: string) => void
): Promise<ReceiptCropResult | null> {
  console.log('[SAM-DETECT] detectAndCropReceipt called with:', imageSource instanceof File ? imageSource.name : 'data URL')
  
  // Ensure model is loaded
  console.log('[SAM-DETECT] Loading SAM model...')
  await loadSAMModel(onProgress)
  console.log('[SAM-DETECT] SAM model loaded')
  
  onProgress?.(0, 'Analyzing image...')
  
  // Convert File to data URL if needed
  let imageUrl: string
  if (imageSource instanceof File) {
    console.log('[SAM-DETECT] Converting File to data URL...')
    imageUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.readAsDataURL(imageSource)
    })
    console.log('[SAM-DETECT] File converted to data URL, length:', imageUrl.length)
  } else {
    imageUrl = imageSource
    console.log('[SAM-DETECT] Using provided data URL, length:', imageUrl.length)
  }
  
  // Load image using dynamic import
  console.log('[SAM-DETECT] Loading image with RawImage...')
  const { RawImage } = await getTransformers()
  let rawImage = await RawImage.read(imageUrl)
  const originalWidth = rawImage.width
  const originalHeight = rawImage.height
  console.log('[SAM-DETECT] Image loaded, dimensions:', originalWidth, 'x', originalHeight)
  
  // Resize large images for better SAM performance (SAM works best with ~1024-2048px images)
  const MAX_DIMENSION = 1536
  let samImageUrl = imageUrl
  let samScale = 1.0
  
  if (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION) {
    samScale = MAX_DIMENSION / Math.max(originalWidth, originalHeight)
    const newWidth = Math.round(originalWidth * samScale)
    const newHeight = Math.round(originalHeight * samScale)
    console.log(`[SAM-DETECT] Resizing image from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight} for SAM processing`)
    
    // Resize using canvas
    const resizeCanvas = document.createElement('canvas')
    resizeCanvas.width = newWidth
    resizeCanvas.height = newHeight
    const resizeCtx = resizeCanvas.getContext('2d')!
    
    const tempImg = new Image()
    tempImg.src = imageUrl
    await new Promise((resolve) => (tempImg.onload = resolve))
    resizeCtx.drawImage(tempImg, 0, 0, newWidth, newHeight)
    
    samImageUrl = resizeCanvas.toDataURL('image/jpeg', 0.9)
    rawImage = await RawImage.read(samImageUrl)
    console.log('[SAM-DETECT] Image resized for SAM processing:', rawImage.width, 'x', rawImage.height)
  }
  
  const samWidth = rawImage.width
  const samHeight = rawImage.height
  
  // Create canvas for cropping using ORIGINAL resolution
  const canvas = document.createElement('canvas')
  canvas.width = originalWidth
  canvas.height = originalHeight
  const ctx = canvas.getContext('2d')!
  
  // Draw ORIGINAL image to canvas
  const img = new Image()
  img.src = imageUrl
  await new Promise((resolve) => (img.onload = resolve))
  ctx.drawImage(img, 0, 0)
  
  onProgress?.(20, 'Detecting receipt boundaries...')
  
  // Sample center point - receipts are usually centered in phone photos (use SAM-resized dimensions)
  const centerPoint: [number, number] = [Math.round(samWidth / 2), Math.round(samHeight / 2)]
  
  // Also try points in a cross pattern to find the receipt
  const samplePoints: [number, number][] = [
    centerPoint,
    [Math.round(samWidth * 0.3), Math.round(samHeight / 2)],
    [Math.round(samWidth * 0.7), Math.round(samHeight / 2)],
    [Math.round(samWidth / 2), Math.round(samHeight * 0.3)],
    [Math.round(samWidth / 2), Math.round(samHeight * 0.7)],
  ]
  
  let bestMask: { mask: any; score: number } | null = null
  let bestArea = 0
  
  console.log('[SAM-DETECT] Scanning', samplePoints.length, 'sample points for receipt...')
  for (let i = 0; i < samplePoints.length; i++) {
    const point = samplePoints[i]
    console.log(`[SAM-DETECT] Scanning point ${i + 1}/${samplePoints.length}:`, point)
    onProgress?.(20 + Math.round((i / samplePoints.length) * 40), `Scanning point ${i + 1}/${samplePoints.length}...`)
    
    const result = await generateMaskAtPoint(rawImage, point)
    console.log(`[SAM-DETECT] Point ${i + 1} result:`, result ? `score=${result.score.toFixed(3)}` : 'NULL')
    
    if (result && result.score > 0.7) {
      const area = getMaskArea(result.mask)
      const bb = getBoundingBox(result.mask, samWidth, samHeight)
      const aspectRatio = bb.width / bb.height
      console.log(`[SAM-DETECT] Point ${i + 1} passed score threshold. Area: ${area}, BBox: ${bb.width}x${bb.height}, AspectRatio: ${aspectRatio.toFixed(2)}`)
      
      // Receipts are typically portrait-oriented (taller than wide)
      // Accept aspect ratios from 0.3 (very tall) to 1.5 (slightly wide)
      if (aspectRatio >= 0.2 && aspectRatio <= 2.0) {
        // Prefer larger areas (more likely to be the full receipt)
        // But not too large (>60% is probably background/whole image)
        const imageArea = samWidth * samHeight
        const areaPercent = area / imageArea
        console.log(`[SAM-DETECT] Point ${i + 1} aspect ratio OK. Area %: ${(areaPercent * 100).toFixed(1)}%`)
        
        if (areaPercent > 0.05 && areaPercent < 0.60 && area > bestArea) {
          console.log(`[SAM-DETECT] Point ${i + 1} is new BEST mask (area: ${area} > ${bestArea})`)
          bestMask = result
          bestArea = area
        } else if (areaPercent >= 0.60) {
          console.log(`[SAM-DETECT] Point ${i + 1} REJECTED - area too large (${(areaPercent * 100).toFixed(1)}% > 60%), likely background`)
        }
      }
    }
  }
  
  if (!bestMask) {
    console.warn('[SAM-DETECT] No valid mask found after scanning all points')
    onProgress?.(100, 'No receipt detected, using full image')
    return null
  }
  
  console.log('[SAM-DETECT] Best mask found with score:', bestMask.score.toFixed(3), 'area:', bestArea)
  onProgress?.(70, 'Cropping receipt...')
  
  // Get bounding box from SAM (in SAM-resized coordinates)
  const samBoundingBox = getBoundingBox(bestMask.mask, samWidth, samHeight)
  console.log('[SAM-DETECT] SAM bounding box (resized coords):', samBoundingBox)
  
  // Scale bounding box back to original image dimensions
  const boundingBox = {
    x: Math.round(samBoundingBox.x / samScale),
    y: Math.round(samBoundingBox.y / samScale),
    width: Math.round(samBoundingBox.width / samScale),
    height: Math.round(samBoundingBox.height / samScale),
  }
  console.log('[SAM-DETECT] Bounding box (original coords):', boundingBox)
  
  // Add small padding around the receipt
  const padding = Math.min(originalWidth, originalHeight) * 0.02
  const cropBounds = {
    x: Math.max(0, boundingBox.x - padding),
    y: Math.max(0, boundingBox.y - padding),
    width: Math.min(originalWidth - boundingBox.x + padding, boundingBox.width + padding * 2),
    height: Math.min(originalHeight - boundingBox.y + padding, boundingBox.height + padding * 2),
  }
  console.log('[SAM-DETECT] Crop bounds with padding:', cropBounds)
  
  // Create cropped canvas
  const croppedCanvas = document.createElement('canvas')
  croppedCanvas.width = cropBounds.width
  croppedCanvas.height = cropBounds.height
  const croppedCtx = croppedCanvas.getContext('2d')!
  console.log('[SAM-DETECT] Created cropped canvas:', cropBounds.width, 'x', cropBounds.height)
  
  croppedCtx.drawImage(
    canvas,
    cropBounds.x, cropBounds.y, cropBounds.width, cropBounds.height,
    0, 0, cropBounds.width, cropBounds.height
  )
  
  onProgress?.(100, 'Receipt cropped!')
  
  const result = {
    croppedDataUrl: croppedCanvas.toDataURL('image/jpeg', 0.92),
    originalWidth: originalWidth,
    originalHeight: originalHeight,
    width: cropBounds.width,
    height: cropBounds.height,
    cropBounds,
    confidence: bestMask.score,
  }
  
  console.log('[SAM-DETECT] Returning result:', {
    dataUrlLength: result.croppedDataUrl.length,
    dimensions: `${result.width}x${result.height}`,
    confidence: result.confidence.toFixed(3)
  })
  
  return result
}
