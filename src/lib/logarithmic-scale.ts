/**
 * Logarithmic scale utilities for amount range slider
 * Provides more granularity at lower price points (0-1000) and less at higher amounts
 */

const MIN_VALUE = 0
const MAX_VALUE = 100000
const MIN_SLIDER = 0
const MAX_SLIDER = 1000

/**
 * Convert logarithmic slider position (0-1000) to actual amount (0-100000)
 * Uses logarithmic scale for better control at low amounts
 */
export function sliderToAmount(sliderValue: number): number {
  if (sliderValue <= MIN_SLIDER) return MIN_VALUE
  if (sliderValue >= MAX_SLIDER) return MAX_VALUE
  
  // Logarithmic mapping: slider 0-1000 -> amount 0-100000
  // Using log scale with base adjustment for smooth curve
  const normalizedSlider = sliderValue / MAX_SLIDER // 0 to 1
  
  // Logarithmic formula: amount = 10^(x * log10(max)) where x is normalized slider
  const logMax = Math.log10(MAX_VALUE + 1) // +1 to handle log(0)
  const amount = Math.pow(10, normalizedSlider * logMax) - 1
  
  // Round to nearest dollar
  return Math.round(amount)
}

/**
 * Convert actual amount (0-100000) to logarithmic slider position (0-1000)
 */
export function amountToSlider(amount: number): number {
  if (amount <= MIN_VALUE) return MIN_SLIDER
  if (amount >= MAX_VALUE) return MAX_SLIDER
  
  // Inverse logarithmic mapping
  const logMax = Math.log10(MAX_VALUE + 1)
  const logAmount = Math.log10(amount + 1)
  const normalizedSlider = logAmount / logMax
  
  // Convert back to slider range
  return Math.round(normalizedSlider * MAX_SLIDER)
}

/**
 * Generate tick marks for slider display
 * Returns array of {value, label} for visual reference points
 */
export function getSliderTickMarks() {
  return [
    { value: 0, label: '$0' },
    { value: amountToSlider(100), label: '$100' },
    { value: amountToSlider(500), label: '$500' },
    { value: amountToSlider(1000), label: '$1K' },
    { value: amountToSlider(5000), label: '$5K' },
    { value: amountToSlider(10000), label: '$10K' },
    { value: amountToSlider(50000), label: '$50K' },
    { value: amountToSlider(100000), label: '$100K' }
  ]
}
