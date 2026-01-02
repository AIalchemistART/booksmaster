'use client'

import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ExpenseCategory } from '@/types'
import { FeatureLock } from '@/components/gamification/FeatureLock'

const categoryLabels: Record<string, string> = {
  materials: 'Materials',
  tools: 'Tools',
  fuel: 'Fuel',
  insurance: 'Insurance',
  permits: 'Permits',
  subcontractors: 'Subcontractors',
  office_supplies: 'Office Supplies',
  marketing: 'Marketing',
  vehicle_maintenance: 'Vehicle Maintenance',
  equipment_rental: 'Equipment Rental',
  professional_services: 'Professional Services',
  utilities: 'Utilities',
  other: 'Other',
  residential_job: 'Residential Job',
  commercial_job: 'Commercial Job',
  repairs: 'Repairs',
  consultation: 'Consultation',
  other_income: 'Other Income'
}

export default function InsightsPage() {
  const { transactions } = useStore()

  // Filter out duplicates
  const activeTransactions = transactions.filter(t => !t.isDuplicateOfLinked)

  // Get current month and previous month
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Current month transactions
  const currentMonthTransactions = activeTransactions.filter(t => {
    const date = new Date(t.date)
    return date >= currentMonthStart
  })

  // Previous month transactions
  const previousMonthTransactions = activeTransactions.filter(t => {
    const date = new Date(t.date)
    return date >= previousMonthStart && date <= previousMonthEnd
  })

  // Calculate totals
  const currentIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const currentExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const currentProfit = currentIncome - currentExpenses

  const previousIncome = previousMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const previousExpenses = previousMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const previousProfit = previousIncome - previousExpenses

  // Calculate changes
  const incomeChange = previousIncome === 0 ? 0 : ((currentIncome - previousIncome) / previousIncome) * 100
  const expenseChange = previousExpenses === 0 ? 0 : ((currentExpenses - previousExpenses) / previousExpenses) * 100
  const profitChange = previousProfit === 0 ? 0 : ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100

  // Spending by category
  const expensesByCategory = activeTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)

  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const totalExpenses = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0)

  // Monthly trend (last 6 months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
    }
  })

  const monthlyData = last6Months.map(({ month, start, end }) => {
    const monthTransactions = activeTransactions.filter(t => {
      const date = new Date(t.date)
      return date >= start && date <= end
    })

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return { month, income, expenses, profit: income - expenses }
  })

  const maxAmount = Math.max(...monthlyData.flatMap(d => [d.income, d.expenses]))

  return (
    <FeatureLock feature="insights" requiredLevel={6}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Business Insights</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Financial trends and analysis</p>
        </div>

        {/* Month-over-Month Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400 font-normal">Income Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(currentIncome)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    vs {formatCurrency(previousIncome)}
                  </p>
                </div>
                <div className={`flex items-center gap-1 ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {incomeChange >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span className="text-xl font-bold">{Math.abs(incomeChange).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400 font-normal">Expense Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(currentExpenses)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    vs {formatCurrency(previousExpenses)}
                  </p>
                </div>
                <div className={`flex items-center gap-1 ${expenseChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {expenseChange <= 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                  <span className="text-xl font-bold">{Math.abs(expenseChange).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-600 dark:text-gray-400 font-normal">Profit Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${currentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(currentProfit)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    vs {formatCurrency(previousProfit)}
                  </p>
                </div>
                <div className={`flex items-center gap-1 ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitChange >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span className="text-xl font-bold">{Math.abs(profitChange).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 6-Month Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>6-Month Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {monthlyData.map((data, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.month}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-600 dark:text-green-400">↑ {formatCurrency(data.income)}</span>
                      <span className="text-red-600 dark:text-red-400">↓ {formatCurrency(data.expenses)}</span>
                      <span className={`font-semibold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        = {formatCurrency(data.profit)}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-12 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-6 bg-green-500 opacity-60"
                      style={{ width: `${(data.income / maxAmount) * 100}%` }}
                    />
                    <div
                      className="absolute left-0 top-6 h-6 bg-red-500 opacity-60"
                      style={{ width: `${(data.expenses / maxAmount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Top Spending Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedCategories.map(([category, amount]) => {
                const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {categoryLabels[category] || category}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {percentage.toFixed(1)}%
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-24 text-right">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureLock>
  )
}
