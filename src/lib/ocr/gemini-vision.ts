/**
 * Google Gemini 3 Flash Vision API integration for receipt OCR
 */

import { loadCorrectionsFromFileSystem } from '../file-system-adapter'
import type { CategorizationCorrection } from '@/types'

/**
 * Format corrections into context string for Gemini Vision OCR
 */
function formatCorrectionsForOCR(corrections: CategorizationCorrection[]): string {
  if (corrections.length === 0) return ''
  
  // Extract vendor name corrections and amount corrections
  const vendorCorrections = corrections
    .filter(c => c.changes.description)
    .map(c => `- "${c.changes.description!.from}" should be recognized as "${c.changes.description!.to}"`)
  
  const amountCorrections = corrections
    .filter(c => c.changes.amount)
    .map(c => `- Vendor "${c.vendor}" amount was incorrectly parsed as $${c.changes.amount!.from}, correct amount is $${c.changes.amount!.to}`)
  
  if (vendorCorrections.length === 0 && amountCorrections.length === 0) return ''
  
  let context = '\n\n**LEARN FROM PAST PARSING ERRORS:**\n'
  
  if (vendorCorrections.length > 0) {
    context += '\nVendor Name Corrections:\n' + vendorCorrections.slice(-10).join('\n')
  }
  
  if (amountCorrections.length > 0) {
    context += '\n\nAmount Parsing Corrections:\n' + amountCorrections.slice(-10).join('\n')
  }
  
  return context
}

export interface GeminiReceiptData {
  vendor?: string
  date?: string
  time?: string
  total?: number
  subtotal?: number
  tax?: number
  tip?: number
  taxRate?: number // Calculated tax percentage
  tipPercentage?: number // Calculated tip percentage based on subtotal
  paymentMethod?: string
  cardLastFour?: string
  storeId?: string
  transactionId?: string
  lineItems?: Array<{
    description: string
    quantity?: number
    price?: number
  }>
  // Return receipt tracking
  isReturn?: boolean
  originalReceiptNumber?: string
  // Document classification
  documentType?: 'payment_receipt' | 'bank_deposit_receipt' | 'bank_statement' | 'manifest' | 'invoice' | 'unknown'
  documentTypeConfidence?: number
  documentTypeReasoning?: string
  // Document identifiers for linking
  transactionNumber?: string
  orderNumber?: string
  invoiceNumber?: string
  accountNumber?: string
  // Multi-page and currency detection
  isMultiPage?: boolean
  pageNumber?: number
  totalPages?: number
  currency?: string // ISO code (USD, EUR, GBP, etc.)
  currencySymbol?: string // $ € £ etc.
  confidence: number
  rawText?: string
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

/**
 * Extract receipt data using Gemini 3 Flash Vision API
 */
export async function extractReceiptWithGemini(
  imageDataUrl: string,
  apiKey: string
): Promise<GeminiReceiptData> {
  try {
    // Load user corrections for self-improving OCR
    const corrections = await loadCorrectionsFromFileSystem()
    const correctionsContext = formatCorrectionsForOCR(corrections)
    
    console.log(`[GEMINI OCR] Using ${corrections.length} correction patterns for improved parsing accuracy`)

    // Remove data URL prefix if present
    const base64Data = imageDataUrl.includes('base64,')
      ? imageDataUrl.split('base64,')[1]
      : imageDataUrl

    const prompt = `You are a receipt OCR expert. Analyze this document image and extract the following information in JSON format:

{
  "vendor": "store/vendor name",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM format (24-hour)",
  "subtotal": numeric value (can be negative for returns),
  "tax": numeric value (can be negative for returns),
  "tip": numeric value (commonly on restaurant receipts),
  "taxRate": percentage as decimal (e.g., 0.0825 for 8.25%),
  "tipPercentage": percentage as decimal (e.g., 0.20 for 20%),
  "total": numeric value (can be negative for returns),
  "isReturn": true if this is a return/refund receipt,
  "originalReceiptNumber": "original receipt number if this is a return",
  "paymentMethod": "CASH, CREDIT, DEBIT, VISA, MASTERCARD, etc.",
  "cardLastFour": "last 4 digits of card if visible (e.g., '1234')",
  "storeId": "store number or location ID",
  "transactionId": "transaction or receipt number",
  "lineItems": [
    {
      "description": "item name",
      "quantity": numeric quantity,
      "price": numeric price (negative for returns)
    }
  ],
  "documentType": "payment_receipt | bank_deposit_receipt | bank_statement | manifest | invoice | unknown",
  "documentTypeConfidence": 0.0 to 1.0,
  "documentTypeReasoning": "brief explanation of classification",
  "transactionNumber": "transaction/reference number if present",
  "orderNumber": "order/PO number if present",
  "invoiceNumber": "invoice number if present",
  "accountNumber": "account number if present (common on payment receipts)",
  "isMultiPage": true if receipt indicates "Page 1 of 2" or similar,
  "pageNumber": current page number if multi-page,
  "totalPages": total pages if multi-page,
  "currency": "ISO currency code (USD, EUR, GBP, CAD, MXN, etc.)",
  "currencySymbol": "currency symbol shown ($ € £ etc.)"
}
${correctionsContext}

**DOCUMENT CLASSIFICATION RULES:**
Classify the document type based on these criteria:

1. **payment_receipt**: Shows payment confirmation ("Payment Received", "Account Payment") with or without itemization. Standard purchase receipts should use this type.
2. **bank_deposit_receipt**: Bank deposit slip or deposit receipt showing funds deposited.
3. **bank_statement**: Bank account statement showing transactions over a period.
4. **manifest**: Bill of lading, packing list, or delivery manifest. Shows items but NO prices or totals.
5. **invoice**: Unpaid bill requesting payment. Usually says "Invoice" and has a due date.
5. **unknown**: Cannot confidently classify into above categories.

**IDENTIFIER EXTRACTION:**
Extract ALL visible identifiers (transaction numbers, order numbers, invoice numbers, account numbers). These are critical for linking related documents.

**TIP AND TAX BREAKDOWN:**
1. If a tip line is present (common on restaurant receipts), extract it as a separate field
2. Calculate tipPercentage = tip / subtotal (as decimal, e.g., 0.20 for 20%)
3. Calculate taxRate = tax / subtotal (as decimal, e.g., 0.0825 for 8.25%)
4. Verify: subtotal + tax + tip = total (within rounding tolerance)
5. If no tip line, omit the tip field entirely

**MULTI-PAGE DETECTION:**
1. Look for phrases like "Page 1 of 2", "Continued on next page", "1/2", etc.
2. Set isMultiPage=true if detected
3. Extract pageNumber and totalPages if visible
4. Multi-page receipts typically show totals only on the last page

**CURRENCY DETECTION:**
1. Default to USD ($) unless another currency is clearly indicated
2. Look for currency codes (EUR, GBP, CAD, MXN) or non-$ symbols (€, £)
3. Extract both the ISO code and the symbol if visible
4. Foreign receipts often show currency code near the total

Important rules:
1. All numeric values should be numbers, not strings (no $ symbols)
2. **RETURNS/REFUNDS**: If the receipt shows "RETURN", "REFUND", or negative amounts, set isReturn to true and use NEGATIVE numbers for amounts. Look for phrases like "Amount Refunded", "Return Total", or amounts in parentheses.
3. **ORIGINAL RECEIPT LINKING**: If this is a return, look for the original receipt number (often labeled "Original Receipt #", "Ref Receipt", etc.) and extract it as originalReceiptNumber.
4. If a field is not clearly visible, omit it from the JSON
5. Be precise with vendor names - use the exact business name shown
6. For dates, convert any format to YYYY-MM-DD
7. For times, convert to 24-hour HH:MM format
8. **CARD NUMBERS**: If payment method shows a card, extract the last 4 digits (often shown as **** 1234). This is critical for learning payment types.
9. **APPLY THE CORRECTIONS ABOVE** - if similar vendor names or amounts appear in the error history, learn from those mistakes
10. Document classification is CRITICAL - analyze carefully
11. Extract ALL identifier numbers even if you're not sure which type they are
12. **NEGATIVE AMOUNTS**: Returns must use negative numbers (e.g., -15.99, not 15.99). If amounts are shown in parentheses like ($15.99), convert to -15.99.
13. Return ONLY the JSON object, no additional text or markdown formatting`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                  media_resolution: {
                    level: 'media_resolution_high'
                  }
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            thinking_config: {
              thinking_level: 'low'
            }
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data: GeminiResponse = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API')
    }

    const responseText = data.candidates[0].content.parts[0].text
    
    // Extract JSON from response (in case there's markdown formatting)
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }
    
    const extractedData = JSON.parse(jsonText)
    
    return {
      ...extractedData,
      confidence: 0.95, // Gemini typically has high confidence
      rawText: responseText,
    }
  } catch (error) {
    console.error('Gemini Vision API error:', error)
    throw error
  }
}

/**
 * Check if Gemini API key is configured
 */
export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey()
  return key !== null && key.trim() !== ''
}

// Re-export from persistent-storage for convenience
export { getGeminiApiKey as getGeminiApiKeyPersistent, setGeminiApiKey as setGeminiApiKeyPersistent, isGeminiConfigured as isGeminiConfiguredPersistent } from '@/lib/persistent-storage'

/**
 * Get Gemini API key - synchronous wrapper for backward compatibility
 * For new code, import from @/lib/persistent-storage instead
 */
export function getGeminiApiKey(): string | null {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
  // Try localStorage for immediate access (backward compatibility)
  return localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
}

/**
 * Set Gemini API key - synchronous wrapper for backward compatibility
 * For new code, import from @/lib/persistent-storage instead
 */
export function setGeminiApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('gemini_api_key', apiKey)
}
