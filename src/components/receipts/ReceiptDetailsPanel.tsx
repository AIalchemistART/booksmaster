'use client'

import { Receipt } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Calendar, DollarSign, CreditCard, Tag, Globe, FileStack } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ReceiptDetailsPanelProps {
  receipt: Receipt
}

export function ReceiptDetailsPanel({ receipt }: ReceiptDetailsPanelProps) {
  // Calculate if breakdown adds up correctly
  const hasBreakdown = receipt.ocrSubtotal !== undefined && receipt.ocrTax !== undefined
  const calculatedTotal = (receipt.ocrSubtotal || 0) + (receipt.ocrTax || 0) + (receipt.ocrTip || 0)
  const totalMatches = receipt.ocrAmount !== undefined && Math.abs(calculatedTotal - receipt.ocrAmount) < 0.02

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Receipt Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendor</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {receipt.ocrVendor || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {receipt.ocrDate ? formatDate(receipt.ocrDate) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Amount Breakdown */}
          {hasBreakdown && (
            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Amount Breakdown
                {totalMatches && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓ Verified</span>
                )}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(receipt.ocrSubtotal || 0)}</span>
                </div>
                
                {receipt.ocrTax !== undefined && receipt.ocrTax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Tax
                      {receipt.ocrTaxRate && (
                        <span className="ml-1 text-xs">({(receipt.ocrTaxRate * 100).toFixed(2)}%)</span>
                      )}:
                    </span>
                    <span className="font-medium">{formatCurrency(receipt.ocrTax)}</span>
                  </div>
                )}
                
                {receipt.ocrTip !== undefined && receipt.ocrTip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Tip
                      {receipt.ocrTipPercentage && (
                        <span className="ml-1 text-xs">({(receipt.ocrTipPercentage * 100).toFixed(0)}%)</span>
                      )}:
                    </span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(receipt.ocrTip)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm font-bold pt-2 border-t dark:border-gray-700">
                  <span className="text-gray-900 dark:text-gray-100">Total:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatCurrency(receipt.ocrAmount || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Single amount if no breakdown */}
          {!hasBreakdown && receipt.ocrAmount !== undefined && (
            <div className="border-t dark:border-gray-700 pt-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Amount:
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(receipt.ocrAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Info */}
          {(receipt.ocrPaymentMethod || receipt.ocrCardLastFour) && (
            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Payment Method
              </p>
              <div className="flex items-center gap-2">
                {receipt.ocrPaymentMethod && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    {receipt.ocrPaymentMethod}
                  </span>
                )}
                {receipt.ocrCardLastFour && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-sm font-mono">
                    •••• {receipt.ocrCardLastFour}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Currency Info */}
          {receipt.currency && receipt.currency !== 'USD' && (
            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Currency
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-sm font-medium">
                  {receipt.currencySymbol || ''} {receipt.currency}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Foreign currency - verify conversion
                </span>
              </div>
            </div>
          )}

          {/* Multi-page indicator */}
          {receipt.isMultiPage && (
            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <FileStack className="h-3 w-3" />
                Multi-Page Receipt
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded text-sm">
                  Page {receipt.pageNumber || '?'} of {receipt.totalPages || '?'}
                </span>
                {receipt.pageNumber && receipt.totalPages && receipt.pageNumber < receipt.totalPages && (
                  <span className="text-xs text-purple-600 dark:text-purple-400">
                    ⚠️ Additional pages may exist
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Document Type */}
          {receipt.documentType && (
            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Document Type
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded text-sm capitalize">
                    {receipt.documentType.replace(/_/g, ' ')}
                  </span>
                  {receipt.documentTypeConfidence && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {(receipt.documentTypeConfidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Return/Refund Badge */}
          {receipt.isReturn && (
            <div className="border-t dark:border-gray-700 pt-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-1">
                  🔄 Return/Refund
                </p>
                {receipt.originalReceiptNumber && (
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Original Receipt: {receipt.originalReceiptNumber}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Line Items */}
          {receipt.ocrLineItems && receipt.ocrLineItems.length > 0 && (
            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Line Items ({receipt.ocrLineItems.length})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {receipt.ocrLineItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {item.description}
                      </p>
                      {item.quantity && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Qty: {item.quantity}
                        </p>
                      )}
                    </div>
                    {item.price !== undefined && (
                      <span className="font-medium text-gray-900 dark:text-gray-100 ml-2">
                        {formatCurrency(item.price)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
