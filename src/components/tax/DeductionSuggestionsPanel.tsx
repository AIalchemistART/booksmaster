'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle, TrendingUp, ExternalLink, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DeductionSuggestion } from '@/lib/tax/deduction-suggestions'

interface DeductionSuggestionsPanelProps {
  suggestions: DeductionSuggestion[]
}

export function DeductionSuggestionsPanel({ suggestions }: DeductionSuggestionsPanelProps) {
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Deduction Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
            Great job! No deduction suggestions at this time. You&apos;re tracking expenses well.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.potentialSavings, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Deduction Suggestions
          </span>
          {totalPotentialSavings > 0 && (
            <span className="text-sm font-normal text-green-600 dark:text-green-400">
              Potential savings: {formatCurrency(totalPotentialSavings)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => {
            const confidenceColor = {
              high: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
              medium: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
              low: 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
            }[suggestion.confidence]

            const confidenceBadge = {
              high: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
              medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
              low: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
            }[suggestion.confidence]

            return (
              <div
                key={suggestion.id}
                className={`border rounded-lg p-4 ${confidenceColor}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {suggestion.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadge}`}>
                        {suggestion.confidence} confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {suggestion.description}
                    </p>
                  </div>
                  {suggestion.potentialSavings > 0 && (
                    <div className="ml-4 text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Potential Savings</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(suggestion.potentialSavings)}
                      </p>
                    </div>
                  )}
                </div>

                {suggestion.actionItems.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Action Items:
                    </p>
                    <ul className="space-y-1">
                      {suggestion.actionItems.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {suggestion.learnMoreUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(suggestion.learnMoreUrl, '_blank')}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Learn More (IRS)
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Important Reminder</p>
              <p>
                These suggestions are based on common deductions and patterns in your data. 
                Always consult with a tax professional to ensure you&apos;re claiming deductions correctly 
                and have proper documentation.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
