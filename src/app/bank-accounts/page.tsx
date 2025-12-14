'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useStore, generateId } from '@/store'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, Building2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { PlaidLinkButton } from '@/components/plaid/PlaidLink'
import type { BankAccount } from '@/types'

export default function BankAccountsPage() {
  const { bankAccounts, addBankAccount, removeBankAccount } = useStore()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handlePlaidSuccess = (accounts: any[], institutionName: string) => {
    const now = new Date().toISOString()
    
    accounts.forEach((account) => {
      const newAccount: BankAccount = {
        id: generateId(),
        plaidAccountId: account.id,
        institutionName,
        accountName: account.name,
        accountType: account.type,
        mask: account.mask,
        balance: account.balance,
        createdAt: now,
        updatedAt: now,
      }
      addBankAccount(newAccount)
    })
    
    setSuccessMessage(`Successfully connected ${accounts.length} account(s) from ${institutionName}`)
    setError(null)
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const handlePlaidError = (errorMessage: string) => {
    setError(errorMessage)
    setSuccessMessage(null)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-600 mt-1">Connect and manage bank accounts via Plaid</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Card className="mb-8 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-green-800">{successMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="mb-8 bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Connection Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plaid Setup Instructions */}
      <Card className="mb-8 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Plaid Bank Integration</h3>
          <p className="text-blue-800 text-sm mb-3">
            Connect your bank accounts securely via Plaid to automatically import transactions.
          </p>
          <details className="text-sm">
            <summary className="text-blue-700 cursor-pointer font-medium">Setup Instructions</summary>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800">
              <li>Sign up for a free Plaid account at <a href="https://dashboard.plaid.com/signup" target="_blank" rel="noopener" className="underline">dashboard.plaid.com</a></li>
              <li>Get your Client ID and Sandbox Secret from the Keys section</li>
              <li>Add them to the <code className="bg-blue-100 px-1 rounded">.env.local</code> file</li>
              <li>Restart the dev server</li>
              <li>Click Connect Bank Account below</li>
            </ol>
          </details>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
              <p className="text-gray-500 mb-4">
                Connect your bank accounts to automatically import transactions.
              </p>
              <PlaidLinkButton onSuccess={handlePlaidSuccess} onError={handlePlaidError} />
            </div>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <CreditCard className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{account.institutionName}</p>
                      <p className="text-sm text-gray-500">
                        {account.accountName} ••••{account.mask}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {account.balance !== undefined && (
                        <p className="font-medium">{formatCurrency(account.balance)}</p>
                      )}
                      <p className="text-xs text-gray-500 capitalize">{account.accountType}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBankAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t">
                <PlaidLinkButton onSuccess={handlePlaidSuccess} onError={handlePlaidError} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Note */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Transaction Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            You can also manually track your transactions:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Business Transactions</h4>
              <p className="text-sm text-gray-600 mb-2">
                Track income and expenses for your contracting business.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/transactions'}>
                Go to Transactions
              </Button>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Receipt Photos</h4>
              <p className="text-sm text-gray-600 mb-2">
                Upload receipt photos and use OCR to extract data.
              </p>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/receipts'}>
                Go to Receipts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
