'use client'

import { useCallback, useState } from 'react'
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2 } from 'lucide-react'

interface PlaidLinkButtonProps {
  onSuccess: (accounts: any[], institutionName: string) => void
  onError?: (error: string) => void
}

export function PlaidLinkButton({ onSuccess, onError }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLinkToken = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        onError?.(data.error)
        return
      }
      
      setLinkToken(data.link_token)
    } catch (err) {
      const message = 'Failed to initialize bank connection'
      setError(message)
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      setLoading(true)
      try {
        const response = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token: publicToken }),
        })
        const data = await response.json()
        
        if (data.error) {
          setError(data.error)
          onError?.(data.error)
          return
        }
        
        onSuccess(data.accounts, data.institutionName)
        setLinkToken(null)
      } catch (err) {
        const message = 'Failed to connect account'
        setError(message)
        onError?.(message)
      } finally {
        setLoading(false)
      }
    },
    [onSuccess, onError]
  )

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: () => {
      setLinkToken(null)
    },
  }

  const { open, ready } = usePlaidLink(config)

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <Button variant="outline" onClick={() => setError(null)}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!linkToken) {
    return (
      <Button onClick={fetchLinkToken} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Initializing...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Connect Bank Account
          </>
        )}
      </Button>
    )
  }

  return (
    <Button onClick={() => open()} disabled={!ready || loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-2" />
          Connect Bank Account
        </>
      )}
    </Button>
  )
}
