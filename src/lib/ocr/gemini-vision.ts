/**
 * Google Gemini 3 Flash Vision API integration for receipt OCR
 */

export interface GeminiReceiptData {
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
    // Remove data URL prefix if present
    const base64Data = imageDataUrl.includes('base64,')
      ? imageDataUrl.split('base64,')[1]
      : imageDataUrl

    const prompt = `You are a receipt OCR expert. Analyze this receipt image and extract the following information in JSON format:

{
  "vendor": "store/vendor name",
  "date": "YYYY-MM-DD format",
  "time": "HH:MM format (24-hour)",
  "subtotal": numeric value only,
  "tax": numeric value only,
  "total": numeric value only,
  "paymentMethod": "CASH, CREDIT, DEBIT, etc.",
  "storeId": "store number or location ID",
  "transactionId": "transaction or receipt number",
  "lineItems": [
    {
      "description": "item name",
      "quantity": numeric quantity,
      "price": numeric price
    }
  ]
}

Important rules:
1. All numeric values should be numbers, not strings (no $ symbols)
2. If a field is not clearly visible, omit it from the JSON
3. Be precise with vendor names - use the exact business name shown
4. For dates, convert any format to YYYY-MM-DD
5. For times, convert to 24-hour HH:MM format
6. Return ONLY the JSON object, no additional text or markdown formatting`

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
  if (typeof window === 'undefined') return false
  
  // Check localStorage or environment variable
  const apiKey = localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  return !!apiKey && apiKey.length > 0
}

/**
 * Get Gemini API key from storage or environment
 */
export function getGeminiApiKey(): string | null {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
  
  return localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
}

/**
 * Set Gemini API key in localStorage
 */
export function setGeminiApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('gemini_api_key', apiKey)
}
