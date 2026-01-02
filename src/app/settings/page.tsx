'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useStore } from '@/store'
import { Settings, Download, Upload, Trash2, AlertTriangle, Cpu, HardDrive, FolderArchive, Save, Moon, Sun, Calendar, Briefcase, Sparkles, Check } from 'lucide-react'
import { GeminiApiKeySettings } from '@/components/settings/GeminiApiKeySettings'
import { FileSystemSetup } from '@/components/settings/FileSystemSetup'
import { VendorDefaultsManager } from '@/components/settings/VendorDefaultsManager'
import { JOB_TYPE_LABELS, type TechTreePath } from '@/lib/gamification/leveling-system'
import { CustomJobDescriptionDialog } from '@/components/gamification/CustomJobDescriptionDialog'
import { exportCompleteProject, importCompleteProject } from '@/lib/project-export-import'
import { deleteAllFiles, clearAllAppData, isElectron } from '@/lib/file-system-adapter'

export default function SettingsPage() {
  const store = useStore()
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [businessName, setBusinessName] = useState(store.businessName)
  const [fiscalYearType, setFiscalYearType] = useState(store.fiscalYearType)
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(store.fiscalYearStartMonth)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [businessInfoSaved, setBusinessInfoSaved] = useState(true)
  const [fiscalYearSaved, setFiscalYearSaved] = useState(true)
  const [jobTypeChanged, setJobTypeChanged] = useState(false)
  const [showCustomJobDialog, setShowCustomJobDialog] = useState(false)

  // Sync local state with store when store values change
  useEffect(() => {
    setBusinessName(store.businessName)
  }, [store.businessName])

  useEffect(() => {
    setFiscalYearType(store.fiscalYearType)
  }, [store.fiscalYearType])

  useEffect(() => {
    setFiscalYearStartMonth(store.fiscalYearStartMonth)
  }, [store.fiscalYearStartMonth])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

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

  const clearAllData = async () => {
    try {
      console.log('[SETTINGS] Starting complete data deletion...')
      
      // Step 1: Delete all files from disk first (before clearing state)
      console.log('[SETTINGS] Deleting files from disk...')
      await deleteAllFiles()
      console.log('[SETTINGS] All files deleted from disk')
      
      // Step 2: Clear all storage
      console.log('[SETTINGS] Clearing storage...')
      
      // Clear localStorage synchronously
      try {
        localStorage.clear()
        console.log('[SETTINGS] localStorage.clear() called')
      } catch (e) {
        console.warn('[SETTINGS] Could not clear localStorage directly:', e)
      }
      
      // Step 3: Force clear Zustand store state
      console.log('[SETTINGS] Resetting store state...')
      useStore.setState({
        receipts: [],
        transactions: [],
        custodyExpenses: [],
        invoices: [],
      })
      console.log('[SETTINGS] Store state cleared')
      
      // Step 4: Reset gamification state
      store.resetProgress()
      console.log('[SETTINGS] Gamification progress reset')
      
      // Step 5: Clear IndexedDB if present
      if (typeof indexedDB !== 'undefined') {
        try {
          indexedDB.deleteDatabase('thomas-books-fs')
          console.log('[SETTINGS] IndexedDB cleared')
        } catch (error) {
          console.warn('[SETTINGS] Could not clear IndexedDB:', error)
        }
      }
      
      // Step 6: For Electron, clear session storage (async but don't wait)
      if (isElectron()) {
        clearAllAppData().then(() => {
          console.log('[SETTINGS] Electron session storage cleared')
        }).catch(err => {
          console.error('[SETTINGS] Error clearing Electron session:', err)
        })
      }
      
      // Step 7: Minimal delay then reload
      console.log('[SETTINGS] Reloading page in 500ms...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Force hard reload to bypass cache
      window.location.href = window.location.href
    } catch (error) {
      console.error('[SETTINGS] Error during data deletion:', error)
      alert('Error deleting data files. Some files may not have been deleted. Check console for details.')
    }
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your app settings and data</p>
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
          <div className="space-y-4">
            <Input
              label="Business Name"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value)
                setBusinessInfoSaved(false)
              }}
            />
            
            {/* Job Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Briefcase className="inline h-4 w-4 mr-1" />
                Job Type / Specialization
              </label>
              <select
                value={store.userProgress.selectedTechPath || ''}
                onChange={(e) => {
                  const newPath = e.target.value as TechTreePath
                  store.selectTechPath(newPath)
                  
                  // Also update businessType to match
                  const selectedLabel = JOB_TYPE_LABELS[newPath]
                  if (selectedLabel) {
                    store.setBusinessType(selectedLabel)
                  }
                  
                  setJobTypeChanged(true)
                  setTimeout(() => setJobTypeChanged(false), 2000)
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select your business type...</option>
                {(Object.entries(JOB_TYPE_LABELS) as [TechTreePath, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {jobTypeChanged && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ Job type updated! This guides your feature recommendations.
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This helps us customize features and expense categories for your business
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomJobDialog(true)}
                className="mt-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Describe Your Job & Let AI Match
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            {businessInfoSaved ? (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Business information saved
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You have unsaved changes
              </p>
            )}
            <Button
              onClick={() => {
                store.setBusinessName(businessName)
                setBusinessInfoSaved(true)
              }}
              disabled={businessInfoSaved}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {businessInfoSaved ? 'Saved' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fiscal Year Configuration */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fiscal Year Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fiscal Year Type
                </label>
                <Select
                  value={fiscalYearType}
                  onChange={(e) => {
                    setFiscalYearType(e.target.value as 'calendar' | 'custom')
                    setFiscalYearSaved(false)
                  }}
                  options={[
                    { value: 'calendar', label: 'Calendar Year (Jan 1 - Dec 31)' },
                    { value: 'custom', label: 'Custom Fiscal Year' }
                  ]}
                />
              </div>

              {fiscalYearType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fiscal Year Start Month
                  </label>
                  <Select
                    value={fiscalYearStartMonth.toString()}
                    onChange={(e) => {
                      setFiscalYearStartMonth(parseInt(e.target.value))
                      setFiscalYearSaved(false)
                    }}
                    options={monthNames.map((month, index) => ({
                      value: (index + 1).toString(),
                      label: month
                    }))}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {fiscalYearSaved ? (
                  <span className="text-green-600 dark:text-green-400">✓ Fiscal year configuration saved</span>
                ) : (
                  'You have unsaved changes'
                )}
              </p>
              <Button
                onClick={async () => {
                  store.setFiscalYearType(fiscalYearType)
                  store.setFiscalYearStartMonth(fiscalYearStartMonth)
                  setFiscalYearSaved(true)

                  // Award XP for fiscal year setup (one-time)
                  await useStore().completeAction('setFiscalYear')
                }}
                disabled={fiscalYearSaved}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {fiscalYearSaved ? 'Saved' : 'Save Changes'}
              </Button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Fiscal year settings affect all reports and tax calculations. 
                {fiscalYearType === 'custom' && ` Your fiscal year runs from ${monthNames[fiscalYearStartMonth - 1]} to ${monthNames[(fiscalYearStartMonth + 10) % 12]}.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {store.darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
            </div>
            <Button
              variant={store.darkMode ? "primary" : "outline"}
              onClick={store.toggleDarkMode}
              size="sm"
            >
              {store.darkMode ? (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </>
              )}
            </Button>
          </div>
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

      {/* Vendor Defaults */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Vendor Category Defaults
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VendorDefaultsManager />
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
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{store.transactions.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{store.custodyExpenses.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Custody Expenses</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{store.invoices.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Invoices</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{store.receipts.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receipts</p>
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
            <div className="p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <FolderArchive className="h-5 w-5" />
                Complete Project Export/Import
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
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
              <div className="mt-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>Export includes:</strong> All JSON data files, all receipt images, folder structure</p>
                <p><strong>File format:</strong> ZIP archive containing complete project</p>
              </div>
            </div>

            {/* DISABLED: Legacy JSON Export/Import - Not comprehensive, use Complete Project Export/Import instead
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
            */}
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
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-800 dark:text-red-200 font-medium mb-4">
                Are you sure? This will permanently delete ALL your data including:
              </p>
              <ul className="list-disc list-inside text-red-700 dark:text-red-300 text-sm mb-4">
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
            <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
              <div>
                <h4 className="font-medium text-red-600 dark:text-red-400">Clear All Data</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Permanently delete all stored data</p>
              </div>
              <Button variant="destructive" onClick={() => setShowConfirmClear(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Custom Job Description Dialog */}
      {showCustomJobDialog && (
        <CustomJobDescriptionDialog
          onPathSelected={(path) => {
            store.selectTechPath(path)
            setShowCustomJobDialog(false)
            setJobTypeChanged(true)
            setTimeout(() => setJobTypeChanged(false), 3000)
          }}
          onCustomPathSelected={(nodes) => {
            store.selectCustomPath(nodes)
            setShowCustomJobDialog(false)
            setJobTypeChanged(true)
            setTimeout(() => setJobTypeChanged(false), 3000)
          }}
          onCancel={() => setShowCustomJobDialog(false)}
        />
      )}
    </div>
  )
}
