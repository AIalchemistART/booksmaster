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
import { categorizeTransaction } from '../gemini-categorization'

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
 * Main enhanced OCR function with AI categorization
 */
export async function performEnhancedOCR(
  imageDataUrl: string,
  mode: OCRMode = 'auto',
  onProgress?: (progress: number, status: string) => void
): Promise<EnhancedOCRResult & { transactionType?: 'income' | 'expense', transactionCategory?: string, categorizationConfidence?: number }> {
  const geminiApiKey = getGeminiApiKey()
  
  let ocrResult: EnhancedOCRResult
  
  // Fast mode: Tesseract only
  if (mode === 'fast') {
    onProgress?.(0, 'Running Tesseract OCR...')
    ocrResult = await runEnhancedTesseract(imageDataUrl, onProgress)
  }
  // Accurate mode: Gemini only (if available)
  else if (mode === 'accurate' && geminiApiKey) {
    onProgress?.(0, 'Running Gemini Vision AI...')
    try {
      const geminiResult = await extractReceiptWithGemini(imageDataUrl, geminiApiKey)
      onProgress?.(90, 'OCR complete!')
      const { rawText, ...restGemini } = geminiResult
      ocrResult = {
        ...restGemini,
        method: 'gemini' as const,
        rawText: rawText || '',
      }
    } catch (error) {
      console.warn('Gemini failed, falling back to Tesseract:', error)
      onProgress?.(0, 'Gemini failed, using Tesseract...')
      ocrResult = await runEnhancedTesseract(imageDataUrl, onProgress)
    }
  }
  // Auto mode
  else {
    onProgress?.(0, 'Running Tesseract OCR...')
    const tesseractResult = await runEnhancedTesseract(imageDataUrl, onProgress)
    
    if (tesseractResult.confidence > 0.7 || !geminiApiKey) {
      ocrResult = tesseractResult
    } else {
      onProgress?.(50, 'Low confidence, trying Gemini Vision AI...')
      try {
        const geminiResult = await extractReceiptWithGemini(imageDataUrl, geminiApiKey)
        onProgress?.(90, 'OCR complete!')
        const { rawText, ...restGemini } = geminiResult
        ocrResult = {
          ...restGemini,
          method: 'hybrid' as const,
          rawText: rawText || '',
        }
      } catch (error) {
        console.warn('Gemini failed, using Tesseract result:', error)
        ocrResult = tesseractResult
      }
    }
  }
  
  // AI Categorization: Analyze vendor and amount to suggest type/category
  if (ocrResult.vendor && ocrResult.total) {
    try {
      // Add delay before categorization call to avoid hitting rate limits
      // OCR and categorization both use Gemini API, so space them out
      // 1.5 second delay ensures we stay well under 10 req/sec limit
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      onProgress?.(95, 'AI categorizing...')
      const categorization = await categorizeTransaction(
        ocrResult.vendor,
        ocrResult.total,
        ocrResult.vendor
      )
      
      return {
        ...ocrResult,
        transactionType: categorization.type,
        transactionCategory: categorization.category,
        categorizationConfidence: categorization.confidence
      }
    } catch (error) {
      console.warn('AI categorization failed:', error)
    }
  }
  
  onProgress?.(100, 'Complete!')
  return ocrResult
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
