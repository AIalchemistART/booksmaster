/**
 * Post-OCR text correction utilities
 */

import { OCR_CHAR_CORRECTIONS, COMMON_RECEIPT_CORRECTIONS } from './tesseract-config'

/**
 * Apply common OCR character corrections to text
 */
export function correctOCRText(text: string, context: 'numeric' | 'alpha' | 'mixed' = 'mixed'): string {
  let corrected = text

  if (context === 'alpha') {
    // In alphabetic context, correct numbers to letters
    corrected = corrected.replace(/0/g, 'O')
    corrected = corrected.replace(/1/g, 'I')
    corrected = corrected.replace(/5/g, 'S')
    corrected = corrected.replace(/8/g, 'B')
  } else if (context === 'numeric') {
    // In numeric context, correct letters to numbers
    corrected = corrected.replace(/O/g, '0')
    corrected = corrected.replace(/I/g, '1')
    corrected = corrected.replace(/l/g, '1')
    corrected = corrected.replace(/S/g, '5')
    corrected = corrected.replace(/B/g, '8')
  }

  return corrected
}

/**
 * Correct common receipt-specific words
 */
export function correctReceiptWords(text: string): string {
  let corrected = text.toUpperCase()

  for (const [wrong, right] of Object.entries(COMMON_RECEIPT_CORRECTIONS)) {
    const regex = new RegExp(wrong, 'gi')
    corrected = corrected.replace(regex, right)
  }

  return corrected
}

/**
 * Extract and clean monetary values from text
 */
export function extractMonetaryValue(text: string): number | null {
  // Remove common OCR errors in monetary values
  let cleaned = text.replace(/[Oo]/g, '0')
                   .replace(/[Il]/g, '1')
                   .replace(/[Ss]/g, '5')
  
  // Extract number with optional decimal
  const match = cleaned.match(/[\$]?\s*(\d+\.?\d{0,2})/)
  
  if (match && match[1]) {
    return parseFloat(match[1])
  }
  
  return null
}

/**
 * Clean and normalize date strings
 */
export function normalizeDate(dateText: string): string | null {
  // Remove common OCR errors
  const cleaned = dateText.replace(/[Oo]/g, '0')
                         .replace(/[Il]/g, '1')
  
  // Try various date formats
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // MM/DD/YYYY or MM-DD-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY/MM/DD or YYYY-MM-DD
    /(\d{2})(\d{2})(\d{2,4})/,                // MMDDYYYY
  ]
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      let year, month, day
      
      if (pattern === patterns[1]) {
        // YYYY-MM-DD format
        [, year, month, day] = match
      } else {
        // MM-DD-YYYY format
        [, month, day, year] = match
      }
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const yearNum = parseInt(year)
        year = yearNum > 50 ? `19${year}` : `20${year}`
      }
      
      // Ensure month and day are 2 digits
      month = month.padStart(2, '0')
      day = day.padStart(2, '0')
      
      return `${year}-${month}-${day}`
    }
  }
  
  return null
}

/**
 * Clean and normalize time strings
 */
export function normalizeTime(timeText: string): string | null {
  // Remove common OCR errors
  const cleaned = timeText.replace(/[Oo]/g, '0')
                         .replace(/[Il]/g, '1')
  
  // Try various time formats
  const patterns = [
    /(\d{1,2}):(\d{2})\s*(AM|PM)?/i,
    /(\d{1,2})(\d{2})\s*(AM|PM)?/i,
  ]
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match) {
      let [, hours, minutes, period] = match
      
      let hour = parseInt(hours)
      const minute = minutes.padStart(2, '0')
      
      // Convert to 24-hour format if AM/PM is present
      if (period) {
        const isPM = period.toUpperCase() === 'PM'
        if (isPM && hour < 12) hour += 12
        if (!isPM && hour === 12) hour = 0
      }
      
      return `${hour.toString().padStart(2, '0')}:${minute}`
    }
  }
  
  return null
}

/**
 * Extract transaction/receipt ID
 */
export function extractTransactionId(text: string): string | null {
  const patterns = [
    /(?:TRANS(?:ACTION)?|RECEIPT|ORDER|CONF(?:IRMATION)?)\s*(?:#|NO|NUM(?:BER)?)?[\s:]*([A-Z0-9\-]+)/i,
    /(?:#|NO|NUM)[\s:]*([A-Z0-9\-]{6,})/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}

/**
 * Extract store ID or location number
 */
export function extractStoreId(text: string): string | null {
  const patterns = [
    /STORE\s*(?:#|NO|NUM(?:BER)?)?[\s:]*([A-Z0-9\-]+)/i,
    /LOCATION\s*(?:#|NO|NUM(?:BER)?)?[\s:]*([A-Z0-9\-]+)/i,
    /(?:SHOP|BRANCH)\s*(?:#|NO|NUM(?:BER)?)?[\s:]*([A-Z0-9\-]+)/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}
