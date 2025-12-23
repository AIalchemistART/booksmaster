'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { setupFileSystemStorage } from '@/lib/file-system-storage'
import { FolderOpen, AlertCircle, X } from 'lucide-react'

interface FileSystemRequiredModalProps {
  onSetupComplete: () => void
  onCancel?: () => void
}

export function FileSystemRequiredModal({ onSetupComplete, onCancel }: FileSystemRequiredModalProps) {
  const [setting, setSetting] = useState(false)

  const handleSetup = async () => {
    setSetting(true)
    const success = await setupFileSystemStorage()
    setSetting(false)
    
    if (success) {
      onSetupComplete()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Setup Local Storage Folder
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Before you can save data, you need to choose a folder on your computer where Thomas Books will store all your files.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">What we'll create:</h4>
                <ul className="text-xs text-blue-700 space-y-1 font-mono bg-blue-100 p-3 rounded">
                  <li>📁 receipts/ (images & data)</li>
                  <li>📁 invoices/</li>
                  <li>📁 transactions/</li>
                  <li>📁 custody-expenses/</li>
                  <li>📁 reports/</li>
                  <li>📁 backups/</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-800 space-y-2">
                    <div>
                      <strong>Important:</strong> Create a NEW folder first!
                    </div>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open File Explorer</li>
                      <li>Go to your Documents folder</li>
                      <li>Create a new folder called "Thomas-Books"</li>
                      <li>Click "Choose Folder" below and select that folder</li>
                    </ol>
                    <div className="mt-2 pt-2 border-t border-yellow-300">
                      <strong>Path example:</strong>
                      <br />
                      <code className="bg-yellow-100 px-1 rounded text-xs">C:\Users\YourName\Documents\Thomas-Books</code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSetup} disabled={setting} className="flex-1">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {setting ? 'Setting up...' : 'Choose Folder'}
                </Button>
                {onCancel && (
                  <Button variant="outline" onClick={onCancel} disabled={setting}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                <strong>Privacy:</strong> All data stays on your computer. Nothing is uploaded to the cloud.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
