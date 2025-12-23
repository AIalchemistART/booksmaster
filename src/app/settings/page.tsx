'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStore } from '@/store'
import { Settings, Download, Upload, Trash2, AlertTriangle, Cpu, HardDrive } from 'lucide-react'
import { GeminiApiKeySettings } from '@/components/settings/GeminiApiKeySettings'
import { FileSystemSetup } from '@/components/settings/FileSystemSetup'

export default function SettingsPage() {
  const store = useStore()
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [businessName, setBusinessName] = useState(store.businessName)
  const [businessType, setBusinessType] = useState(store.businessType)

  const exportData = () => {
    const data = {
      transactions: store.transactions,
      custodyExpenses: store.custodyExpenses,
      invoices: store.invoices,
      receipts: store.receipts,
      bankAccounts: store.bankAccounts,
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `thomas-books-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Import transactions
        if (data.transactions) {
          data.transactions.forEach((t: any) => store.addTransaction(t))
        }
        // Import custody expenses
        if (data.custodyExpenses) {
          data.custodyExpenses.forEach((e: any) => store.addCustodyExpense(e))
        }
        // Import invoices
        if (data.invoices) {
          data.invoices.forEach((i: any) => store.addInvoice(i))
        }
        // Import receipts
        if (data.receipts) {
          data.receipts.forEach((r: any) => store.addReceipt(r))
        }
        
        alert('Data imported successfully!')
      } catch (err) {
        alert('Error importing data. Please check the file format.')
      }
    }
    reader.readAsText(file)
  }

  const clearAllData = () => {
    // Clear localStorage
    localStorage.removeItem('thomas-books-storage')
    // Reload page to reset state
    window.location.reload()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your app settings and data</p>
      </div>

      {/* Business Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onBlur={() => store.setBusinessName(businessName)}
            />
            <Input
              label="Business Type"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              onBlur={() => store.setBusinessType(businessType)}
            />
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Business information will be saved automatically when you click away from the field.
          </p>
        </CardContent>
      </Card>

      {/* File System Storage */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Local Storage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileSystemSetup />
        </CardContent>
      </Card>

      {/* OCR Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            OCR & AI Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GeminiApiKeySettings />
        </CardContent>
      </Card>

      {/* Data Statistics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{store.transactions.length}</p>
              <p className="text-sm text-gray-600">Transactions</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{store.custodyExpenses.length}</p>
              <p className="text-sm text-gray-600">Custody Expenses</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{store.invoices.length}</p>
              <p className="text-sm text-gray-600">Invoices</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{store.receipts.length}</p>
              <p className="text-sm text-gray-600">Receipts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Export Data</h4>
                <p className="text-sm text-gray-500">Download all your data as a JSON backup file</p>
              </div>
              <Button variant="outline" onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Import Data</h4>
                <p className="text-sm text-gray-500">Restore data from a backup file</p>
              </div>
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                  id="import-file"
                />
                <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showConfirmClear ? (
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium mb-4">
                Are you sure? This will permanently delete ALL your data including:
              </p>
              <ul className="list-disc list-inside text-red-700 text-sm mb-4">
                <li>All transactions</li>
                <li>All custody expenses</li>
                <li>All invoices</li>
                <li>All receipts</li>
              </ul>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={clearAllData}>
                  Yes, Delete Everything
                </Button>
                <Button variant="outline" onClick={() => setShowConfirmClear(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
              <div>
                <h4 className="font-medium text-red-600">Clear All Data</h4>
                <p className="text-sm text-gray-500">Permanently delete all stored data</p>
              </div>
              <Button variant="destructive" onClick={() => setShowConfirmClear(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
