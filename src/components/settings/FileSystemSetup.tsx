'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  setupFileSystemStorage, 
  isFileSystemAccessSupported,
  isFileSystemConfigured,
  getConfiguredFolderPath,
  createFullBackup
} from '@/lib/file-system-storage'
import { useStore } from '@/store'
import { FolderOpen, Check, AlertCircle, Download } from 'lucide-react'

export function FileSystemSetup() {
  const [configured, setConfigured] = useState(false)
  const [checking, setChecking] = useState(true)
  const [setting, setSetting] = useState(false)
  const [backing, setBacking] = useState(false)
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const supported = isFileSystemAccessSupported()
  
  const store = useStore()

  useEffect(() => {
    checkConfiguration()
  }, [])

  const checkConfiguration = async () => {
    setChecking(true)
    const isConfigured = await isFileSystemConfigured()
    setConfigured(isConfigured)
    if (isConfigured) {
      const path = await getConfiguredFolderPath()
      setFolderPath(path)
    }
    setChecking(false)
  }

  const handleSetup = async () => {
    setSetting(true)
    const success = await setupFileSystemStorage()
    if (success) {
      setConfigured(true)
      
      // Perform initial backup of all existing data
      const allData = {
        receipts: store.receipts,
        invoices: store.invoices,
        transactions: store.transactions,
        custodyExpenses: store.custodyExpenses,
        bankAccounts: store.bankAccounts,
        exportDate: new Date().toISOString(),
      }
      await createFullBackup(allData)
    }
    setSetting(false)
  }

  const handleBackupNow = async () => {
    setBacking(true)
    const allData = {
      receipts: store.receipts,
      invoices: store.invoices,
      transactions: store.transactions,
      custodyExpenses: store.custodyExpenses,
      bankAccounts: store.bankAccounts,
      exportDate: new Date().toISOString(),
    }
    await createFullBackup(allData)
    setBacking(false)
  }

  if (checking) {
    return (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Checking file system configuration...</p>
      </div>
    )
  }

  if (!supported) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-yellow-900">File System Access Not Supported</h3>
            <p className="text-sm text-yellow-800 mt-1">
              Your browser doesn&apos;t support the File System Access API. Please use a Chromium-based browser (Chrome, Edge, Brave) for local file system storage.
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              Data will continue to be saved to browser localStorage as a fallback.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Local File System Storage</h3>
          <p className="text-sm text-gray-600">
            Automatically save all data to a local folder on your computer
          </p>
        </div>
        {configured && (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
            <Check className="h-3 w-3" />
            Configured
          </span>
        )}
      </div>

      {!configured ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Setup Required</h4>
          <p className="text-sm text-blue-800 mb-3">
            Choose a folder on your computer where Thomas Books will save all your data. 
            We recommend creating a new folder like <code className="bg-blue-100 px-1 rounded">C:\Users\YourName\Documents\Thomas-Books</code>
          </p>
          <p className="text-xs text-blue-700 mb-4">
            The following folder structure will be created:
          </p>
          <ul className="text-xs text-blue-700 space-y-1 mb-4 font-mono bg-blue-100 p-3 rounded">
            <li>📁 receipts/</li>
            <li className="ml-4">📁 images/ (receipt photos)</li>
            <li className="ml-4">📁 data/ (receipt metadata)</li>
            <li>📁 invoices/</li>
            <li>📁 transactions/</li>
            <li>📁 custody-expenses/</li>
            <li>📁 reports/</li>
            <li>📁 backups/ (daily full backups)</li>
          </ul>
          <Button onClick={handleSetup} disabled={setting}>
            <FolderOpen className="h-4 w-4 mr-2" />
            {setting ? 'Setting up...' : 'Choose Folder & Setup'}
          </Button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-900 mb-2">File System Connected</h4>
          <p className="text-sm text-green-800 mb-3">
            All changes are automatically saved to your local file system in real-time.
          </p>
          <div className="bg-white border border-green-300 rounded px-3 py-2 mb-3">
            <p className="text-xs text-gray-500 mb-1">Selected Folder:</p>
            <p className="text-sm font-mono text-gray-900">{folderPath || 'No folder selected'}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBackupNow} disabled={backing}>
              <Download className="h-4 w-4 mr-2" />
              {backing ? 'Creating Backup...' : 'Create Backup Now'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleSetup}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Change Folder
            </Button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
        <p><strong>How it works:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Every receipt, invoice, and transaction is automatically saved to your chosen folder</li>
          <li>Receipt images are saved as separate JPG files with metadata</li>
          <li>All data is saved as human-readable JSON files</li>
          <li>Daily backups are created automatically</li>
          <li>Data remains synced with browser localStorage as a fallback</li>
        </ul>
        <p className="mt-2"><strong>Privacy:</strong> All data stays on your computer. Nothing is uploaded to the cloud.</p>
      </div>
    </div>
  )
}
