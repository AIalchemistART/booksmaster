'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, AlertCircle, CheckCircle, ExternalLink, Lock, Sparkles } from 'lucide-react'
import { getTaxDeadlines, isDeadlineApproaching } from '@/lib/tax/quarterly-estimate'
import { useStore } from '@/store'
import { LEVELS } from '@/lib/gamification/leveling-system'

const TAX_UNLOCK_LEVEL = 6 // Unlock at max level

export function TaxDeadlineReminder() {
  const { userProgress } = useStore()
  const currentYear = new Date().getFullYear()
  const deadlines = getTaxDeadlines(currentYear)
  const now = new Date()
  
  // Lock tax features until Level 6 (max level - user has established workflow)
  const isLocked = userProgress.currentLevel < TAX_UNLOCK_LEVEL
  const unlockLevelData = LEVELS.find(l => l.level === TAX_UNLOCK_LEVEL)

  const upcomingDeadlines = [
    { label: 'Q1 Estimated Tax', date: deadlines.q1, quarter: 1 },
    { label: 'Q2 Estimated Tax', date: deadlines.q2, quarter: 2 },
    { label: 'Q3 Estimated Tax', date: deadlines.q3, quarter: 3 },
    { label: 'Q4 Estimated Tax', date: deadlines.q4, quarter: 4 },
    { label: 'Annual Tax Filing', date: deadlines.annualFiling, quarter: null }
  ]
    .filter(d => d.date > now)
    .slice(0, 3) // Show next 3 deadlines

  if (upcomingDeadlines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Tax Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All deadlines for this year have passed. Great job staying on top of your taxes!
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show locked state if user hasn't reached Level 6
  if (isLocked) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border-gray-300 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            Tax Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tax deadline tracking unlocks when you reach <strong>Level {TAX_UNLOCK_LEVEL}</strong>.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Sparkles className="h-4 w-4" />
              <span>
                Complete your workflow to unlock: {unlockLevelData?.title}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const nextDeadline = upcomingDeadlines[0]
  const daysUntil = Math.ceil((nextDeadline.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isUrgent = daysUntil <= 7
  const isApproaching = daysUntil <= 30

  return (
    <Card className={isUrgent ? 'border-2 border-red-500 dark:border-red-700' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className={`h-5 w-5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
          Tax Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Next Deadline - Featured */}
          <div className={`p-4 rounded-lg border-2 ${
            isUrgent 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
              : isApproaching
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {isUrgent ? (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : isApproaching ? (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {nextDeadline.label}
                </span>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                isUrgent
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                  : isApproaching
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
              }`}>
                {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Due: {nextDeadline.date.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
            {nextDeadline.quarter && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => window.location.href = '/tax'}
              >
                View Q{nextDeadline.quarter} Estimate
              </Button>
            )}
            {!nextDeadline.quarter && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://www.irs.gov/payments', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                IRS Payment Portal
              </Button>
            )}
          </div>

          {/* Other Upcoming Deadlines */}
          {upcomingDeadlines.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Also Coming Up:
              </p>
              {upcomingDeadlines.slice(1).map((deadline, idx) => {
                const days = Math.ceil((deadline.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {deadline.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {deadline.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({days}d)
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Links */}
          <div className="pt-3 border-t dark:border-gray-700">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => window.location.href = '/tax'}
            >
              View Full Tax Planning →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
