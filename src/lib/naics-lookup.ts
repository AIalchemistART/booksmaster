import { getGeminiApiKey } from './ocr/gemini-vision'

export interface NAICSResult {
  code: string
  title: string
  description: string
  sector: string
  examples: string[]
  confidence: number
}

/**
 * Use Gemini AI to find the appropriate NAICS code for a business description
 * Supports any type of self-employed business or independent contractor work
 */
export async function lookupNAICS(businessDescription: string): Promise<NAICSResult> {
  const apiKey = getGeminiApiKey()
  
  if (!apiKey) {
    throw new Error('Gemini API key required for NAICS lookup')
  }

  try {
    const prompt = `You are a NAICS (North American Industry Classification System) code expert for Schedule C tax filing.

The user described their business as: "${businessDescription}"

Find the most appropriate 6-digit NAICS code for this business. This is critical for IRS Schedule C Line B.

IMPORTANT RULES:
- Use the most SPECIFIC 6-digit code available
- For contractors/construction, use 236xxx codes (not general 238xxx)
- For rideshare/delivery, use 485310 (Taxi & Limousine Service) or 492110 (Couriers)
- For freelance services, match to specific professional category
- For multiple income streams, choose the PRIMARY business activity
- The code must be valid for self-employed/sole proprietor businesses

Respond ONLY with valid JSON in this exact format:
{
  "code": "123456",
  "title": "Official NAICS Industry Title",
  "description": "Clear description of what this business does",
  "sector": "Sector name (e.g., Construction, Professional Services, Transportation)",
  "examples": ["Example 1 of work in this category", "Example 2", "Example 3"],
  "confidence": 0.0 to 1.0
}

Common NAICS codes for reference (choose most specific):
- 236118: Residential Remodelers
- 236220: Commercial and Institutional Building Construction
- 238210: Electrical Contractors
- 238220: Plumbing, Heating, and Air-Conditioning Contractors
- 238310: Drywall and Insulation Contractors
- 238320: Painting and Wall Covering Contractors
- 238910: Site Preparation Contractors
- 541330: Engineering Services
- 541511: Custom Computer Programming Services
- 541611: Administrative Management and General Management Consulting Services
- 541810: Advertising Agencies
- 541921: Photography Studios, Portrait
- 541990: All Other Professional, Scientific, and Technical Services
- 485310: Taxi and Limousine Service (rideshare/Uber/Lyft)
- 492110: Couriers and Express Delivery Services (food delivery, package delivery)
- 812990: All Other Personal Services
- 711510: Independent Artists, Writers, and Performers
- 453998: All Other Miscellaneous Store Retailers (ecommerce, online sales)
- 531210: Offices of Real Estate Agents and Brokers

If description is vague or matches multiple codes, choose the most common for self-employed individuals.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`NAICS lookup failed: ${response.statusText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      throw new Error('No response from NAICS lookup')
    }

    const result = JSON.parse(text)
    
    // Validate result
    if (!result.code || !result.title || result.code.length !== 6) {
      throw new Error('Invalid NAICS code format')
    }

    return {
      code: result.code,
      title: result.title,
      description: result.description || result.title,
      sector: result.sector || 'Other Services',
      examples: result.examples || [],
      confidence: result.confidence || 0.8
    }

  } catch (error) {
    console.error('NAICS lookup error:', error)
    console.error('Business description that failed:', businessDescription)
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Re-throw the error so the UI can show a proper message
    // instead of silently falling back to a bad default
    throw new Error(`NAICS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key and try again.`)
  }
}

/**
 * Get a list of common NAICS codes for quick selection
 * Useful for dropdown suggestions before AI lookup
 */
export function getCommonNAICSCodes(): Array<{ code: string; title: string; sector: string }> {
  return [
    // Construction
    { code: '236118', title: 'Residential Remodelers', sector: 'Construction' },
    { code: '236220', title: 'Commercial Building Construction', sector: 'Construction' },
    { code: '238210', title: 'Electrical Contractors', sector: 'Construction' },
    { code: '238220', title: 'Plumbing/HVAC Contractors', sector: 'Construction' },
    { code: '238310', title: 'Drywall and Insulation', sector: 'Construction' },
    { code: '238320', title: 'Painting Contractors', sector: 'Construction' },
    { code: '238910', title: 'Site Preparation', sector: 'Construction' },
    { code: '561730', title: 'Landscaping Services', sector: 'Construction' },
    
    // Transportation
    { code: '485310', title: 'Rideshare (Uber/Lyft)', sector: 'Transportation' },
    { code: '492110', title: 'Delivery Services (DoorDash/Instacart)', sector: 'Transportation' },
    { code: '484110', title: 'General Freight Trucking', sector: 'Transportation' },
    
    // Professional Services
    { code: '541330', title: 'Engineering Services', sector: 'Professional Services' },
    { code: '541511', title: 'Software Development', sector: 'Professional Services' },
    { code: '541611', title: 'Business Consulting', sector: 'Professional Services' },
    { code: '541810', title: 'Advertising Services', sector: 'Professional Services' },
    { code: '541921', title: 'Photography Services', sector: 'Professional Services' },
    { code: '541990', title: 'Other Professional Services', sector: 'Professional Services' },
    
    // Personal Services
    { code: '812990', title: 'Personal Services', sector: 'Personal Services' },
    { code: '812111', title: 'Barber Shops', sector: 'Personal Services' },
    { code: '812112', title: 'Beauty Salons', sector: 'Personal Services' },
    { code: '812910', title: 'Pet Care Services', sector: 'Personal Services' },
    
    // Creative
    { code: '711510', title: 'Independent Artists/Writers', sector: 'Arts & Entertainment' },
    { code: '512110', title: 'Video Production', sector: 'Arts & Entertainment' },
    { code: '541430', title: 'Graphic Design Services', sector: 'Arts & Entertainment' },
    
    // Retail/Sales
    { code: '453998', title: 'Online Retail/Ecommerce', sector: 'Retail' },
    { code: '454390', title: 'Direct Sales/MLM', sector: 'Retail' },
    
    // Real Estate
    { code: '531210', title: 'Real Estate Agents', sector: 'Real Estate' },
    { code: '531311', title: 'Property Management', sector: 'Real Estate' },
    
    // Health & Wellness
    { code: '621399', title: 'Personal Training', sector: 'Health & Wellness' },
    { code: '621399', title: 'Massage Therapy', sector: 'Health & Wellness' },
    
    // Education
    { code: '611691', title: 'Tutoring Services', sector: 'Education' },
    { code: '611699', title: 'Other Educational Services', sector: 'Education' },
    
    // Hospitality
    { code: '722320', title: 'Catering Services', sector: 'Hospitality' },
    { code: '722330', title: 'Food Service Contractors', sector: 'Hospitality' },
  ]
}

/**
 * Format NAICS code for display (e.g., "236118 - Residential Remodelers")
 */
export function formatNAICS(code: string, title: string): string {
  return `${code} - ${title}`
}

/**
 * Validate NAICS code format
 */
export function isValidNAICS(code: string): boolean {
  return /^\d{6}$/.test(code)
}
