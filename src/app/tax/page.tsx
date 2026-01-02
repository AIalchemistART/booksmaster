'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calculator, Calendar, TrendingUp, AlertCircle, CheckCircle, Award } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { calculateQuarterlyEstimates, getTaxDeadlines, isDeadlineApproaching } from '@/lib/tax/quarterly-estimate'
import { suggestDeductions } from '@/lib/tax/deduction-suggestions'
import { DeductionSuggestionsPanel } from '@/components/tax/DeductionSuggestionsPanel'
import { FeatureLock } from '@/components/gamification/FeatureLock'

export default function TaxPage() {
  const { transactions, userProgress, completeAction } = useStore()
  const currentYear = new Date().getFullYear()
  
  // Track reviewed quarters (persist in localStorage)
  const [reviewedQuarters, setReviewedQuarters] = useState<string[]>([])
  
  useEffect(() => {
    const stored = localStorage.getItem(`tax-reviewed-quarters-${currentYear}`)
    if (stored) {
      setReviewedQuarters(JSON.parse(stored))
    }
  }, [currentYear])
  
  const markQuarterReviewed = async (quarter: string) => {
    if (reviewedQuarters.includes(quarter)) return
    
    const newReviewed = [...reviewedQuarters, quarter]
    setReviewedQuarters(newReviewed)
    localStorage.setItem(`tax-reviewed-quarters-${currentYear}`, JSON.stringify(newReviewed))
    
    // Award XP for quarterly review
    await completeAction('reviewQuarterlyTax')
    
    // Check for full quarter completion achievement
    if (newReviewed.length === 4) {
      await completeAction('completeQuarter')
    }
  }
  
  const isQuarterReviewed = (quarter: string) => reviewedQuarters.includes(quarter)
  
  const taxProjection = calculateQuarterlyEstimates(transactions, currentYear)
  const deadlines = getTaxDeadlines(currentYear)
  const deductionSuggestions = suggestDeductions(transactions, currentYear)
  
  const upcomingDeadlines = [
    { label: 'Q1 Estimated Tax', date: deadlines.q1 },
    { label: 'Q2 Estimated Tax', date: deadlines.q2 },
    { label: 'Q3 Estimated Tax', date: deadlines.q3 },
    { label: 'Q4 Estimated Tax', date: deadlines.q4 },
    { label: 'Annual Filing', date: deadlines.annualFiling }
  ].filter(d => d.date > new Date())

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Tax Planning</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Quarterly estimates and tax compliance</p>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400 font-normal">Projected Annual Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(taxProjection.totalEstimatedTax)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {(taxProjection.effectiveTaxRate * 100).toFixed(1)}% effective rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400 font-normal">Quarterly Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(taxProjection.totalEstimatedTax / 4)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Due each quarter
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400 font-normal">Self-Employment Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(taxProjection.selfEmploymentTax)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              15.3% of net profit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400 font-normal">Federal Income Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(taxProjection.federalIncomeTax)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Progressive brackets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Tax Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline, idx) => {
                const isApproaching = isDeadlineApproaching(deadline.date)
                const daysUntil = Math.ceil((deadline.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                
                return (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isApproaching 
                        ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' 
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isApproaching ? (
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <Calendar className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{deadline.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {deadline.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        isApproaching ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {daysUntil} days
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annual Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Year-to-Date Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gross Income</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(taxProjection.ytdGrossIncome)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expenses</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(taxProjection.ytdExpenses)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Profit (YTD)</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(taxProjection.ytdNetProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Projected Annual Totals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Projected Income</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(taxProjection.projectedAnnualIncome)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Projected Expenses</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(taxProjection.projectedAnnualExpenses)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Projected Net Profit</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(taxProjection.projectedNetProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Tax Estimates */}
      <FeatureLock feature="quarterly_estimates" requiredLevel={3}>
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Estimated Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Quarter</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Due Date</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Income</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Expenses</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Net Profit</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Est. Payment</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Review</th>
                  </tr>
                </thead>
              <tbody>
                {taxProjection.quarters.map(q => (
                  <tr key={q.quarter} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{q.quarterLabel}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {new Date(q.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(q.grossIncome)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                      {formatCurrency(q.totalExpenses)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(q.netProfit)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(q.estimatedPayment)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {q.paymentStatus === 'overdue' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                          Overdue
                        </span>
                      )}
                      {q.paymentStatus === 'due_soon' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                          Due Soon
                        </span>
                      )}
                      {q.paymentStatus === 'not_due' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          Not Due
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                  <td colSpan={5} className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    Total Annual Estimated Tax
                  </td>
                  <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400">
                    {formatCurrency(taxProjection.totalEstimatedTax)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
        </Card>
      </FeatureLock>

      {/* Deduction Suggestions */}
      <div className="mt-8">
        <DeductionSuggestionsPanel suggestions={deductionSuggestions} />
      </div>

      {/* Tax Saving Tips */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>💡 Tax Planning Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Quarterly Payments:</strong> Pay estimated taxes by the deadlines above to avoid penalties and interest.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Self-Employment Tax:</strong> Remember that 50% of your SE tax is deductible from your income.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>QBI Deduction:</strong> You may qualify for a 20% Qualified Business Income deduction if your income is below $191,950.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Track Everything:</strong> Keep detailed records of all business expenses - every receipt counts toward reducing your tax burden.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Disclaimer:</strong> These are estimates based on your current data. Consult a tax professional for personalized advice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
