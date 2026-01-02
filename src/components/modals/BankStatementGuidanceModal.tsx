import { X, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BankStatementGuidanceModalProps {
  isOpen: boolean
  onClose: () => void
  transactionAmount: number
  transactionDate: string
  isLargeAmount: boolean
}

export function BankStatementGuidanceModal({ 
  isOpen, 
  onClose, 
  transactionAmount,
  transactionDate,
  isLargeAmount 
}: BankStatementGuidanceModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Bank Statement / Deposit Documentation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status indicator */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <strong>✓ Bank statements ARE IRS-acceptable documentation</strong> for income.
              However, additional notes strengthen your audit defense and prevent double-counting.
            </p>
          </div>

          {/* Large amount warning */}
          {isLargeAmount && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Large Cash Transaction (${transactionAmount.toLocaleString()})
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Banks report deposits over $10,000 to the IRS. For large deposits, enhanced documentation is especially important.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommended actions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              📋 Make Your Audit Defense Ironclad
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Add Customer/Client Name</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Who paid you? In an audit, you'll need to identify the source.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Describe the Job/Project</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    What work was this payment for? Be specific (e.g., "Kitchen remodel - 123 Main St").
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Select Income Source</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Was this cash, check, or bank transfer? This helps prevent duplicate counting.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Check for Duplicates</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    If this deposit is from a check you already recorded, link them to avoid double-counting.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Why this matters */}
          <div className="border-t dark:border-gray-700 pt-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              💡 Why This Matters
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span><strong>Memory fades:</strong> In 2 years, can you recall who paid ${transactionAmount.toLocaleString()} on {new Date(transactionDate).toLocaleDateString()}?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span><strong>IRS burden of proof:</strong> You must prove the deposit is legitimate business income.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span><strong>Duplicate prevention:</strong> Depositing a check shouldn't create two income entries.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span><strong>Audit confidence:</strong> Good notes = stress-free audit defense.</span>
              </li>
            </ul>
          </div>

          {/* Action button */}
          <div className="border-t dark:border-gray-700 pt-4">
            <Button 
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Got It - I'll Add Details Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
