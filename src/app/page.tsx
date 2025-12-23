'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useStore } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users,
  Receipt,
  FileText
} from 'lucide-react'
import type { ExpenseCategory } from '@/types'

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
  const { transactions, custodyExpenses, invoices, receipts } = useStore()

  // Calculate business stats
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netProfit = totalIncome - totalExpenses

  // Calculate custody balance (positive = other parent owes Thomas)
  const custodyBalance = custodyExpenses.reduce((balance, expense) => {
    if (expense.paidBy === 'thomas') {
      return balance + expense.otherParentOwes
    } else {
      return balance - expense.thomasOwes
    }
  }, 0)

  // Pending invoices
  const pendingInvoices = invoices.filter(
    (i) => i.status === 'sent' || i.status === 'overdue'
  ).length

  // Expenses by category
  const expensesByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
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
    {
      title: 'Custody Balance',
      value: formatCurrency(Math.abs(custodyBalance)),
      subtitle: custodyBalance >= 0 ? 'Owed to Thomas' : 'Thomas owes',
      icon: Users,
      color: custodyBalance >= 0 ? 'text-blue-600' : 'text-orange-600',
      bgColor: custodyBalance >= 0 ? 'bg-blue-100' : 'bg-orange-100',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, Thomas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                    {formatCurrency(receipts.reduce((sum, r) => sum + (r.ocrAmount || 0), 0))} total
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
                {receipts.slice(0, 5).map((receipt) => (
                  <div key={receipt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
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
    </div>
  )
}
