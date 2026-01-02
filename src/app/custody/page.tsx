'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useStore, generateId } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Edit2, X, Check, Users } from 'lucide-react'
import type { CustodyExpense, CustodyExpenseType } from '@/types'
import { useFileSystemCheck } from '@/hooks/useFileSystemCheck'
import { FileSystemRequiredModal } from '@/components/modals/FileSystemRequiredModal'

const expenseTypeOptions = [
  { value: 'child_support', label: 'Child Support' },
  { value: 'medical', label: 'Medical' },
  { value: 'education', label: 'Education' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'activities', label: 'Activities' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'food', label: 'Food' },
  { value: 'other', label: 'Other' },
]

const paidByOptions = [
  { value: 'thomas', label: 'Thomas' },
  { value: 'other_parent', label: 'Other Parent' },
]

export default function CustodyPage() {
  const { custodyExpenses, addCustodyExpense, updateCustodyExpense, deleteCustodyExpense } = useStore()
  const { showModal, requireFileSystem, handleSetupComplete, handleCancel } = useFileSystemCheck()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    expenseType: 'medical' as CustodyExpenseType,
    paidBy: 'thomas' as 'thomas' | 'other_parent',
    splitPercentage: '50',
    notes: '',
  })

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      expenseType: 'medical',
      paidBy: 'thomas',
      splitPercentage: '50',
      notes: '',
    })
    setShowForm(false)
    setEditingId(null)
  }

  const calculateOwed = (amount: number, splitPercentage: number, paidBy: 'thomas' | 'other_parent') => {
    const thomasShare = splitPercentage / 100
    const otherShare = 1 - thomasShare

    if (paidBy === 'thomas') {
      return {
        thomasOwes: 0,
        otherParentOwes: amount * otherShare,
      }
    } else {
      return {
        thomasOwes: amount * thomasShare,
        otherParentOwes: 0,
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const now = new Date().toISOString()
    const amount = parseFloat(formData.amount)
    const splitPercentage = parseFloat(formData.splitPercentage)
    const { thomasOwes, otherParentOwes } = calculateOwed(amount, splitPercentage, formData.paidBy)

    if (editingId) {
      updateCustodyExpense(editingId, {
        date: formData.date,
        amount,
        description: formData.description,
        expenseType: formData.expenseType,
        paidBy: formData.paidBy,
        splitPercentage,
        thomasOwes,
        otherParentOwes,
        notes: formData.notes,
      })
    } else {
      const newExpense: CustodyExpense = {
        id: generateId(),
        date: formData.date,
        amount,
        description: formData.description,
        expenseType: formData.expenseType,
        paidBy: formData.paidBy,
        splitPercentage,
        thomasOwes,
        otherParentOwes,
        notes: formData.notes,
        createdAt: now,
        updatedAt: now,
      }
      addCustodyExpense(newExpense)
    }
    resetForm()
  }

  const handleEdit = (expense: CustodyExpense) => {
    setFormData({
      date: expense.date,
      amount: expense.amount.toString(),
      description: expense.description,
      expenseType: expense.expenseType,
      paidBy: expense.paidBy,
      splitPercentage: expense.splitPercentage.toString(),
      notes: expense.notes || '',
    })
    setEditingId(expense.id)
    setShowForm(true)
  }

  // Calculate totals
  const totalThomasOwes = custodyExpenses.reduce((sum, e) => sum + e.thomasOwes, 0)
  const totalOtherParentOwes = custodyExpenses.reduce((sum, e) => sum + e.otherParentOwes, 0)
  const netBalance = totalOtherParentOwes - totalThomasOwes

  const sortedExpenses = [...custodyExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custody Expenses</h1>
          <p className="text-gray-600 mt-1">Track shared child-related expenses</p>
        </div>
        <Button onClick={() => requireFileSystem(() => setShowForm(true))}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Thomas Owes</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalThomasOwes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Other Parent Owes</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalOtherParentOwes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${netBalance >= 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
                <Users className={`h-6 w-6 ${netBalance >= 0 ? 'text-green-600' : 'text-orange-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-orange-500'}`}>
                  {formatCurrency(Math.abs(netBalance))}
                </p>
                <p className="text-xs text-gray-500">
                  {netBalance >= 0 ? 'Owed to Thomas' : 'Thomas owes'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Expense' : 'New Custody Expense'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
                <Select
                  label="Expense Type"
                  options={expenseTypeOptions}
                  value={formData.expenseType}
                  onChange={(e) => setFormData({ ...formData, expenseType: e.target.value as CustodyExpenseType })}
                />
                <Select
                  label="Paid By"
                  options={paidByOptions}
                  value={formData.paidBy}
                  onChange={(e) => setFormData({ ...formData, paidBy: e.target.value as 'thomas' | 'other_parent' })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Description"
                  placeholder="Enter description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
                <Input
                  label="Thomas's Share (%)"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={formData.splitPercentage}
                  onChange={(e) => setFormData({ ...formData, splitPercentage: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Notes (optional)"
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit">
                  <Check className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Save'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardContent className="pt-6">
          {sortedExpenses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No custody expenses recorded yet. Add your first expense above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Paid By</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Split</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Owed</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(expense.date)}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.notes && (
                            <p className="text-sm text-gray-500">{expense.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize">{expense.expenseType.replace('_', ' ')}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expense.paidBy === 'thomas' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {expense.paidBy === 'thomas' ? 'Thomas' : 'Other Parent'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {expense.splitPercentage}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        {expense.paidBy === 'thomas' ? (
                          <span className="text-purple-600">
                            Other owes {formatCurrency(expense.otherParentOwes)}
                          </span>
                        ) : (
                          <span className="text-blue-600">
                            Thomas owes {formatCurrency(expense.thomasOwes)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-1 text-gray-500 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteCustodyExpense(expense.id)}
                            className="p-1 text-gray-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File System Setup Modal */}
      {showModal && (
        <FileSystemRequiredModal 
          onSetupComplete={handleSetupComplete}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
