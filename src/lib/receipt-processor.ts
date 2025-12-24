'use client'

import { createWorker } from 'tesseract.js'
import { preprocessReceipt, loadImageToCanvas, enhanceContrast, canvasToDataUrl } from './image-processing'
import { performEnhancedOCR } from './ocr/enhanced-ocr'

export interface ProcessedReceipt {
  id: string
  originalFile: File
  processedImageUrl: string
  extractedData: ExtractedReceiptData
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
  progress: number
  progressStatus: string
}

export interface ExtractedReceiptData {
  vendor: string
  amount: number | null
  date: string
  rawText: string
  imageData: string
  subtotal?: number
  tax?: number
  lineItems?: { description: string; amount: number; sku?: string }[]
  paymentMethod?: string
  storeId?: string
  transactionId?: string
  time?: string
  transactionType?: 'income' | 'expense'
  transactionCategory?: string
  categorizationConfidence?: number
  ocrFailed?: boolean
}

export interface ProcessingOptions {
  useSAM: boolean
  enhanceContrast: boolean
  autoCrop: boolean
  ocrMode: 'fast' | 'accurate' | 'auto'
}

type ProgressCallback = (receipt: ProcessedReceipt) => void
type CompleteCallback = (receipt: ProcessedReceipt) => void

/**
 * Receipt processing queue that handles batch processing one at a time
 */
export class ReceiptProcessorQueue {
  private queue: ProcessedReceipt[] = []
  private isProcessing = false
  private onProgress: ProgressCallback | null = null
  private onComplete: CompleteCallback | null = null
  private options: ProcessingOptions = {
    useSAM: false,
    enhanceContrast: true,
    autoCrop: true,
    ocrMode: 'auto',
  }
  private samModule: typeof import('./sam-segmentation') | null = null

  constructor(options?: Partial<ProcessingOptions>) {
    if (options) {
      this.options = { ...this.options, ...options }
    }
  }

  setOptions(options: Partial<ProcessingOptions>) {
    this.options = { ...this.options, ...options }
  }

  setOnProgress(callback: ProgressCallback) {
    this.onProgress = callback
  }

  setOnComplete(callback: CompleteCallback) {
    this.onComplete = callback
  }

  getQueue(): ProcessedReceipt[] {
    return [...this.queue]
  }

  getStats() {
    const pending = this.queue.filter(r => r.status === 'pending').length
    const processing = this.queue.filter(r => r.status === 'processing').length
    const done = this.queue.filter(r => r.status === 'done').length
    const error = this.queue.filter(r => r.status === 'error').length
    return { pending, processing, done, error, total: this.queue.length }
  }

  /**
   * Add files to the processing queue
   */
  addFiles(files: File[]): ProcessedReceipt[] {
    const newReceipts: ProcessedReceipt[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      originalFile: file,
      processedImageUrl: '',
      extractedData: {
        vendor: '',
        amount: null,
        date: '',
        rawText: '',
        imageData: '',
      },
      status: 'pending' as const,
      progress: 0,
      progressStatus: 'Waiting...',
    }))

    this.queue.push(...newReceipts)
    
    // Auto-start processing if not already running
    if (!this.isProcessing) {
      this.processNext()
    }

    return newReceipts
  }

  /**
   * Remove a receipt from the queue
   */
  removeFromQueue(id: string) {
    this.queue = this.queue.filter(r => r.id !== id)
  }

  /**
   * Clear all completed/errored receipts from queue
   */
  clearCompleted() {
    this.queue = this.queue.filter(r => r.status === 'pending' || r.status === 'processing')
  }

  /**
   * Process the next receipt in queue
   */
  private async processNext() {
    const nextReceipt = this.queue.find(r => r.status === 'pending')
    if (!nextReceipt) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    nextReceipt.status = 'processing'
    nextReceipt.progress = 0
    nextReceipt.progressStatus = 'Starting...'
    this.onProgress?.(nextReceipt)

    try {
      await this.processReceipt(nextReceipt)
      nextReceipt.status = 'done'
      nextReceipt.progress = 100
      nextReceipt.progressStatus = 'Complete!'
      this.onComplete?.(nextReceipt)
    } catch (error) {
      nextReceipt.status = 'error'
      nextReceipt.error = error instanceof Error ? error.message : 'Processing failed'
      nextReceipt.progressStatus = 'Failed'
    }

    this.onProgress?.(nextReceipt)

    // Process next in queue - 3000ms delay between receipts for Gemini rate limiting
    // Combined with 1500ms delay between OCR and categorization calls within each receipt,
    // this ensures we never exceed Gemini's 10 req/sec limit
    // 95 receipts will take ~10-12 minutes, but will process reliably with full categorization
    // First receipt succeeded with this timing - maintaining same spacing for consistency
    setTimeout(() => this.processNext(), 3000)
  }

  /**
   * Process a single receipt through the full pipeline
   */
  private async processReceipt(receipt: ProcessedReceipt) {
    let file = receipt.originalFile

    // Step 0: Convert HEIC to JPEG if needed (SAM requires web-compatible formats)
    // Check if file type is already browser-compatible
    const browserReadableTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const isBrowserReadable = browserReadableTypes.includes(file.type)
    
    // Only try conversion if file type indicates it needs conversion
    const needsConversion = (file.type === 'image/heic' || file.type === 'image/heif') && !isBrowserReadable
    
    if (needsConversion) {
      receipt.progressStatus = 'Converting HEIC to JPEG...'
      receipt.progress = 5
      this.onProgress?.(receipt)

      try {
        const heic2any = await import('heic2any')
        const convertedBlob = await heic2any.default({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.92
        })
        
        // heic2any can return Blob or Blob[]
        const jpegBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
        file = new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { 
          type: 'image/jpeg' 
        })
        receipt.progressStatus = 'HEIC converted to JPEG'
      } catch (error) {
        console.warn('HEIC conversion failed, trying original file:', error)
        receipt.progressStatus = 'HEIC conversion failed, using original'
      }
    }

    // Step 1: Pre-process image (crop + contrast)
    receipt.progressStatus = 'Preprocessing image...'
    receipt.progress = 10
    this.onProgress?.(receipt)

    let processedImageUrl: string

    if (this.options.useSAM) {
      // Use SAM for intelligent cropping
      console.log('[SAM] Starting SAM processing for:', file.name)
      receipt.progressStatus = 'Loading AI model...'
      this.onProgress?.(receipt)

      if (!this.samModule) {
        console.log('[SAM] Loading SAM module dynamically...')
        this.samModule = await import('./sam-segmentation')
        console.log('[SAM] SAM module loaded successfully')
      } else {
        console.log('[SAM] SAM module already loaded, reusing')
      }

      receipt.progressStatus = 'Detecting receipt borders...'
      receipt.progress = 20
      this.onProgress?.(receipt)

      console.log('[SAM] Calling detectAndCropReceipt...')
      const cropResult = await this.samModule.detectAndCropReceipt(
        file,
        (progress, status) => {
          console.log(`[SAM] Progress: ${Math.round(progress * 100)}% - ${status}`)
          receipt.progress = 20 + Math.round(progress * 0.3)
          receipt.progressStatus = status
          this.onProgress?.(receipt)
        }
      )

      console.log('[SAM] detectAndCropReceipt returned:', cropResult ? 'SUCCESS' : 'NULL')
      if (cropResult) {
        console.log('[SAM] Crop result dimensions:', cropResult.width, 'x', cropResult.height)
        // Apply contrast enhancement to cropped image
        if (this.options.enhanceContrast) {
          receipt.progressStatus = 'Enhancing contrast...'
          receipt.progress = 55
          this.onProgress?.(receipt)

          const img = new Image()
          img.src = cropResult.croppedDataUrl
          await new Promise(resolve => img.onload = resolve)

          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)

          enhanceContrast(canvas, { contrast: 1.3, brightness: 15, sharpen: true })
          processedImageUrl = canvasToDataUrl(canvas)
        } else {
          processedImageUrl = cropResult.croppedDataUrl
        }
      } else {
        // Fallback to basic preprocessing
        console.warn('[SAM] SAM cropping returned NULL, falling back to basic preprocessing')
        const result = await preprocessReceipt(file, {
          autoCrop: this.options.autoCrop,
          enhanceContrast: this.options.enhanceContrast,
        })
        processedImageUrl = result.dataUrl
        console.log('[SAM] Fallback preprocessing complete')
      }
    } else {
      // Use basic preprocessing without SAM
      const result = await preprocessReceipt(file, {
        autoCrop: this.options.autoCrop,
        enhanceContrast: this.options.enhanceContrast,
      })
      processedImageUrl = result.dataUrl
    }

    receipt.processedImageUrl = processedImageUrl
    receipt.progress = 60
    receipt.progressStatus = 'Running OCR...'
    this.onProgress?.(receipt)

    // Step 2: Run enhanced OCR (Gemini or Tesseract based on mode)
    const ocrResult = await performEnhancedOCR(
      processedImageUrl,
      this.options.ocrMode,
      (progress, status) => {
        receipt.progress = 60 + Math.round(progress * 0.35)
        receipt.progressStatus = status
        this.onProgress?.(receipt)
      }
    )

    receipt.progress = 95
    receipt.progressStatus = 'Processing results...'
    this.onProgress?.(receipt)

    receipt.extractedData = {
      vendor: ocrResult.vendor || 'Unknown',
      date: ocrResult.date || new Date().toISOString().split('T')[0],
      time: ocrResult.time,
      amount: ocrResult.total || null,
      subtotal: ocrResult.subtotal,
      tax: ocrResult.tax,
      paymentMethod: ocrResult.paymentMethod,
      storeId: ocrResult.storeId,
      transactionId: ocrResult.transactionId,
      lineItems: ocrResult.lineItems?.map(item => ({
        description: item.description,
        amount: item.price || 0,
      })),
      rawText: ocrResult.rawText,
      imageData: processedImageUrl,
    }

    receipt.progress = 100
  }

  /**
   * Extract structured data from OCR text
   */
  private extractDataFromText(text: string): Omit<ExtractedReceiptData, 'imageData'> {
    const lines = text.split('\n').filter((line) => line.trim())
    
    // Extract vendor
    let vendor = ''
    const knownStores = ['home depot', 'walmart', 'target', 'costco', 'lowes', 'amazon', 'walgreens', 'cvs', 'kroger', 'safeway', 'whole foods', 'trader joe', 'best buy', 'staples', 'office depot', 'michaels', 'hobby lobby', 'joann', 'dollar tree', 'dollar general', 'family dollar', 'aldi', 'lidl', 'publix', 'wegmans', 'heb', 'meijer', 'winco']
    const textLower = text.toLowerCase()
    
    for (const store of knownStores) {
      if (textLower.includes(store)) {
        vendor = store.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        break
      }
    }
    
    if (!vendor) {
      for (const line of lines.slice(0, 5)) {
        const cleaned = line.trim()
        if (cleaned.length > 2 && cleaned.length < 50 && !/^\d+$/.test(cleaned)) {
          vendor = cleaned
          break
        }
      }
    }

    // Extract subtotal
    let subtotal: number | undefined
    const subtotalMatch = text.match(/subtotal[:\s]*\$?([\d,]+\.?\d*)/i)
    if (subtotalMatch) {
      const parsed = parseFloat(subtotalMatch[1].replace(',', ''))
      if (!isNaN(parsed) && parsed > 0) subtotal = parsed
    }

    // Extract tax
    let tax: number | undefined
    const taxPatterns = [/\btax[:\s]*\$?([\d,]+\.?\d*)/i, /sales tax[:\s]*\$?([\d,]+\.?\d*)/i]
    for (const pattern of taxPatterns) {
      const match = text.match(pattern)
      if (match) {
        const parsed = parseFloat(match[1].replace(',', ''))
        if (!isNaN(parsed) && parsed >= 0) {
          tax = parsed
          break
        }
      }
    }

    // Extract total amount
    let amount: number | null = null
    const amountPatterns = [
      /\btotal[:\s]*\$?([\d,]+\.?\d*)/i,
      /amount[:\s]*\$?([\d,]+\.?\d*)/i,
      /grand total[:\s]*\$?([\d,]+\.?\d*)/i,
    ]

    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match) {
        const parsed = parseFloat(match[1].replace(',', ''))
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
          amount = parsed
          break
        }
      }
    }

    if (amount === null) {
      const allAmounts = text.match(/\$?\d+\.\d{2}/g) || []
      const numbers = allAmounts
        .map((a) => parseFloat(a.replace('$', '')))
        .filter((n) => !isNaN(n) && n > 0)
      if (numbers.length > 0) {
        amount = Math.max(...numbers)
      }
    }

    // Extract line items
    const lineItems: { description: string; amount: number; sku?: string }[] = []
    const itemPattern = /^(.+?)\s+\$?([\d,]+\.\d{2})\s*$/
    const skuPattern = /^(\d{10,})\s+(.+?)\s+\$?([\d,]+\.\d{2})/
    
    for (const line of lines) {
      const skuMatch = line.match(skuPattern)
      if (skuMatch) {
        const itemAmount = parseFloat(skuMatch[3].replace(',', ''))
        if (!isNaN(itemAmount) && itemAmount > 0 && itemAmount < (amount || 10000)) {
          lineItems.push({
            sku: skuMatch[1],
            description: skuMatch[2].trim(),
            amount: itemAmount,
          })
        }
        continue
      }
      
      const itemMatch = line.match(itemPattern)
      if (itemMatch) {
        const desc = itemMatch[1].trim()
        const itemAmount = parseFloat(itemMatch[2].replace(',', ''))
        if (desc.length > 2 && !isNaN(itemAmount) && itemAmount > 0 && itemAmount < (amount || 10000)) {
          if (!/total|subtotal|tax|change|cash|credit|debit/i.test(desc)) {
            lineItems.push({ description: desc, amount: itemAmount })
          }
        }
      }
    }

    // Extract payment method
    let paymentMethod: string | undefined
    if (/visa/i.test(text)) paymentMethod = 'Visa'
    else if (/mastercard|master card/i.test(text)) paymentMethod = 'Mastercard'
    else if (/amex|american express/i.test(text)) paymentMethod = 'American Express'
    else if (/discover/i.test(text)) paymentMethod = 'Discover'
    else if (/debit/i.test(text)) paymentMethod = 'Debit Card'
    else if (/credit/i.test(text)) paymentMethod = 'Credit Card'
    else if (/cash/i.test(text)) paymentMethod = 'Cash'
    else if (/apple pay/i.test(text)) paymentMethod = 'Apple Pay'
    else if (/google pay/i.test(text)) paymentMethod = 'Google Pay'

    // Extract store/transaction ID
    let storeId: string | undefined
    let transactionId: string | undefined
    const storeIdMatch = text.match(/store[#:\s]*(\d+)/i) || text.match(/str[#:\s]*(\d+)/i)
    if (storeIdMatch) storeId = storeIdMatch[1]
    
    const transIdMatch = text.match(/trans(?:action)?[#:\s]*(\d+)/i) || text.match(/receipt[#:\s]*(\d+)/i)
    if (transIdMatch) transactionId = transIdMatch[1]

    // Extract time
    let time: string | undefined
    const timeMatch = text.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i)
    if (timeMatch) time = timeMatch[1]

    // Extract date
    let date = new Date().toISOString().split('T')[0]
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    ]

    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        try {
          const parsed = new Date(match[0])
          if (!isNaN(parsed.getTime())) {
            date = parsed.toISOString().split('T')[0]
            break
          }
        } catch {
          if (match[3] && match[3].length === 4) {
            date = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`
          } else if (match[1] && match[1].length === 4) {
            date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
          }
        }
        break
      }
    }

    return {
      vendor: vendor || 'Unknown Vendor',
      amount,
      date,
      rawText: text,
      subtotal,
      tax,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
      paymentMethod,
      storeId,
      transactionId,
      time,
    }
  }
}

// Singleton instance for app-wide use
let processorInstance: ReceiptProcessorQueue | null = null

export function getReceiptProcessor(options?: Partial<ProcessingOptions>): ReceiptProcessorQueue {
  if (!processorInstance) {
    processorInstance = new ReceiptProcessorQueue(options)
  } else if (options) {
    processorInstance.setOptions(options)
  }
  return processorInstance
}
