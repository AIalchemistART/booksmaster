'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useStore } from '@/store'
import { TrendingUp, TrendingDown, Minus, Brain, Target } from 'lucide-react'
import { useMemo } from 'react'

export function AIAccuracyCard() {
  const { monthlySummaries, accuracyDataPoints } = useStore()

  const stats = useMemo(() => {
    if (accuracyDataPoints.length === 0) {
      return {
        currentRate: 0,
        trend: 0,
        totalValidations: 0,
        perfectCount: 0,
        recentMonths: []
      }
    }

    // Get last 3 months of data
    const recentMonths = monthlySummaries.slice(-3)
    const currentMonth = recentMonths[recentMonths.length - 1]
    const previousMonth = recentMonths.length > 1 ? recentMonths[recentMonths.length - 2] : null

    // Calculate trend
    let trend = 0
    if (previousMonth && currentMonth) {
      trend = currentMonth.accuracyRate - previousMonth.accuracyRate
    }

    return {
      currentRate: currentMonth?.accuracyRate || 0,
      trend,
      totalValidations: currentMonth?.totalValidations || 0,
      perfectCount: currentMonth?.perfectParsing || 0,
      recentMonths
    }
  }, [monthlySummaries, accuracyDataPoints])

  const getTrendIcon = () => {
    if (stats.trend > 2) return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
    if (stats.trend < -2) return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = () => {
    if (stats.trend > 2) return 'text-green-600 dark:text-green-400'
    if (stats.trend < -2) return 'text-red-600 dark:text-red-400'
    return 'text-gray-500 dark:text-gray-400'
  }

  const getAccuracyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400'
    if (rate >= 75) return 'text-blue-600 dark:text-blue-400'
    if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  if (accuracyDataPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            AI Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Start validating receipts to track AI accuracy improvement
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              The more you validate, the smarter the AI becomes
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          AI Learning Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Accuracy Rate */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Accuracy</p>
              <p className={`text-3xl font-bold ${getAccuracyColor(stats.currentRate)}`}>
                {stats.currentRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-1">
                {getTrendIcon()}
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">vs last month</p>
            </div>
          </div>

          {/* Perfect Parsing Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">This Month</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {stats.perfectCount} / {stats.totalValidations}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">perfect parses</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">All Time</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {accuracyDataPoints.filter(d => !d.requiresEdit).length} / {accuracyDataPoints.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">validations</p>
            </div>
          </div>

          {/* Mini Trend Chart */}
          {stats.recentMonths.length > 1 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Recent Trend</p>
              <div className="flex items-end justify-between gap-2 h-16">
                {stats.recentMonths.map((month, idx) => {
                  const height = (month.accuracyRate / 100) * 100
                  return (
                    <div key={month.period} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-purple-500 dark:bg-purple-600 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                        title={`${month.period}: ${month.accuracyRate.toFixed(1)}%`}
                      />
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {month.period.split('-')[1]}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 <strong>How it works:</strong> Each time you validate a receipt, we track if the AI parsed it perfectly 
              or if you needed to make corrections. Over time, as the AI learns from your edits, accuracy improves.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
