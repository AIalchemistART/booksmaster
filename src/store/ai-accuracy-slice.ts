/**
 * AI Accuracy Metrics Slice
 * Tracks improvement in AI parsing accuracy over time
 * Measures: (receipts validated without edits) / (total receipts validated)
 */

import { StateCreator } from 'zustand'

export interface AccuracyDataPoint {
  timestamp: string // ISO timestamp of validation
  requiresEdit: boolean // true if user made any edits, false if AI was perfect
  receiptId: string
  fieldsEdited?: string[] // Which fields needed correction (vendor, amount, date, etc)
  transactionId?: string // Linked transaction ID
}

export interface AccuracyPeriodSummary {
  period: string // YYYY-MM format for monthly, YYYY-WW for weekly
  totalValidations: number
  perfectParsing: number // No edits needed
  requiresEdits: number // User made corrections
  accuracyRate: number // Percentage (0-100)
  avgFieldsEdited: number // Average number of fields that needed correction
}

export interface AIAccuracySlice {
  // Raw data points for all validations
  accuracyDataPoints: AccuracyDataPoint[]
  
  // Aggregated summaries by time period
  weeklySummaries: AccuracyPeriodSummary[]
  monthlySummaries: AccuracyPeriodSummary[]
  
  // Actions
  recordValidation: (dataPoint: AccuracyDataPoint) => void
  calculateSummaries: () => void
  getLatestAccuracyRate: () => number
  getAccuracyTrend: (periods: number) => AccuracyPeriodSummary[]
  resetAccuracyMetrics: () => void
}

/**
 * Get ISO week number from date
 */
function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}

/**
 * Get month identifier from date
 */
function getMonthIdentifier(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Calculate summaries from raw data points
 */
function calculateSummariesFromDataPoints(dataPoints: AccuracyDataPoint[]): {
  weekly: AccuracyPeriodSummary[]
  monthly: AccuracyPeriodSummary[]
} {
  if (dataPoints.length === 0) {
    return { weekly: [], monthly: [] }
  }

  // Group by week and month
  const weeklyMap = new Map<string, AccuracyDataPoint[]>()
  const monthlyMap = new Map<string, AccuracyDataPoint[]>()

  dataPoints.forEach(point => {
    const date = new Date(point.timestamp)
    const week = getWeekNumber(date)
    const month = getMonthIdentifier(date)

    if (!weeklyMap.has(week)) weeklyMap.set(week, [])
    if (!monthlyMap.has(month)) monthlyMap.set(month, [])

    weeklyMap.get(week)!.push(point)
    monthlyMap.get(month)!.push(point)
  })

  // Calculate summaries for each period
  const calculatePeriodSummary = (period: string, points: AccuracyDataPoint[]): AccuracyPeriodSummary => {
    const totalValidations = points.length
    const perfectParsing = points.filter(p => !p.requiresEdit).length
    const requiresEdits = points.filter(p => p.requiresEdit).length
    const accuracyRate = totalValidations > 0 ? (perfectParsing / totalValidations) * 100 : 0
    
    const totalFieldsEdited = points.reduce((sum, p) => sum + (p.fieldsEdited?.length || 0), 0)
    const avgFieldsEdited = requiresEdits > 0 ? totalFieldsEdited / requiresEdits : 0

    // Calculate weighted accuracy based on field-level correctness
    const weightedAccuracy = points.reduce((sum, p) => sum + (p.accuracyScore || 0), 0) / (totalValidations || 1)

    return {
      period,
      totalValidations,
      perfectParsing,
      requiresEdits,
      accuracyRate: Math.round(accuracyRate * 10) / 10, // Round to 1 decimal (old binary metric)
      avgFieldsEdited: Math.round(avgFieldsEdited * 10) / 10,
      weightedAccuracy: Math.round(weightedAccuracy * 10) / 10 // Field-weighted accuracy
    }
  }

  const weekly = Array.from(weeklyMap.entries())
    .map(([period, points]) => calculatePeriodSummary(period, points))
    .sort((a, b) => a.period.localeCompare(b.period))

  const monthly = Array.from(monthlyMap.entries())
    .map(([period, points]) => calculatePeriodSummary(period, points))
    .sort((a, b) => a.period.localeCompare(b.period))

  return { weekly, monthly }
}

export const createAIAccuracySlice: StateCreator<AIAccuracySlice> = (set, get) => ({
  accuracyDataPoints: [],
  weeklySummaries: [],
  monthlySummaries: [],

  recordValidation: (dataPoint: AccuracyDataPoint) => {
    set((state) => {
      const newDataPoints = [...state.accuracyDataPoints, dataPoint]
      
      console.log(`[AI ACCURACY] Recorded validation: ${dataPoint.requiresEdit ? 'EDITED' : 'PERFECT'} (${dataPoint.fieldsEdited?.length || 0} fields)`)
      
      // Data points are automatically persisted via zustand persist middleware
      return { accuracyDataPoints: newDataPoints }
    })
    
    // Recalculate summaries after adding new data
    get().calculateSummaries()
  },

  calculateSummaries: () => {
    set((state) => {
      const { weekly, monthly } = calculateSummariesFromDataPoints(state.accuracyDataPoints)
      
      console.log(`[AI ACCURACY] Calculated summaries: ${weekly.length} weeks, ${monthly.length} months`)
      if (monthly.length > 0) {
        const latest = monthly[monthly.length - 1]
        console.log(`[AI ACCURACY] Current month accuracy: ${latest.accuracyRate}% (${latest.perfectParsing}/${latest.totalValidations} perfect)`)
      }
      
      return {
        weeklySummaries: weekly,
        monthlySummaries: monthly
      }
    })
  },

  getLatestAccuracyRate: () => {
    const { monthlySummaries } = get()
    if (monthlySummaries.length === 0) return 0
    return monthlySummaries[monthlySummaries.length - 1].accuracyRate
  },

  getAccuracyTrend: (periods: number) => {
    const { monthlySummaries } = get()
    return monthlySummaries.slice(-periods)
  },

  resetAccuracyMetrics: () => {
    set({
      accuracyDataPoints: [],
      weeklySummaries: [],
      monthlySummaries: []
    })
    console.log('[AI ACCURACY] Metrics reset')
  }
})
