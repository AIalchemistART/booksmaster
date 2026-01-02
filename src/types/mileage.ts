/**
 * Mileage tracking types for gig drivers and contractors
 */

export type TripPurpose = 'business' | 'personal' | 'commute'
export type TripStatus = 'in_progress' | 'completed' | 'paused'

export interface MileageTrip {
  id: string
  startTime: string // ISO timestamp
  endTime?: string // ISO timestamp
  status: TripStatus
  
  // Location data
  startLocation?: {
    lat: number
    lng: number
    address?: string
  }
  endLocation?: {
    lat: number
    lng: number
    address?: string
  }
  
  // Distance
  odometerStart?: number // Optional manual odometer reading
  odometerEnd?: number // Optional manual odometer reading
  distanceMiles: number // Calculated or manually entered
  
  // Trip details
  purpose: TripPurpose
  description: string // e.g., "Client meeting at ABC Corp"
  category?: string // Expense category if business trip
  
  // GPS tracking
  trackingEnabled: boolean
  routePoints?: Array<{
    lat: number
    lng: number
    timestamp: string
    speed?: number // mph
  }>
  
  // Deduction calculation
  standardMileageRate?: number // IRS rate at time of trip
  calculatedDeduction?: number // distance * rate
  
  // Metadata
  linkedTransactionId?: string // Link to fuel/toll expenses
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MileageSettings {
  // Tracking preferences
  autoTrackingEnabled: boolean
  gpsAccuracy: 'high' | 'balanced' | 'low'
  
  // Rates (per mile)
  currentStandardRate: number // Current IRS standard mileage rate
  customRateOverride?: number // User can override for specific tracking
  
  // Defaults
  defaultPurpose: TripPurpose
  defaultCategory?: string
  
  // Vehicle info
  vehicles: MileageVehicle[]
  defaultVehicleId?: string
  
  // Reminders
  reminderEnabled: boolean
  reminderFrequency?: 'daily' | 'weekly' | 'end_of_trip'
}

export interface MileageVehicle {
  id: string
  name: string // e.g., "2020 Honda Civic"
  make?: string
  model?: string
  year?: number
  licensePlate?: string
  
  // Depreciation tracking
  purchaseDate?: string
  purchasePrice?: number
  businessUsePercentage?: number // 0-100
  
  // Current odometer
  currentOdometer?: number
  
  // Active/archived
  isActive: boolean
  
  createdAt: string
  updatedAt: string
}

export interface MileageSummary {
  totalBusinessMiles: number
  totalPersonalMiles: number
  totalCommuteMiles: number
  totalTrips: number
  
  // Period specific
  periodStart: string
  periodEnd: string
  
  // Deduction estimate
  estimatedDeduction: number
  standardRateUsed: number
  
  // By category
  mileageByCategory: Record<string, number>
}

/**
 * IRS Standard Mileage Rates by Year
 */
export const IRS_MILEAGE_RATES: Record<number, number> = {
  2024: 0.67,
  2023: 0.655,
  2022: 0.625,
  2021: 0.56,
  2020: 0.575
}

/**
 * Get current IRS mileage rate
 */
export function getCurrentMileageRate(): number {
  const year = new Date().getFullYear()
  return IRS_MILEAGE_RATES[year] || 0.67 // Default to 2024 rate
}

/**
 * Calculate trip deduction
 */
export function calculateTripDeduction(miles: number, rate?: number): number {
  const rateToUse = rate || getCurrentMileageRate()
  return miles * rateToUse
}
