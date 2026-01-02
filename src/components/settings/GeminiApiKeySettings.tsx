'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { getGeminiApiKey, setGeminiApiKey, clearGeminiApiKey, isGeminiConfigured } from '@/lib/persistent-storage'

export function GeminiApiKeySettings() {
  const [apiKey, setApiKeyState] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadKey = async () => {
    console.log('[API KEY SETTINGS] Loading API key...')
    
    // Try localStorage first for immediate feedback
    const localKey = localStorage.getItem('gemini_api_key')
    if (localKey) {
      console.log('[API KEY SETTINGS] Found key in localStorage')
      setApiKeyState(localKey)
      setIsConfigured(true)
    }
    
    // Then verify with IndexedDB
    const key = await getGeminiApiKey()
    console.log('[API KEY SETTINGS] IndexedDB key present:', !!key)
    if (key) {
      setApiKeyState(key)
      setIsConfigured(true)
    } else if (!localKey) {
      setApiKeyState('')
      setIsConfigured(false)
    }
  }

  useEffect(() => {
    loadKey()
  }, [])

  // Re-check when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadKey()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Aggressive re-checking for the first 3 seconds (post-wizard)
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    // Check at 200ms, 500ms, 1000ms, 2000ms, 3000ms
    ;[200, 500, 1000, 2000, 3000].forEach(delay => {
      timers.push(setTimeout(() => {
        loadKey()
      }, delay))
    })
    
    return () => timers.forEach(timer => clearTimeout(timer))
  }, [])

  const handleSave = async () => {
    if (apiKey.trim()) {
      await setGeminiApiKey(apiKey.trim())
      setIsConfigured(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleClear = async () => {
    await clearGeminiApiKey()
    setApiKeyState('')
    setIsConfigured(false)
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gemini API Configuration</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Configure Google Gemini 3 Flash for enhanced receipt OCR
          </p>
        </div>
        {isConfigured && (
          <span className="px-2 py-1 text-xs font-semibold text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/30 rounded flex items-center gap-1">
            <Check className="h-3 w-3" />
            Configured
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          API Key
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save
          </button>
          {isConfigured && (
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Clear
            </button>
          )}
        </div>
        {saved && (
          <p className="text-sm text-green-600 dark:text-green-400">✓ API key saved successfully</p>
        )}
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>
          <strong>How to get your API key:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google AI Studio</a></li>
          <li>Sign in with your Google account</li>
          <li>Click &quot;Get API key&quot; or &quot;Create API key&quot;</li>
          <li>Copy the key and paste it above</li>
        </ol>
        <p className="mt-2">
          <strong>Pricing:</strong> ~$0.002 per receipt with Gemini 3 Flash
        </p>
      </div>
    </div>
  )
}
