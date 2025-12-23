'use client'

import { useState, useEffect } from 'react'
import { getGeminiApiKey, setGeminiApiKey, isGeminiConfigured } from '@/lib/ocr/gemini-vision'

export function GeminiApiKeySettings() {
  const [apiKey, setApiKeyState] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const key = getGeminiApiKey()
    if (key) {
      setApiKeyState(key)
      setIsConfigured(true)
    }
  }, [])

  const handleSave = () => {
    if (apiKey.trim()) {
      setGeminiApiKey(apiKey.trim())
      setIsConfigured(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleClear = () => {
    setGeminiApiKey('')
    setApiKeyState('')
    setIsConfigured(false)
  }

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gemini API Configuration</h3>
          <p className="text-sm text-gray-600">
            Configure Google Gemini 1.5 Flash for enhanced receipt OCR
          </p>
        </div>
        {isConfigured && (
          <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded">
            Configured
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          API Key
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
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
          <p className="text-sm text-green-600">✓ API key saved successfully</p>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <strong>How to get your API key:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a></li>
          <li>Sign in with your Google account</li>
          <li>Click "Get API key" or "Create API key"</li>
          <li>Copy the key and paste it above</li>
        </ol>
        <p className="mt-2">
          <strong>Pricing:</strong> ~$0.002 per receipt with Gemini 1.5 Flash
        </p>
      </div>
    </div>
  )
}
