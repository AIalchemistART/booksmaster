'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useStore, generateId } from '@/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Trash2, Edit2, X, Check, FileText, DollarSign, AlertCircle, CheckCircle, Printer } from 'lucide-react'
import type { Invoice } from '@/types'
import { useFileSystemCheck } from '@/hooks/useFileSystemCheck'
import { FileSystemRequiredModal } from '@/components/modals/FileSystemRequiredModal'
import { FirstVisitIntro, useFirstVisit } from '@/components/gamification/FirstVisitIntro'

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]

export default function InvoicesPage() {
  const { invoices, addInvoice, updateInvoice, deleteInvoice, addTransaction, completeAction, unlockAchievement } = useStore()
  const { showModal, requireFileSystem, handleSetupComplete, handleCancel } = useFileSystemCheck()
  const { showIntro, closeIntro } = useFirstVisit('invoices')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    amount: '',
    description: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft' as Invoice['status'],
    notes: '',
  })

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientEmail: '',
      amount: '',
      description: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      notes: '',
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const now = new Date().toISOString()

    if (editingId) {
      updateInvoice(editingId, {
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        amount: parseFloat(formData.amount),
        description: formData.description,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        status: formData.status,
        notes: formData.notes,
      })
    } else {
      const newInvoice: Invoice = {
        id: generateId(),
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        amount: parseFloat(formData.amount),
        description: formData.description,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        status: formData.status,
        notes: formData.notes,
        createdAt: now,
        updatedAt: now,
      }
      addInvoice(newInvoice)
      
      const newInvoiceCount = invoices.length + 1
      if (newInvoiceCount === 1) {
        unlockAchievement('first_invoice')
      } else if (newInvoiceCount === 10) {
        unlockAchievement('invoice_pro')
      }
      
      // Award XP for invoice creation
      completeAction('createInvoice')
    }
    resetForm()
  }

  const handleEdit = (invoice: Invoice) => {
    setFormData({
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail || '',
      amount: invoice.amount.toString(),
      description: invoice.description,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      notes: invoice.notes || '',
    })
    setEditingId(invoice.id)
    setShowForm(true)
  }

  const markAsPaid = (invoice: Invoice) => {
    const now = new Date().toISOString()
    updateInvoice(invoice.id, {
      status: 'paid',
      paidDate: now.split('T')[0],
    })
    // Add as income transaction
    addTransaction({
      id: generateId(),
      date: now.split('T')[0],
      amount: invoice.amount,
      description: `Invoice paid: ${invoice.clientName} - ${invoice.description}`,
      type: 'income',
      category: 'other',
      notes: `Invoice #${invoice.id}`,
      createdAt: now,
      updatedAt: now,
    })
  }

  const printInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoice.clientName}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .invoice-title { font-size: 32px; font-weight: bold; color: #1a1a1a; }
          .invoice-number { color: #666; margin-top: 5px; }
          .dates { text-align: right; }
          .date-row { margin: 5px 0; }
          .label { color: #666; }
          .section { margin: 30px 0; }
          .section-title { font-size: 14px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .client-info { font-size: 16px; }
          .description { background: #f9f9f9; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .amount-section { text-align: right; margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; }
          .amount { font-size: 28px; font-weight: bold; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .status-paid { background: #d4edda; color: #155724; }
          .status-sent { background: #cce5ff; color: #004085; }
          .status-draft { background: #e2e3e5; color: #383d41; }
          .status-overdue { background: #f8d7da; color: #721c24; }
          .notes { margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 4px; font-size: 14px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">#${invoice.id.slice(0, 8).toUpperCase()}</div>
          </div>
          <div class="dates">
            <div class="date-row"><span class="label">Issue Date:</span> ${formatDate(invoice.issueDate)}</div>
            <div class="date-row"><span class="label">Due Date:</span> ${formatDate(invoice.dueDate)}</div>
            <div class="date-row" style="margin-top: 10px;">
              <span class="status status-${invoice.status}">${invoice.status}</span>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Bill To</div>
          <div class="client-info">
            <strong>${invoice.clientName}</strong>
            ${invoice.clientEmail ? `<br>${invoice.clientEmail}` : ''}
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Description</div>
          <div class="description">${invoice.description}</div>
        </div>
        
        <div class="amount-section">
          <div class="label">Amount Due</div>
          <div class="amount">${formatCurrency(invoice.amount)}</div>
        </div>
        
        ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
      </body>
      </html>
    `
    
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }

  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  )

  const totalPending = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="p-8">
      <FirstVisitIntro tabId="invoices" isVisible={showIntro} onClose={closeIntro} />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Track client invoices and payments</p>
        </div>
        <Button onClick={() => requireFileSystem(() => setShowForm(true))}>
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Invoice Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{invoices.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {invoices.filter(i => i.status === 'paid').length} paid
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Outstanding</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(totalPending)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} pending
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
                <p className={`text-2xl font-bold ${invoices.filter(i => i.status === 'overdue').length > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {invoices.filter(i => i.status === 'overdue').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {invoices.filter(i => i.status === 'overdue').length > 0 
                    ? formatCurrency(invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0))
                    : 'None overdue!'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${invoices.filter(i => i.status === 'overdue').length > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                <AlertCircle className={`h-6 w-6 ${invoices.filter(i => i.status === 'overdue').length > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collected This Year</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(invoices
                    .filter(i => i.status === 'paid' && i.paidDate && new Date(i.paidDate).getFullYear() === new Date().getFullYear())
                    .reduce((sum, i) => sum + i.amount, 0))}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {invoices.filter(i => i.status === 'paid' && i.paidDate && new Date(i.paidDate).getFullYear() === new Date().getFullYear()).length} invoices
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Invoice' : 'New Invoice'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Client Name"
                  placeholder="Client name"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                />
                <Input
                  label="Client Email (optional)"
                  type="email"
                  placeholder="client@example.com"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Input
                  label="Issue Date"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  required
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Description"
                placeholder="Work description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
                />
                <Input
                  label="Notes (optional)"
                  placeholder="Additional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  <Check className="h-4 w-4 mr-2" />
                  {editingId ? 'Update' : 'Create'}
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

      {/* Invoices List */}
      <Card>
        <CardContent className="pt-6">
          {sortedInvoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No invoices yet. Create your first invoice above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Issue Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Due Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{invoice.clientName}</p>
                          {invoice.clientEmail && (
                            <p className="text-sm text-gray-500">{invoice.clientEmail}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{invoice.description}</td>
                      <td className="py-3 px-4">{formatDate(invoice.issueDate)}</td>
                      <td className="py-3 px-4">{formatDate(invoice.dueDate)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status !== 'paid' && (
                            <Button size="sm" variant="ghost" onClick={() => markAsPaid(invoice)}>
                              Mark Paid
                            </Button>
                          )}
                          <button
                            onClick={() => printInvoice(invoice)}
                            className="p-1 text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                            title="Print Invoice"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteInvoice(invoice.id)}
                            className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
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
