'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStore } from '@/store'
import { Settings, Download, Upload, Trash2, AlertTriangle, Cpu, HardDrive, FolderArchive } from 'lucide-react'
import { GeminiApiKeySettings } from '@/components/settings/GeminiApiKeySettings'
import { FileSystemSetup } from '@/components/settings/FileSystemSetup'
import { exportCompleteProject, importCompleteProject } from '@/lib/project-export-import'

export default function SettingsPage() {
  const store = useStore()
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [businessName, setBusinessName] = useState(store.businessName)
  const [businessType, setBusinessType] = useState(store.businessType)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

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

  const exportCompleteProjectData = async () => {
    setExporting(true)
    try {
      const projectData = {
        receipts: store.receipts,
        transactions: store.transactions,
        custodyExpenses: store.custodyExpenses,
        invoices: store.invoices,
        bankAccounts: store.bankAccounts,
        businessName: store.businessName,
        businessType: store.businessType,
        exportDate: new Date().toISOString(),
        exportVersion: '1.0',
      }
      await exportCompleteProject(projectData)
      alert('Project exported successfully! Check your downloads folder.')
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting project. Check console for details.')
    } finally {
      setExporting(false)
    }
  }

  const importCompleteProjectData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const projectData = await importCompleteProject(file)
      if (!projectData) {
        throw new Error('Failed to parse project data')
      }

      // Import all data
      projectData.receipts.forEach(r => store.addReceipt(r))
      projectData.transactions.forEach(t => store.addTransaction(t))
      projectData.invoices.forEach(i => store.addInvoice(i))
      projectData.custodyExpenses.forEach(e => store.addCustodyExpense(e))
      
      // Update business info if present
      if (projectData.businessName) store.setBusinessName(projectData.businessName)
      if (projectData.businessType) store.setBusinessType(projectData.businessType)

      alert(`Project imported successfully!\n\nRestored:\n- ${projectData.receipts.length} receipts (${projectData.receipts.filter(r => r.imageData).length} with images)\n- ${projectData.transactions.length} transactions\n- ${projectData.invoices.length} invoices\n- ${projectData.custodyExpenses.length} custody expenses`)
    } catch (error) {
      console.error('Import error:', error)
      alert(`Error importing project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setImporting(false)
      event.target.value = ''
    }
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
            {/* Complete Project Export/Import */}
            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <FolderArchive className="h-5 w-5" />
                Complete Project Export/Import
              </h4>
              <p className="text-sm text-blue-800 mb-4">
                Export/import the entire bookkeeping project including all data files and receipt images. Use this to transfer your complete project to another computer.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="primary" 
                  onClick={exportCompleteProjectData}
                  disabled={exporting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export Complete Project'}
                </Button>
                <div>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={importCompleteProjectData}
                    className="hidden"
                    id="import-project-file"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('import-project-file')?.click()}
                    disabled={importing}
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? 'Importing...' : 'Import Complete Project'}
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-700 space-y-1">
                <p><strong>Export includes:</strong> All JSON data files, all receipt images, folder structure</p>
                <p><strong>File format:</strong> ZIP archive containing complete project</p>
              </div>
            </div>

            {/* Legacy JSON Export/Import */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Legacy Data Export/Import</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div>
                    <h5 className="font-medium text-sm">Export Data (JSON only)</h5>
                    <p className="text-xs text-gray-500">Download data as JSON (no images)</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div>
                    <h5 className="font-medium text-sm">Import Data (JSON only)</h5>
                    <p className="text-xs text-gray-500">Restore data from JSON backup</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importData}
                      className="hidden"
                      id="import-file"
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import JSON
                    </Button>
                  </div>
                </div>
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
