/**
 * Enhanced Tesseract.js configuration for receipt OCR
 */

export const TESSERACT_CONFIGS = {
  // Default: Uniform block of text (best for most receipts)
  default: {
    lang: 'eng',
    oem: 1, // LSTM neural net mode
    psm: 6, // Uniform block of text
  },
  
  // For vendor names and header text
  header: {
    lang: 'eng',
    oem: 1,
    psm: 13, // Raw line - good for single lines like vendor names
  },
  
  // For sparse text or poorly structured receipts
  sparse: {
    lang: 'eng',
    oem: 1,
    psm: 11, // Sparse text
  },
  
  // Fully automatic - let Tesseract decide
  auto: {
    lang: 'eng',
    oem: 1,
    psm: 3, // Fully automatic page segmentation
  },
}

// Common OCR character corrections
export const OCR_CHAR_CORRECTIONS: Record<string, string> = {
  // Numbers often misread as letters
  '0': 'O',
  '1': 'I',
  '5': 'S',
  '8': 'B',
  
  // Letters often misread as numbers
  'O': '0',
  'I': '1',
  'l': '1',
  'S': '5',
  'B': '8',
}

// Common word corrections for receipts
export const COMMON_RECEIPT_CORRECTIONS: Record<string, string> = {
  'TQTAL': 'TOTAL',
  'T0TAL': 'TOTAL',
  'TOTA1': 'TOTAL',
  'SUBTQTAL': 'SUBTOTAL',
  'SUBT0TAL': 'SUBTOTAL',
  'TAX': 'TAX',
  'T4X': 'TAX',
  'CHANGF': 'CHANGE',
  'CHANG3': 'CHANGE',
  'CASH': 'CASH',
  'CA5H': 'CASH',
  'CREDIT': 'CREDIT',
  'CARD': 'CARD',
  'VISA': 'VISA',
  'V1SA': 'VISA',
  'MASTERCARD': 'MASTERCARD',
  'DISCOVER': 'DISCOVER',
  'AMEX': 'AMEX',
}
