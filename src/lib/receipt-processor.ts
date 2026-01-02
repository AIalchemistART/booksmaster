'use client'

import { createWorker } from 'tesseract.js'
import { preprocessReceipt, loadImageToCanvas, enhanceContrast, canvasToDataUrl } from './image-processing'
import { performEnhancedOCR } from './ocr/enhanced-ocr'

export interface ProcessedReceipt {
  id: string
  originalFile: File
  originalFileBlobUrl?: string // Blob URL created from originalFile for reliable access
  processedImageUrl: string
  originalImageData?: string // Original image before SAM cropping
  croppedImageData?: string // SAM-cropped image
  prefersCropped?: boolean // User preference for which view to display
  extractedData: ExtractedReceiptData
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
  progress: number
  progressStatus: string
  processingStartTime?: number // Timestamp when processing started
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
  cardLastFour?: string
  storeId?: string
  transactionId?: string
  time?: string
  transactionType?: 'income' | 'expense'
  transactionCategory?: string
  categorizationConfidence?: number
  ocrFailed?: boolean
  // Return receipt tracking
  isReturn?: boolean
  originalReceiptNumber?: string
  // Document classification
  documentType?: 'itemized_receipt' | 'payment_receipt' | 'manifest' | 'invoice' | 'unknown'
  documentTypeConfidence?: number
  documentTypeReasoning?: string
  // Document identifiers for linking
  transactionNumber?: string
  orderNumber?: string
  invoiceNumber?: string
  accountNumber?: string
  // Duplicate detection
  sourceFilename?: string
}

export interface ProcessingOptions {
  useSAM: boolean // DISABLED: SAM adds 2x processing time for minimal benefit
  enhanceContrast: boolean
  // autoCrop: REMOVED - only useful with SAM segmenter which is disabled
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
  private onProgressCallbacks: ProgressCallback[] = []
  private onCompleteCallbacks: CompleteCallback[] = []
  private options: ProcessingOptions = {
    useSAM: false,
    enhanceContrast: true,
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
    // Add callback if not already registered
    if (!this.onProgressCallbacks.includes(callback)) {
      this.onProgressCallbacks.push(callback)
    }
  }

  setOnComplete(callback: CompleteCallback) {
    // Add callback if not already registered
    if (!this.onCompleteCallbacks.includes(callback)) {
      this.onCompleteCallbacks.push(callback)
    }
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

  hasActiveProcessing(): boolean {
    return this.isProcessing || this.queue.some(r => r.status === 'pending' || r.status === 'processing')
  }

  /**
   * Add files to the processing queue
   */
  addFiles(files: File[]): ProcessedReceipt[] {
    const newReceipts: ProcessedReceipt[] = files.map(file => {
      // Create blob URL immediately to preserve file data
      // File objects can become invalid after being read once
      const blobUrl = URL.createObjectURL(file)
      console.log(`[BLOB] Created blob URL for ${file.name}: ${blobUrl.substring(0, 50)}...`)
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        originalFile: file,
        originalFileBlobUrl: blobUrl, // Store blob URL for reliable access
        processedImageUrl: '',
        extractedData: {
          vendor: '',
          amount: null,
          date: '',
          rawText: '',
          imageData: '',
          sourceFilename: file.name, // Track filename for duplicate detection
        },
        status: 'pending' as const,
        progress: 0,
        progressStatus: 'Waiting...',
      }
    })

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
   * Clean up stalled receipts that have been stuck in 'processing' for too long
   * Timeout: 5 minutes (300000ms)
   */
  cleanupStalledReceipts() {
    const STALL_TIMEOUT = 5 * 60 * 1000 // 5 minutes
    const now = Date.now()
    let cleaned = 0

    this.queue.forEach(receipt => {
      if (receipt.status === 'processing' && receipt.processingStartTime) {
        const processingDuration = now - receipt.processingStartTime
        if (processingDuration > STALL_TIMEOUT) {
          console.warn(`[PROCESSOR] Receipt ${receipt.id} stalled for ${processingDuration}ms, marking as error`)
          receipt.status = 'error'
          receipt.error = 'Processing timeout - receipt took too long to process'
          receipt.progressStatus = 'Timeout'
          cleaned++
          this.onProgressCallbacks.forEach(cb => cb(receipt))
        }
      }
    })

    if (cleaned > 0) {
      console.log(`[PROCESSOR] Cleaned up ${cleaned} stalled receipt(s)`)
      this.isProcessing = false // Reset processing flag
    }

    return cleaned
  }

  /**
   * Process the next receipt in queue
   */
  private async processNext() {
    const nextReceipt = this.queue.find(r => r.status === 'pending')
    if (!nextReceipt) {
      this.isProcessing = false
      console.log('[PROCESSOR] Queue empty, processing stopped')
      return
    }

    this.isProcessing = true
    nextReceipt.status = 'processing'
    nextReceipt.progress = 0
    nextReceipt.progressStatus = 'Starting...'
    nextReceipt.processingStartTime = Date.now()
    this.onProgressCallbacks.forEach(cb => cb(nextReceipt))

    const receiptStartTime = Date.now()
    console.log(`[PROCESSOR] ===== Starting receipt ${nextReceipt.id} at ${new Date().toISOString()} =====`)

    try {
      await this.processReceipt(nextReceipt)
      const receiptDuration = Date.now() - receiptStartTime
      nextReceipt.status = 'done'
      nextReceipt.progress = 100
      nextReceipt.progressStatus = 'Complete!'
      console.log(`[PROCESSOR] ===== Receipt ${nextReceipt.id} COMPLETED in ${receiptDuration}ms =====`)
      this.onCompleteCallbacks.forEach(cb => cb(nextReceipt))
    } catch (error) {
      const receiptDuration = Date.now() - receiptStartTime
      nextReceipt.status = 'error'
      nextReceipt.error = error instanceof Error ? error.message : 'Processing failed'
      nextReceipt.progressStatus = 'Failed'
      console.error(`[PROCESSOR] ===== Receipt ${nextReceipt.id} FAILED after ${receiptDuration}ms =====`, error)
    }

    this.onProgressCallbacks.forEach(cb => cb(nextReceipt))

    // Process next in queue - 2000ms delay between receipts
    // Gemini categorization disabled in receipt flow, only OCR calls are made
    // With one Gemini call per receipt (OCR only), we can process much faster
    // 95 receipts will take ~10-12 minutes with OCR + heuristic categorization
    console.log(`[PROCESSOR] Waiting 2000ms before next receipt at ${new Date().toISOString()}`)
    setTimeout(() => {
      console.log(`[PROCESSOR] Delay complete, processing next receipt at ${new Date().toISOString()}`)
      this.processNext()
    }, 2000)
  }

  /**
   * Process a single receipt through the full pipeline
   */
  private async processReceipt(receipt: ProcessedReceipt) {
    // Use blob URL if available (more reliable than File object which can become invalid)
    // If no blob URL, create one now from the File object
    let fileUrl = receipt.originalFileBlobUrl
    console.log(`[BLOB] Receipt ${receipt.id} - originalFileBlobUrl: ${fileUrl ? fileUrl.substring(0, 50) + '...' : 'NULL'}`)
    if (!fileUrl) {
      console.log(`[BLOB] No blob URL found, creating one for ${receipt.originalFile.name}`)
      fileUrl = URL.createObjectURL(receipt.originalFile)
      receipt.originalFileBlobUrl = fileUrl
      console.log(`[BLOB] Created fallback blob URL: ${fileUrl.substring(0, 50)}...`)
    }
    console.log(`[BLOB] Using blob URL for processing: ${fileUrl.substring(0, 50)}...`)
    
    let file = receipt.originalFile
    console.log(`[FILE] File object: name=${file.name}, type=${file.type}, size=${file.size}`)

    // Step 0: Convert HEIC to JPEG if needed (SAM requires web-compatible formats)
    // Check if file type is already browser-compatible
    const browserReadableTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const isBrowserReadable = browserReadableTypes.includes(file.type)
    
    // Check file extension as fallback (Electron files from file system have empty type)
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    const isHEICByExtension = ['heic', 'heif'].includes(fileExtension)
    const isHEICByMimeType = file.type === 'image/heic' || file.type === 'image/heif'
    
    // Convert if: (1) MIME type indicates HEIC, OR (2) Extension is HEIC and not browser-readable
    const needsConversion = (isHEICByMimeType || (isHEICByExtension && !isBrowserReadable))
    
    if (needsConversion) {
      receipt.progressStatus = 'Converting HEIC to JPEG...'
      receipt.progress = 5
      this.onProgressCallbacks.forEach(cb => cb(receipt))
      
      console.log(`[HEIC] Converting ${file.name} (detected by ${isHEICByMimeType ? 'MIME type' : 'extension'})`)

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
        console.log(`[HEIC] Successfully converted to JPEG: ${file.name}`)
        receipt.progressStatus = 'HEIC converted to JPEG'
      } catch (error) {
        console.error('[HEIC] Conversion failed:', error)
        receipt.progressStatus = 'HEIC conversion failed, using original'
        // Still try to process - sometimes the file is actually readable
      }
    }

    // Step 1: Pre-process image (crop + contrast)
    receipt.progressStatus = 'Preprocessing image...'
    receipt.progress = 10
    this.onProgressCallbacks.forEach(cb => cb(receipt))

    let processedImageUrl: string

    if (this.options.useSAM) {
      // Use SAM for intelligent cropping
      console.log('[SAM] Starting SAM processing for:', file.name)
      receipt.progressStatus = 'Loading AI model...'
      this.onProgressCallbacks.forEach(cb => cb(receipt))

      if (!this.samModule) {
        console.log('[SAM] Loading SAM module dynamically...')
        this.samModule = await import('./sam-segmentation')
        console.log('[SAM] SAM module loaded successfully')
      } else {
        console.log('[SAM] SAM module already loaded, reusing')
      }

      receipt.progressStatus = 'Detecting receipt borders...'
      receipt.progress = 20
      this.onProgressCallbacks.forEach(cb => cb(receipt))

      console.log(`[SAM] Calling detectAndCropReceipt with blob URL: ${fileUrl.substring(0, 50)}...`)
      const cropResult = await this.samModule.detectAndCropReceipt(
        fileUrl, // Use blob URL instead of File object for reliable access
        (progress, status) => {
          console.log(`[SAM] Progress: ${Math.round(progress * 100)}% - ${status}`)
          receipt.progress = 20 + Math.round(progress * 0.3)
          receipt.progressStatus = status
          this.onProgressCallbacks.forEach(cb => cb(receipt))
        }
      )

      console.log('[SAM] detectAndCropReceipt returned:', cropResult ? 'SUCCESS' : 'NULL')
      if (cropResult) {
        console.log('[SAM] Crop result dimensions:', cropResult.width, 'x', cropResult.height)
        
        // Store original image URL (before cropping) to blob URL
        const originalResult = await preprocessReceipt(file, {
          enhanceContrast: false,
        })
        receipt.originalImageData = originalResult.dataUrl
        
        // Apply contrast enhancement to cropped image
        if (this.options.enhanceContrast) {
          receipt.progressStatus = 'Enhancing contrast...'
          receipt.progress = 55
          this.onProgressCallbacks.forEach(cb => cb(receipt))

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
        
        // Store cropped version
        receipt.croppedImageData = processedImageUrl
        // Default to cropped view
        receipt.prefersCropped = true
      } else {
        // Fallback to basic preprocessing
        console.warn('[SAM] SAM cropping returned NULL, falling back to basic preprocessing')
        const result = await preprocessReceipt(file, {
          enhanceContrast: this.options.enhanceContrast,
        })
        processedImageUrl = result.dataUrl
        console.log('[SAM] Fallback preprocessing complete')
      }
    } else {
      // Use basic preprocessing without SAM
      const result = await preprocessReceipt(file, {
        enhanceContrast: this.options.enhanceContrast,
      })
      processedImageUrl = result.dataUrl
    }

    receipt.processedImageUrl = processedImageUrl
    receipt.progress = 60
    receipt.progressStatus = 'Running OCR...'
    this.onProgressCallbacks.forEach(cb => cb(receipt))

    // Step 2: Run enhanced OCR (Gemini or Tesseract based on mode)
    const ocrResult = await performEnhancedOCR(
      processedImageUrl,
      this.options.ocrMode,
      (progress, status) => {
        receipt.progress = 60 + Math.round(progress * 0.35)
        receipt.progressStatus = status
        this.onProgressCallbacks.forEach(cb => cb(receipt))
      }
    )

    receipt.progress = 95
    receipt.progressStatus = 'Processing results...'
    this.onProgressCallbacks.forEach(cb => cb(receipt))

    receipt.extractedData = {
      vendor: ocrResult.vendor || 'Unknown',
      date: ocrResult.date || new Date().toISOString().split('T')[0],
      time: ocrResult.time,
      amount: ocrResult.total || null,
      subtotal: ocrResult.subtotal,
      tax: ocrResult.tax,
      paymentMethod: ocrResult.paymentMethod,
      cardLastFour: ocrResult.cardLastFour,
      storeId: ocrResult.storeId,
      transactionId: ocrResult.transactionId,
      lineItems: ocrResult.lineItems?.map(item => ({
        description: item.description,
        amount: item.price || 0,
      })),
      rawText: ocrResult.rawText,
      imageData: processedImageUrl,
      // Return receipt tracking
      isReturn: ocrResult.isReturn,
      originalReceiptNumber: ocrResult.originalReceiptNumber,
      // Document classification from Gemini
      documentType: ocrResult.documentType,
      documentTypeConfidence: ocrResult.documentTypeConfidence,
      documentTypeReasoning: ocrResult.documentTypeReasoning,
      // Document identifiers for linking
      transactionNumber: ocrResult.transactionNumber,
      orderNumber: ocrResult.orderNumber,
      invoiceNumber: ocrResult.invoiceNumber,
      accountNumber: ocrResult.accountNumber,
      // Filename already set in addFiles
      sourceFilename: receipt.extractedData.sourceFilename,
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

    // Extract total amount (support negative amounts for returns)
    let amount: number | null = null
    const amountPatterns = [
      /\btotal[:\s]*\$?\s*(-?[\d,]+\.?\d*)/i,
      /amount[:\s]*\$?\s*(-?[\d,]+\.?\d*)/i,
      /grand total[:\s]*\$?\s*(-?[\d,]+\.?\d*)/i,
      /refund[:\s]*\$?\s*(-?[\d,]+\.?\d*)/i,
      /return[:\s]*\$?\s*(-?[\d,]+\.?\d*)/i,
    ]

    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match) {
        const parsed = parseFloat(match[1].replace(',', ''))
        // Allow negative amounts for returns, but still validate reasonable range
        if (!isNaN(parsed) && parsed !== 0 && Math.abs(parsed) < 100000) {
          amount = parsed
          break
        }
      }
    }

    if (amount === null) {
      const allAmounts = text.match(/\$?-?\d+\.\d{2}/g) || []
      const numbers = allAmounts
        .map((a) => parseFloat(a.replace('$', '')))
        .filter((n) => !isNaN(n) && n !== 0)
      if (numbers.length > 0) {
        // For returns, we want the negative amount, so use the most extreme value
        const absMax = numbers.reduce((max, n) => Math.abs(n) > Math.abs(max) ? n : max, numbers[0])
        amount = absMax
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

    for (let i = 0; i < datePatterns.length; i++) {
      const pattern = datePatterns[i]
      const match = text.match(pattern)
      if (match) {
        try {
          let year: string, month: string, day: string
          
          // Pattern 0: MM/DD/YYYY or MM-DD-YYYY
          if (i === 0) {
            month = match[1]
            day = match[2]
            year = match[3]
          }
          // Pattern 1: YYYY/MM/DD or YYYY-MM-DD
          else if (i === 1) {
            year = match[1]
            month = match[2]
            day = match[3]
          }
          // Pattern 2: Month name format (e.g., "Jan 25, 2024")
          else if (i === 2) {
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
            const monthIndex = monthNames.indexOf(match[1].toLowerCase().substring(0, 3))
            month = String(monthIndex + 1)
            day = match[2]
            year = match[3]
          } else {
            continue
          }
          
          // Convert 2-digit year to 4-digit
          if (year.length === 2) {
            const yearNum = parseInt(year)
            year = yearNum > 50 ? `19${year}` : `20${year}`
          }
          
          // Format as YYYY-MM-DD (pad with zeros)
          date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          break
        } catch (error) {
          console.warn('Error parsing date:', error)
          continue
        }
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
