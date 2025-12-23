/**
 * Vendor name database and fuzzy matching for receipt OCR
 */

// Common retail vendors
export const KNOWN_VENDORS = [
  // Grocery
  'Walmart', 'Target', 'Kroger', 'Safeway', 'Albertsons', 'Publix',
  'Whole Foods', 'Trader Joe\'s', 'Costco', 'Sam\'s Club', 'Aldi',
  'Food Lion', 'Giant', 'Stop & Shop', 'ShopRite', 'Wegmans',
  
  // Pharmacy
  'CVS', 'Walgreens', 'Rite Aid', 'Duane Reade',
  
  // Convenience
  '7-Eleven', 'Circle K', 'Wawa', 'QuikTrip', 'Sheetz',
  
  // Gas Stations
  'Shell', 'Exxon', 'Chevron', 'BP', 'Mobil', 'Sunoco', 'Arco',
  
  // Fast Food
  'McDonald\'s', 'Burger King', 'Wendy\'s', 'Taco Bell', 'KFC',
  'Subway', 'Chick-fil-A', 'Popeyes', 'Arby\'s', 'Jack in the Box',
  'Sonic', 'Dairy Queen', 'In-N-Out', 'Five Guys', 'Chipotle',
  'Panera Bread', 'Starbucks', 'Dunkin\'', 'Tim Hortons',
  
  // Restaurants
  'Applebee\'s', 'Chili\'s', 'Olive Garden', 'Red Lobster',
  'Outback Steakhouse', 'Texas Roadhouse', 'TGI Friday\'s',
  
  // Home Improvement
  'Home Depot', 'Lowe\'s', 'Menards', 'Ace Hardware',
  
  // Department Stores
  'Macy\'s', 'Kohl\'s', 'JCPenney', 'Nordstrom', 'Dillard\'s',
  
  // Discount/Dollar
  'Dollar General', 'Dollar Tree', 'Family Dollar',
  
  // Electronics
  'Best Buy', 'Apple', 'Microsoft Store', 'GameStop',
  
  // Office Supplies
  'Staples', 'Office Depot', 'OfficeMax',
  
  // Pet Supplies
  'PetSmart', 'Petco',
  
  // Sporting Goods
  'Dick\'s Sporting Goods', 'Academy Sports', 'REI',
  
  // Auto Parts
  'AutoZone', 'O\'Reilly Auto Parts', 'Advance Auto Parts', 'NAPA',
]

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching vendor names
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Find the best matching vendor name from the known vendors list
 */
export function findBestVendorMatch(
  ocrText: string,
  threshold: number = 0.7
): string | null {
  if (!ocrText || ocrText.trim().length < 2) {
    return null
  }

  const normalizedInput = ocrText.trim().toLowerCase()
  let bestMatch: string | null = null
  let bestScore = 0

  for (const vendor of KNOWN_VENDORS) {
    const normalizedVendor = vendor.toLowerCase()
    
    // Exact match
    if (normalizedInput === normalizedVendor) {
      return vendor
    }
    
    // Contains match
    if (normalizedInput.includes(normalizedVendor) || 
        normalizedVendor.includes(normalizedInput)) {
      const containsScore = Math.min(normalizedInput.length, normalizedVendor.length) / 
                           Math.max(normalizedInput.length, normalizedVendor.length)
      if (containsScore > bestScore) {
        bestScore = containsScore
        bestMatch = vendor
      }
      continue
    }
    
    // Levenshtein distance
    const distance = levenshteinDistance(normalizedInput, normalizedVendor)
    const maxLen = Math.max(normalizedInput.length, normalizedVendor.length)
    const similarity = 1 - (distance / maxLen)
    
    if (similarity > bestScore) {
      bestScore = similarity
      bestMatch = vendor
    }
  }

  // Only return match if it meets the threshold
  return bestScore >= threshold ? bestMatch : null
}

/**
 * Extract and correct vendor name from the top portion of OCR text
 */
export function extractVendorName(ocrText: string): string | null {
  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // Check first 5 lines for vendor name
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i]
    
    // Skip lines that look like addresses or dates
    if (/^\d+\s+/.test(line)) continue // Starts with number (likely address)
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) continue // Contains date
    
    // Try to match this line to a known vendor
    const match = findBestVendorMatch(line, 0.6)
    if (match) {
      return match
    }
  }
  
  return null
}
