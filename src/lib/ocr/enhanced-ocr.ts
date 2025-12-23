/**
 * Enhanced OCR orchestrator combining Tesseract and Gemini Vision
 */

import { createWorker, Worker } from 'tesseract.js'
import { TESSERACT_CONFIGS } from './tesseract-config'
import { extractVendorName, findBestVendorMatch } from './vendor-database'
import { 
  normalizeDate, 
  normalizeTime, 
  extractTransactionId, 
  extractStoreId,
  extractMonetaryValue 
} from './text-correction'
import { extractReceiptWithGemini, getGeminiApiKey, GeminiReceiptData } from './gemini-vision'

export interface EnhancedOCRResult {
  vendor?: string
  date?: string
  time?: string
  total?: number
  subtotal?: number
  tax?: number
  paymentMethod?: string
  storeId?: string
  transactionId?: string
  lineItems?: Array<{
    description: string
    quantity?: number
    price?: number
  }>
  confidence: number
  method: 'tesseract' | 'gemini' | 'hybrid'
  rawText: string
}

export type OCRMode = 'fast' | 'accurate' | 'auto'

/**
 * Run Tesseract OCR with enhanced configuration
 */
async function runEnhancedTesseract(
  imageDataUrl: string,
  onProgress?: (progress: number, status: string) => void
): Promise<EnhancedOCRResult> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress * 100, 'OCR: ' + Math.round(m.progress * 100) + '%')
      }
    },
  })

  try {
    // Run multiple passes with different PSM modes
    const results = []
    
    // Pass 1: Default uniform block
    await worker.setParameters(TESSERACT_CONFIGS.default)
    const result1 = await worker.recognize(imageDataUrl)
    results.push(result1)
    
    // Pass 2: Header/vendor name detection
    await worker.setParameters(TESSERACT_CONFIGS.header)
    const result2 = await worker.recognize(imageDataUrl)
    results.push(result2)
    
    // Use the result with highest confidence
    const bestResult = results.reduce((best, current) => 
      current.data.confidence > best.data.confidence ? current : best
    )
    
    const rawText = bestResult.data.text
    
    // Extract structured data
    const vendor = extractVendorName(rawText)
    const date = extractDateFromText(rawText)
    const time = extractTimeFromText(rawText)
    const total = extractTotalFromText(rawText)
    const subtotal = extractSubtotalFromText(rawText)
    const tax = extractTaxFromText(rawText)
    const paymentMethod = extractPaymentMethod(rawText)
    const storeId = extractStoreId(rawText)
    const transactionId = extractTransactionId(rawText)
    
    return {
      vendor: vendor || undefined,
      date: date || undefined,
      time: time || undefined,
      total: total || undefined,
      subtotal: subtotal || undefined,
      tax: tax || undefined,
      paymentMethod: paymentMethod || undefined,
      storeId: storeId || undefined,
      transactionId: transactionId || undefined,
      confidence: bestResult.data.confidence / 100,
      method: 'tesseract',
      rawText,
    }
  } finally {
    await worker.terminate()
  }
}

/**
 * Main enhanced OCR function
 */
export async function performEnhancedOCR(
  imageDataUrl: string,
  mode: OCRMode = 'auto',
  onProgress?: (progress: number, status: string) => void
): Promise<EnhancedOCRResult> {
  const geminiApiKey = getGeminiApiKey()
  
  // Fast mode: Tesseract only
  if (mode === 'fast') {
    onProgress?.(0, 'Running Tesseract OCR...')
    return await runEnhancedTesseract(imageDataUrl, onProgress)
  }
  
  // Accurate mode: Gemini only (if available)
  if (mode === 'accurate' && geminiApiKey) {
    onProgress?.(0, 'Running Gemini Vision AI...')
    try {
      const geminiResult = await extractReceiptWithGemini(imageDataUrl, geminiApiKey)
      onProgress?.(100, 'OCR complete!')
      return {
        ...geminiResult,
        method: 'gemini',
      }
    } catch (error) {
      console.warn('Gemini failed, falling back to Tesseract:', error)
      onProgress?.(0, 'Gemini failed, using Tesseract...')
      return await runEnhancedTesseract(imageDataUrl, onProgress)
    }
  }
  
  // Auto mode: Try Tesseract first, use Gemini if confidence is low
  onProgress?.(0, 'Running Tesseract OCR...')
  const tesseractResult = await runEnhancedTesseract(imageDataUrl, onProgress)
  
  // If Tesseract confidence is high or Gemini not available, use Tesseract
  if (tesseractResult.confidence > 0.7 || !geminiApiKey) {
    return tesseractResult
  }
  
  // Low confidence, try Gemini
  onProgress?.(50, 'Low confidence, trying Gemini Vision AI...')
  try {
    const geminiResult = await extractReceiptWithGemini(imageDataUrl, geminiApiKey)
    onProgress?.(100, 'OCR complete!')
    return {
      ...geminiResult,
      method: 'hybrid',
    }
  } catch (error) {
    console.warn('Gemini failed, using Tesseract result:', error)
    return tesseractResult
  }
}

// Helper functions for extracting data from text

function extractDateFromText(text: string): string | null {
  const lines = text.split('\n')
  for (const line of lines) {
    const date = normalizeDate(line)
    if (date) return date
  }
  return null
}

function extractTimeFromText(text: string): string | null {
  const lines = text.split('\n')
  for (const line of lines) {
    const time = normalizeTime(line)
    if (time) return time
  }
  return null
}

function extractTotalFromText(text: string): number | null {
  const patterns = [
    /TOTAL[\s:]*\$?\s*(\d+\.?\d{0,2})/i,
    /AMOUNT[\s:]*\$?\s*(\d+\.?\d{0,2})/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
  }
  return null
}

function extractSubtotalFromText(text: string): number | null {
  const patterns = [
    /SUB[\s-]?TOTAL[\s:]*\$?\s*(\d+\.?\d{0,2})/i,
    /SUBTOTAL[\s:]*\$?\s*(\d+\.?\d{0,2})/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
  }
  return null
}

function extractTaxFromText(text: string): number | null {
  const patterns = [
    /TAX[\s:]*\$?\s*(\d+\.?\d{0,2})/i,
    /SALES\s+TAX[\s:]*\$?\s*(\d+\.?\d{0,2})/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return parseFloat(match[1])
    }
  }
  return null
}

function extractPaymentMethod(text: string): string | null {
  const methods = ['CASH', 'CREDIT', 'DEBIT', 'CARD', 'VISA', 'MASTERCARD', 'AMEX', 'DISCOVER']
  
  for (const method of methods) {
    if (text.toUpperCase().includes(method)) {
      return method
    }
  }
  
  return null
}
