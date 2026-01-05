'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users,
  Receipt,
  FileText,
  Camera,
  Shield,
  BarChart3,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import type { ExpenseCategory } from '@/types'
import { IncomeVerificationSummary } from '@/components/dashboard/IncomeVerificationSummary'
import { AIConfidenceScore } from '@/components/dashboard/AIConfidenceScore'
import { AIAccuracyCard } from '@/components/dashboard/AIAccuracyCard'
import { TaxDeadlineReminder } from '@/components/dashboard/TaxDeadlineReminder'
import { LevelProgressCard } from '@/components/dashboard/LevelProgressCard'
import { AchievementsDisplay } from '@/components/dashboard/AchievementsDisplay'
import { FirstVisitIntro, useFirstVisit } from '@/components/gamification/FirstVisitIntro'
import { QuestList } from '@/components/quests/QuestCard'

const categoryLabels: Record<ExpenseCategory, string> = {
  materials: 'Materials',
  tools: 'Tools',
  fuel: 'Fuel',
  subcontractors: 'Subcontractors',
  insurance: 'Insurance',
  permits: 'Permits',
  office_supplies: 'Office Supplies',
  marketing: 'Marketing',
  vehicle_maintenance: 'Vehicle Maintenance',
  equipment_rental: 'Equipment Rental',
  professional_services: 'Professional Services',
  utilities: 'Utilities',
  other: 'Other',
}

export default function Dashboard() {
  const { transactions, invoices, receipts, userProgress, manualLevelUp, getActiveQuests, completeQuest } = useStore()
  const { showIntro, closeIntro } = useFirstVisit('dashboard')
  
  // Get active quests
  const activeQuests = getActiveQuests()

  // Calculate business stats
  const totalIncome = transactions
    .filter((t: any) => t.type === 'income' && !t.isDuplicateOfLinked)
    .reduce((sum: number, t: any) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0)

  const netProfit = totalIncome - totalExpenses

  // Enhanced metrics calculations
  // Receipt Linkage = Transactions that have supporting documents linked
  const transactionsWithSuppDocs = transactions.filter((t: any) => {
    // Check if this transaction has any supporting documents linked via receiptId
    const hasSupplementalDoc = receipts.some((r: any) => 
      r.isSupplementalDoc && (r.linkedTransactionId === t.id || r.primaryDocumentId === t.receiptId)
    )
    return hasSupplementalDoc
  }).length
  const receiptLinkageRate = transactions.length > 0 ? (transactionsWithSuppDocs / transactions.length) * 100 : 0
  const linkedReceipts = transactionsWithSuppDocs
  
  // Get current month's receipt count
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const receiptsThisMonth = receipts.filter((r: any) => {
    const receiptDate = new Date(r.ocrDate || r.createdAt)
    return receiptDate >= currentMonthStart
  }).length

  // Income verification quality
  const incomeTransactions = transactions.filter((t: any) => t.type === 'income' && !t.isDuplicateOfLinked)
  const strongVerified = incomeTransactions.filter((t: any) => t.verificationLevel === 'strong').length
  const bankVerified = incomeTransactions.filter((t: any) => t.verificationLevel === 'bank').length
  const selfReported = incomeTransactions.filter((t: any) => t.verificationLevel === 'self' || !t.verificationLevel).length
  const verificationScore = incomeTransactions.length > 0 
    ? Math.round(((strongVerified * 100 + bankVerified * 70 + selfReported * 30) / incomeTransactions.length))
    : 0

  // Average transaction amount
  const avgTransaction = transactions.length > 0 
    ? transactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0) / transactions.length
    : 0

  // Largest expense
  const expenses = transactions.filter((t: any) => t.type === 'expense')
  const largestExpense = expenses.length > 0 
    ? Math.max(...expenses.map((t: any) => t.amount))
    : 0

  // CUSTODY BALANCE COMMENTED OUT - Too niche for general market
  // const custodyBalance = custodyExpenses.reduce((balance: number, expense: any) => {
  //   if (expense.paidBy === 'thomas') {
  //     return balance + expense.otherParentOwes
  //   } else {
  //     return balance - expense.thomasOwes
  //   }
  // }, 0)

  // Pending invoices
  const pendingInvoices = invoices.filter(
    (i: any) => i.status === 'sent' || i.status === 'overdue'
  ).length

  // Expenses by category
  const expensesByCategory = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((acc: any, t: any) => {
      const cat = t.category as ExpenseCategory
      acc[cat] = (acc[cat] || 0) + t.amount
      return acc
    }, {} as Record<ExpenseCategory, number>)

  const stats = [
    {
      title: 'Total Income',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Net Profit',
      value: formatCurrency(netProfit),
      icon: DollarSign,
      color: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: netProfit >= 0 ? 'bg-green-100' : 'bg-red-100',
    },
    // CUSTODY STAT COMMENTED OUT
    // {
    //   title: 'Custody Balance',
    //   value: formatCurrency(Math.abs(custodyBalance)),
    //   subtitle: custodyBalance >= 0 ? 'Owed to Thomas' : 'Thomas owes',
    //   icon: Users,
    //   color: custodyBalance >= 0 ? 'text-blue-600' : 'text-orange-500',
    //   bgColor: custodyBalance >= 0 ? 'bg-blue-100' : 'bg-orange-100',
    // },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your business at a glance</h1>
            {/* DEBUG: Store state display */}
            <div className="mt-2 p-2 bg-red-600 text-white text-xs font-mono">
              DEBUG - Level: {userProgress.currentLevel} | Features: {userProgress.unlockedFeatures.join(', ')} | Receipts: {receipts.length}
            </div>
          </div>
        </div>
      </div>

      {/* Quest System */}
      {activeQuests.length > 0 && (
        <div className="mb-8">
          <QuestList 
            quests={activeQuests}
            onStartScanning={() => {
              if (userProgress.currentLevel === 1) {
                completeQuest('start_scanning')
                manualLevelUp('receipts')
                console.log('[QUEST] Completed start_scanning quest - advancing to Level 2 (Receipts)')
              }
            }}
          />
        </div>
      )}

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receipts This Month</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{receiptsThisMonth}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{receipts.length} total</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Camera className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receipt Linkage</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{receiptLinkageRate.toFixed(0)}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{linkedReceipts} of {receipts.length} linked</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Income Verification</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{verificationScore}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {strongVerified} strong, {bankVerified} bank
                </p>
              </div>
              <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Transaction</p>
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{formatCurrency(avgTransaction)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Largest: {formatCurrency(largestExpense)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                <BarChart3 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Verification, AI Confidence & AI Learning Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <IncomeVerificationSummary />
        <AIConfidenceScore />
        <AIAccuracyCard />
      </div>

      {/* Level Progress */}
      <div className="mb-8">
        <LevelProgressCard />
      </div>

      {/* Tax Deadline Reminder */}
      <div className="col-span-full lg:col-span-1 mb-8">
        <TaxDeadlineReminder />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold text-purple-600">{pendingInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100">
                <Receipt className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Receipts</p>
                <p className="text-2xl font-bold text-amber-600">{receipts.length}</p>
                {receipts.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {formatCurrency(receipts.reduce((sum: number, r: any) => sum + (r.ocrAmount || 0), 0))} total
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-cyan-100">
                <DollarSign className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-cyan-600">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No expenses recorded yet. Add transactions to see category breakdown.
              </p>
            ) : (
              <div className="space-y-4">
                {(Object.entries(expensesByCategory) as [ExpenseCategory, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                    return (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{categoryLabels[category]}</span>
                          <span className="text-gray-600">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Receipts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            {receipts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No receipts scanned yet. Go to Receipts to scan your first one.
              </p>
            ) : (
              <div className="space-y-3">
                {receipts.slice(0, 5).map((receipt: any) => (
                  <div key={receipt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    {receipt.imageData ? (
                      <img 
                        src={receipt.imageData} 
                        alt="" 
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{receipt.ocrVendor || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{receipt.ocrDate || 'No date'}</p>
                    </div>
                    <p className="font-bold text-green-600">
                      {receipt.ocrAmount ? formatCurrency(receipt.ocrAmount) : '-'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievements Section */}
      <div className="mt-8">
        <AchievementsDisplay />
      </div>
      
      {/* First visit intro modal */}
      <FirstVisitIntro tabId="dashboard" isVisible={showIntro} onClose={closeIntro} />
    </div>
  )
}
