'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tooltip } from '@/components/ui/Tooltip'
import { useStore } from '@/store'
import { Settings, Download, Upload, Trash2, AlertTriangle, Cpu, HardDrive, FolderArchive, Save, Moon, Sun, Calendar, Briefcase, Sparkles, Check, FileText, Table, FileSpreadsheet, Loader2, ArrowDown, X, Plus, Search, Heart, ExternalLink, Github, Coffee } from 'lucide-react'
import { GeminiApiKeySettings } from '@/components/settings/GeminiApiKeySettings'
import { FileSystemSetup } from '@/components/settings/FileSystemSetup'
import { GeminiApiKeyRequiredModal } from '@/components/modals/GeminiApiKeyRequiredModal'
import { DataIntegrityCheck } from '@/components/settings/DataIntegrityCheck'
import { lookupNAICS, type NAICSResult } from '@/lib/naics-lookup'
// import { VendorDefaultsManager } from '@/components/settings/VendorDefaultsManager' // COMMENTED OUT: Vendor defaults removed - AI learning handles this
import { JobTypeSelector } from '@/components/settings/JobTypeSelector'
import { JOB_TYPE_LABELS, type TechTreePath } from '@/lib/gamification/leveling-system'
import { CustomJobDescriptionDialog } from '@/components/gamification/CustomJobDescriptionDialog'
import { exportCompleteProject, importCompleteProject } from '@/lib/project-export-import'
import { deleteAllFiles, clearAllAppData, isElectron } from '@/lib/file-system-adapter'
import { FirstVisitIntro, useFirstVisit } from '@/components/gamification/FirstVisitIntro'
import { downloadScheduleC } from '@/lib/export/schedule-c-csv'
import { downloadExcel } from '@/lib/export/excel-export'
import { downloadQuickBooksIIF } from '@/lib/export/quickbooks-iif'
import { logger } from '@/lib/logger'
import { downloadReceiptArchive } from '@/lib/export/pdf-receipt-archive'

export default function SettingsPage() {
  const store = useStore()
  const { showIntro, closeIntro } = useFirstVisit('settings')
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [businessName, setBusinessName] = useState(store.businessName)
  const [fiscalYearType, setFiscalYearType] = useState(store.fiscalYearType)

  // Handle scroll to section via localStorage
  useEffect(() => {
    logger.debug('[SETTINGS PAGE] useEffect triggered')
    logger.debug('[SETTINGS PAGE] Checking localStorage for scrollToSection')
    
    const scrollTo = localStorage.getItem('scrollToSection')
    logger.debug('[SETTINGS PAGE] localStorage scrollToSection value:', scrollTo)
    
    if (scrollTo) {
      logger.debug('[SETTINGS PAGE] Found scroll target:', scrollTo)
      setScrollTarget(scrollTo)
      setShowScrollIndicator(true)
      logger.debug('[SETTINGS PAGE] Clearing localStorage flag')
      localStorage.removeItem('scrollToSection')
    } else {
      logger.debug('[SETTINGS PAGE] No scroll target in localStorage')
    }
  }, [])
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(store.fiscalYearStartMonth)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [businessInfoSaved, setBusinessInfoSaved] = useState(true)
  const [fiscalYearSaved, setFiscalYearSaved] = useState(true)
  const [jobTypeChanged, setJobTypeChanged] = useState(false)
  const [showCustomJobDialog, setShowCustomJobDialog] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [scrollTarget, setScrollTarget] = useState<string | null>(null)
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
  
  // NAICS editing state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [naicsDescription, setNaicsDescription] = useState('')
  const [naicsLoading, setNaicsLoading] = useState(false)
  const [naicsError, setNaicsError] = useState('')
  const [additionalNaicsResults, setAdditionalNaicsResults] = useState<NAICSResult[]>([])
  const [showAddNaicsForm, setShowAddNaicsForm] = useState(false)
  const [showReplacePrimaryForm, setShowReplacePrimaryForm] = useState(false)
  const [replacePrimaryDescription, setReplacePrimaryDescription] = useState('')
  const [replacePrimaryLoading, setReplacePrimaryLoading] = useState(false)
  const [replacePrimaryError, setReplacePrimaryError] = useState('')
  
  // Get available years from transactions
  const yearSet = new Set<number>(store.transactions.map((t: any) => new Date(t.date).getFullYear()))
  const availableYears: number[] = Array.from(yearSet).sort((a, b) => b - a)
  const currentYear = new Date().getFullYear()
  
  // Determine the most recent year with transactions, fallback to current year
  const mostRecentYear = availableYears.length > 0 ? availableYears[0] : currentYear
  
  // Add current year to dropdown if no transactions exist
  if (availableYears.length === 0) {
    availableYears.push(currentYear)
  }
  
  const [exportYear, setExportYear] = useState(mostRecentYear.toString())

  // Sync export year when transactions change (e.g., after data loads)
  useEffect(() => {
    const txYears = new Set<number>(store.transactions.map((t: any) => new Date(t.date).getFullYear()))
    const sortedYears = Array.from(txYears).sort((a, b) => b - a)
    const newMostRecentYear = sortedYears.length > 0 ? sortedYears[0] : new Date().getFullYear()
    setExportYear(newMostRecentYear.toString())
  }, [store.transactions.length])

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
      logger.debug('[SETTINGS] Starting complete data deletion...')
      
      // Step 1: Delete all files from disk first (before clearing state)
      logger.debug('[SETTINGS] Deleting files from disk...')
      await deleteAllFiles()
      logger.debug('[SETTINGS] All files deleted from disk')
      
      // Step 2: Clear all storage
      logger.debug('[SETTINGS] Clearing storage...')
      
      // Clear localStorage synchronously
      try {
        localStorage.clear()
        logger.debug('[SETTINGS] localStorage.clear() called')
      } catch (e) {
        console.warn('[SETTINGS] Could not clear localStorage directly:', e)
      }
      
      // Step 3: Force clear Zustand store state
      logger.debug('[SETTINGS] Resetting store state...')
      useStore.setState({
        receipts: [],
        transactions: [],
        custodyExpenses: [],
        invoices: [],
      })
      logger.debug('[SETTINGS] Store state cleared')
      
      // Step 4: Reset gamification state
      store.resetProgress()
      logger.debug('[SETTINGS] Gamification progress reset')
      
      // Step 5: Clear IndexedDB if present
      if (typeof indexedDB !== 'undefined') {
        try {
          indexedDB.deleteDatabase('thomas-books-fs')
          logger.debug('[SETTINGS] IndexedDB cleared')
        } catch (error) {
          console.warn('[SETTINGS] Could not clear IndexedDB:', error)
        }
      }
      
      // Step 6: For Electron, clear session storage (async but don't wait)
      if (isElectron()) {
        clearAllAppData().then(() => {
          logger.debug('[SETTINGS] Electron session storage cleared')
        }).catch(err => {
          console.error('[SETTINGS] Error clearing Electron session:', err)
        })
      }
      
      // Step 7: Minimal delay then reload
      logger.debug('[SETTINGS] Reloading page in 500ms...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Force hard reload to bypass cache
      window.location.href = window.location.href
    } catch (error) {
      console.error('[SETTINGS] Error during data deletion:', error)
      alert('Error deleting data files. Some files may not have been deleted. Check console for details.')
    }
  }


  const year = parseInt(exportYear)
  const yearTransactions = store.transactions.filter((t: any) => {
    const txYear = new Date(t.date).getFullYear()
    return txYear === year && !t.isDuplicateOfLinked
  })

  const handlePDFExport = async () => {
    setExportingPDF(true)
    setPdfError(null)
    try {
      await downloadReceiptArchive(store.receipts, store.transactions, year)
      await store.completeAction('firstExport')
      store.unlockAchievement('tax_ready')
    } catch (error) {
      console.error('PDF export failed:', error)
      setPdfError(error instanceof Error ? error.message : 'Failed to generate PDF')
    } finally {
      setExportingPDF(false)
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

  const handleScrollToTarget = () => {
    if (scrollTarget) {
      const element = document.getElementById(scrollTarget)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Keep indicator visible after manual scroll
      }
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your app settings and data</p>
      </div>

      {/* Scroll Indicator Banner */}
      {showScrollIndicator && scrollTarget === 'advanced-exports' && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg border-2 border-purple-300 dark:border-purple-700 shadow-lg relative animate-pulse">
          <button
            onClick={() => setShowScrollIndicator(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="flex items-center gap-4 pr-8">
            <div className="flex flex-col items-center">
              <ArrowDown className="h-8 w-8 text-white animate-bounce" />
              <ArrowDown className="h-6 w-6 text-white animate-bounce" style={{ animationDelay: '150ms' }} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-white mb-1">Looking for Advanced Exports?</p>
              <p className="text-sm text-white/90">Scroll down to find Schedule C, QuickBooks, Excel, and PDF exports</p>
            </div>
            <Button
              onClick={handleScrollToTarget}
              variant="outline"
              className="bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-white dark:border-purple-400 shadow-md"
            >
              Scroll Now
            </Button>
          </div>
        </div>
      )}

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
            
            {/* Business Information (NAICS System) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Type & Tax Classification
              </label>
              {store.userProgress?.businessInfo ? (
                <div className="space-y-3">
                  {/* Primary Business */}
                  {!showReplacePrimaryForm ? (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">PRIMARY BUSINESS</p>
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                            {store.userProgress.businessInfo.naicsTitle}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            NAICS Code: {store.userProgress.businessInfo.naicsCode} • {store.userProgress.businessInfo.sector}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                            {store.userProgress.businessInfo.description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReplacePrimaryForm(true)}
                          className="border-blue-300 dark:border-blue-700"
                        >
                          Replace
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <label className="block text-sm font-medium text-blue-800 dark:text-blue-200">
                        Replace Primary Business
                      </label>
                      <textarea
                        placeholder="Describe your primary business activity (e.g., residential remodeling contractor)"
                        value={replacePrimaryDescription}
                        onChange={(e) => setReplacePrimaryDescription(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        rows={2}
                        disabled={replacePrimaryLoading}
                      />
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!replacePrimaryDescription.trim()) {
                              setReplacePrimaryError('Please describe your primary business')
                              return
                            }
                            
                            // Check if API key exists
                            const currentApiKey = localStorage.getItem('gemini-api-key')
                            if (!currentApiKey) {
                              setShowApiKeyModal(true)
                              return
                            }
                            
                            setReplacePrimaryLoading(true)
                            setReplacePrimaryError('')
                            
                            try {
                              const result = await lookupNAICS(replacePrimaryDescription)
                              // Update store with new primary business info
                              store.setBusinessInfo(result.code, result.title, result.description, result.sector)
                              setReplacePrimaryDescription('')
                              setShowReplacePrimaryForm(false)
                              setBusinessInfoSaved(false)
                            } catch (error) {
                              console.error('NAICS lookup error:', error)
                              setReplacePrimaryError('Could not find NAICS code. Please try a different description.')
                            } finally {
                              setReplacePrimaryLoading(false)
                            }
                          }}
                          disabled={replacePrimaryLoading || !replacePrimaryDescription.trim()}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Search className="h-4 w-4 mr-2" />
                          {replacePrimaryLoading ? 'Finding...' : 'Find & Replace'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowReplacePrimaryForm(false)
                            setReplacePrimaryDescription('')
                            setReplacePrimaryError('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      {replacePrimaryError && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {replacePrimaryError}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Additional Income Sources */}
                  {additionalNaicsResults.map((result, index) => (
                    <div key={index} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">ADDITIONAL INCOME SOURCE {index + 1}</p>
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                            {result.title}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            NAICS Code: {result.code} • {result.sector}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdditionalNaicsResults(additionalNaicsResults.filter((_, i) => i !== index))
                            setBusinessInfoSaved(false)
                          }}
                          className="border-green-300 dark:border-green-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Another Business Form */}
                  {additionalNaicsResults.length < 3 && (
                    <div>
                      {!showAddNaicsForm ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddNaicsForm(true)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Another Business/Income Source
                        </Button>
                      ) : (
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Describe Additional Income Source
                          </label>
                          <textarea
                            placeholder="e.g., I also do gig driving for Uber on weekends"
                            value={naicsDescription}
                            onChange={(e) => setNaicsDescription(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            rows={2}
                            disabled={naicsLoading}
                          />
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!naicsDescription.trim()) {
                                  setNaicsError('Please describe your additional income source')
                                  return
                                }
                                
                                // Check if API key exists
                                const currentApiKey = localStorage.getItem('gemini-api-key')
                                if (!currentApiKey) {
                                  setShowApiKeyModal(true)
                                  return
                                }
                                
                                setNaicsLoading(true)
                                setNaicsError('')
                                
                                try {
                                  const result = await lookupNAICS(naicsDescription)
                                  setAdditionalNaicsResults([...additionalNaicsResults, result])
                                  setNaicsDescription('')
                                  setShowAddNaicsForm(false)
                                  setBusinessInfoSaved(false)
                                } catch (error) {
                                  console.error('NAICS lookup error:', error)
                                  setNaicsError('Could not find NAICS code. Please try a different description.')
                                } finally {
                                  setNaicsLoading(false)
                                }
                              }}
                              disabled={naicsLoading || !naicsDescription.trim()}
                              className="flex-1"
                            >
                              <Search className="h-4 w-4 mr-2" />
                              {naicsLoading ? 'Finding...' : 'Find Business Code'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowAddNaicsForm(false)
                                setNaicsDescription('')
                                setNaicsError('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                          
                          {naicsError && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {naicsError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {additionalNaicsResults.length >= 3 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Maximum of 3 additional income sources (4 total including primary).
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 This information appears on your Schedule C (Lines B & C). You can add multiple income sources here for better tax categorization.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ No business information set. Please complete the onboarding wizard.
                  </p>
                </div>
              )}
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

      {/* COMMENTED OUT: Vendor Defaults - AI learning handles this now
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
      */}

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
          <Tooltip content="Overview of all data stored in your bookkeeping system. This shows how much information you've tracked across different categories." position="right">
            <CardTitle className="cursor-help">Data Summary</CardTitle>
          </Tooltip>
        </CardHeader>
        <CardContent>
          {(() => {
            const transactionCount = store.transactions.length
            const supportingDocCount = store.receipts.filter((r: any) => r.isSupplementalDoc).length
            const totalReceiptCount = store.receipts.length
            // Equation should be: Transactions + Supporting Docs = Total Receipts (79 + 8 = 87)
            const isBalanced = (transactionCount + supportingDocCount) === totalReceiptCount
            
            return (
              <div className="flex items-center justify-center gap-2 md:gap-3">
                {/* Transactions */}
                <Tooltip content="Income and expense entries in your ledger. These are the core financial records that determine your profit/loss and tax liability." position="top">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center cursor-help flex-shrink-0 w-24 md:w-32">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{transactionCount}</p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Transactions</p>
                  </div>
                </Tooltip>

                {/* Plus sign */}
                <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 flex-shrink-0">+</div>

                {/* Supporting Documents */}
                <Tooltip content="Supplemental documentation like invoices, manifests, and payment confirmations. These provide additional audit proof for your transactions." position="top">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center cursor-help flex-shrink-0 w-24 md:w-32">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{supportingDocCount}</p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Supporting Docs</p>
                  </div>
                </Tooltip>

                {/* Equals sign */}
                <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 flex-shrink-0">=</div>

                {/* Total Receipts (color-coded based on equation balance) */}
                <Tooltip content={`Total scanned receipts (primary + supporting docs). ${isBalanced ? '✓ Balanced: Equation matches (Transactions + Supporting Docs = Total Receipts)' : '⚠️ Unbalanced: Data integrity issue detected'}`} position="top">
                  <div className={`p-4 rounded-lg text-center cursor-help flex-shrink-0 w-24 md:w-32 ${
                    isBalanced 
                      ? 'bg-green-50 dark:bg-green-950/30 border-2 border-green-500 dark:border-green-600' 
                      : 'bg-red-50 dark:bg-red-950/30 border-2 border-red-500 dark:border-red-600'
                  }`}>
                    <p className={`text-2xl font-bold ${
                      isBalanced 
                        ? 'text-green-700 dark:text-green-400' 
                        : 'text-red-700 dark:text-red-400'
                    }`}>{totalReceiptCount}</p>
                    <p className={`text-xs md:text-sm ${
                      isBalanced 
                        ? 'text-green-600 dark:text-green-500' 
                        : 'text-red-600 dark:text-red-500'
                    }`}>Receipts</p>
                  </div>
                </Tooltip>

                {/* Divider */}
                <div className="h-12 w-px bg-gray-300 dark:bg-gray-600 mx-2 flex-shrink-0"></div>

                {/* Invoices (far right) */}
                <Tooltip content="Client invoices you've created and sent. Track outstanding payments and income collected throughout the year." position="top">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center cursor-help flex-shrink-0 w-24 md:w-32">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{store.invoices.length}</p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Invoices</p>
                  </div>
                </Tooltip>
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Data Integrity Check */}
      <DataIntegrityCheck />

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

      {/* Advanced Exports */}
      <Card id="advanced-exports" className="mb-8 border-purple-200 dark:border-purple-800 scroll-mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <Download className="h-5 w-5" />
            Advanced Exports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Export your financial data in various formats for tax software, accounting platforms, or detailed analysis.
          </p>

          {/* Year Selector */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Tax Year
            </label>
            <Select
              value={exportYear}
              onChange={(e) => setExportYear(e.target.value)}
              options={availableYears.map(y => ({ value: y.toString(), label: y.toString() }))}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {yearTransactions.length} transactions in {exportYear}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Schedule C CSV */}
            <div className="p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-start gap-3 mb-3">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">Schedule C (CSV)</h4>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    Tax-ready format for IRS Schedule C. Import into TurboTax, H&R Block, or tax software.
                  </p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  downloadScheduleC(store.transactions, year)
                  await store.completeAction('exportScheduleC')
                  store.unlockAchievement('tax_ready')
                }}
                disabled={yearTransactions.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Schedule C
              </Button>
            </div>

            {/* Excel Workbook */}
            <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-start gap-3 mb-3">
                <Table className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Simple Ledger (Excel)</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Lightweight tab-separated format with transactions, monthly summaries, and category analysis. Simpler alternative to the comprehensive tax report.
                  </p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  downloadExcel(store.transactions, store.receipts, year)
                  await store.completeAction('firstExport')
                  store.unlockAchievement('tax_ready')
                }}
                disabled={yearTransactions.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Simple Ledger
              </Button>
            </div>

            {/* QuickBooks IIF */}
            <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-start gap-3 mb-3">
                <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">QuickBooks (IIF)</h4>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Import into QuickBooks Desktop. Categories auto-map to QB accounts.
                  </p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  downloadQuickBooksIIF(store.transactions, year)
                  await store.completeAction('firstExport')
                  store.unlockAchievement('tax_ready')
                }}
                disabled={yearTransactions.length === 0}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download QuickBooks
              </Button>
            </div>

            {/* PDF Receipt Archive */}
            <div className="p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-start gap-3 mb-3">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">PDF Receipt Archive</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Complete backup archive with all receipt images organized chronologically.
                  </p>
                </div>
              </div>
              {pdfError && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                  {pdfError}
                </div>
              )}
              <Button
                onClick={handlePDFExport}
                disabled={exportingPDF || store.receipts.length === 0}
                className="w-full bg-amber-600 hover:bg-amber-700"
                size="sm"
              >
                {exportingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF Archive
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-purple-900 dark:text-purple-200">
              <strong>💡 Tip:</strong> For giving to your accountant or tax preparer, use the Excel Tax Report and PDF Receipt Packet from the <strong>Reports</strong> page instead. These advanced exports are for self-filers or QuickBooks migration.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Support Development */}
      <Card className="mb-8 border-gold/30 bg-gradient-to-br from-purple-50 to-gold/10 dark:from-purple-950/30 dark:to-gold/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <Heart className="h-5 w-5 text-gold" />
            Support Development
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Booksmaster is <strong className="text-purple-900 dark:text-purple-100">100% free and open source</strong> under the MIT License.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If this software saves you money at tax time, please consider supporting development with a donation. Every contribution helps fund new features, bug fixes, and hosting costs.
            </p>
          </div>

          <div className="space-y-3">
            {/* GitHub Sponsors */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.electronAPI) {
                  window.electronAPI.openExternal('https://github.com/sponsors/AIalchemistART')
                }
              }}
              className="w-full p-4 rounded-lg bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all group flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/60 transition-colors">
                <Github className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">GitHub Sponsors</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Monthly or one-time support</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
            </button>

            {/* Ko-fi */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.electronAPI) {
                  window.electronAPI.openExternal('https://ko-fi.com/aialchemistart')
                }
              }}
              className="w-full p-4 rounded-lg bg-white dark:bg-gray-800 border-2 border-[#FF5E5B]/30 hover:border-[#FF5E5B] hover:shadow-lg transition-all group flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-[#FF5E5B]/10 group-hover:bg-[#FF5E5B]/20 transition-colors">
                <Coffee className="w-5 h-5 text-[#FF5E5B]" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Ko-fi</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Buy me a coffee ☕</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#FF5E5B] transition-colors" />
            </button>

            {/* PayPal */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.electronAPI) {
                  window.electronAPI.openExternal('https://paypal.me/aialchemistart')
                }
              }}
              className="w-full p-4 rounded-lg bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all group flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852a.932.932 0 0 1 .922-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.72-4.428z" className="text-blue-500 dark:text-blue-400"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">PayPal</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">One-time donation</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </button>
          </div>

          <div className="mt-4 p-3 bg-gold/10 dark:bg-gold/5 rounded-lg border border-gold/30">
            <p className="text-xs text-gray-700 dark:text-gray-300 text-center">
              <strong className="text-gold">❤️ Thank you</strong> for supporting free, open-source software!
            </p>
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
      
      {/* API Key Modal */}
      {showApiKeyModal && (
        <GeminiApiKeyRequiredModal
          onSetupComplete={() => {
            logger.debug('[SETTINGS] API key setup complete')
            setShowApiKeyModal(false)
            store.unlockAchievement('api_connected')
          }}
          onSkip={() => {
            logger.debug('[SETTINGS] API key setup skipped')
            setShowApiKeyModal(false)
          }}
        />
      )}
      
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
