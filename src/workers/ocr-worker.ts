/**
 * OCR Web Worker
 * Offloads OCR processing to a background thread to keep UI responsive
 * 
 * Note: This is a worker script that should be loaded via new Worker()
 * In Next.js, use next/script or dynamic import for worker loading
 */

// Message types
export interface OCRWorkerMessage {
  type: 'PROCESS_IMAGE' | 'BATCH_PROCESS' | 'CANCEL'
  id: string
  payload?: {
    imageData?: string
    images?: { id: string; data: string }[]
    options?: OCROptions
  }
}

export interface OCRWorkerResponse {
  type: 'RESULT' | 'PROGRESS' | 'ERROR' | 'CANCELLED'
  id: string
  payload?: {
    result?: OCRResult
    results?: OCRResult[]
    progress?: number
    total?: number
    error?: string
  }
}

export interface OCROptions {
  language?: string
  enhanceContrast?: boolean
  deskew?: boolean
}

export interface OCRResult {
  id: string
  text: string
  confidence: number
  vendor?: string
  amount?: number
  date?: string
  processingTime: number
}

// Simple text extraction patterns (fallback when Tesseract not available)
const AMOUNT_PATTERNS = [
  /\$\s*([\d,]+\.?\d*)/g,
  /total[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
  /amount[:\s]*\$?\s*([\d,]+\.?\d*)/gi,
]

const DATE_PATTERNS = [
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
  /(\w{3,9}\s+\d{1,2},?\s+\d{4})/g,
]

/**
 * Extract text patterns from OCR result
 */
function extractPatterns(text: string): {
  amounts: number[]
  dates: string[]
  possibleVendor: string | null
} {
  const amounts: number[] = []
  const dates: string[] = []
  
  // Extract amounts
  AMOUNT_PATTERNS.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount)
      }
    }
  })
  
  // Extract dates
  DATE_PATTERNS.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      dates.push(match[1])
    }
  })
  
  // Try to find vendor (usually first line or after "sold to")
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const possibleVendor = lines[0]?.trim() || null
  
  return { amounts, dates, possibleVendor }
}

/**
 * Process a single image (placeholder - actual OCR would use Tesseract.js)
 */
async function processImage(
  imageData: string,
  options: OCROptions = {}
): Promise<{ text: string; confidence: number }> {
  // In a real implementation, this would use Tesseract.js
  // For now, return a placeholder that indicates worker is functioning
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return {
    text: '[OCR Worker Active - Connect Tesseract.js for full OCR]',
    confidence: 0
  }
}

// Worker message handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function') {
  self.onmessage = async (event: MessageEvent<OCRWorkerMessage>) => {
    const { type, id, payload } = event.data
    
    try {
      switch (type) {
        case 'PROCESS_IMAGE': {
          if (!payload?.imageData) {
            throw new Error('No image data provided')
          }
          
          const startTime = performance.now()
          const { text, confidence } = await processImage(
            payload.imageData,
            payload.options
          )
          const processingTime = performance.now() - startTime
          
          const patterns = extractPatterns(text)
          
          const response: OCRWorkerResponse = {
            type: 'RESULT',
            id,
            payload: {
              result: {
                id,
                text,
                confidence,
                vendor: patterns.possibleVendor || undefined,
                amount: patterns.amounts[0],
                date: patterns.dates[0],
                processingTime
              }
            }
          }
          
          self.postMessage(response)
          break
        }
        
        case 'BATCH_PROCESS': {
          if (!payload?.images?.length) {
            throw new Error('No images provided for batch processing')
          }
          
          const results: OCRResult[] = []
          const total = payload.images.length
          
          for (let i = 0; i < total; i++) {
            const image = payload.images[i]
            const startTime = performance.now()
            
            // Send progress update
            const progressResponse: OCRWorkerResponse = {
              type: 'PROGRESS',
              id,
              payload: { progress: i + 1, total }
            }
            self.postMessage(progressResponse)
            
            const { text, confidence } = await processImage(
              image.data,
              payload.options
            )
            const processingTime = performance.now() - startTime
            
            const patterns = extractPatterns(text)
            
            results.push({
              id: image.id,
              text,
              confidence,
              vendor: patterns.possibleVendor || undefined,
              amount: patterns.amounts[0],
              date: patterns.dates[0],
              processingTime
            })
          }
          
          const response: OCRWorkerResponse = {
            type: 'RESULT',
            id,
            payload: { results }
          }
          
          self.postMessage(response)
          break
        }
        
        case 'CANCEL': {
          const response: OCRWorkerResponse = {
            type: 'CANCELLED',
            id
          }
          self.postMessage(response)
          break
        }
      }
    } catch (error) {
      const errorResponse: OCRWorkerResponse = {
        type: 'ERROR',
        id,
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
      self.postMessage(errorResponse)
    }
  }
}

// Export types for use in main thread
export type { }
