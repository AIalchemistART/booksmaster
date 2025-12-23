'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { setGeminiApiKey } from '@/lib/ocr/gemini-vision'
import { Cpu, AlertCircle, X, Check } from 'lucide-react'

interface GeminiApiKeyRequiredModalProps {
  onSetupComplete: () => void
  onSkip?: () => void
}

export function GeminiApiKeyRequiredModal({ onSetupComplete, onSkip }: GeminiApiKeyRequiredModalProps) {
  const [apiKey, setApiKeyState] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    if (apiKey.trim()) {
      setSaving(true)
      setGeminiApiKey(apiKey.trim())
      setSaving(false)
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
                <Cpu className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gemini API Key Recommended
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                For best results, we recommend setting up your Google Gemini API key before scanning receipts. 
                Gemini 3 Flash provides ~95% accuracy for receipt data extraction.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <strong>Without Gemini API:</strong> Receipt scanning will use basic OCR with lower accuracy (~75%). 
                    You may need to manually correct more fields.
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Get Your API Key</h4>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Get API Key" or "Create API Key"</li>
                  <li>Copy the key and paste it below</li>
                </ol>
              </div>

              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKeyState(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !apiKey.trim()}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save & Continue'}
                </Button>
                {onSkip && (
                  <Button variant="outline" onClick={onSkip} disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    Skip for Now
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                <strong>Privacy:</strong> Your API key is stored locally in your browser and never sent to our servers. 
                You can update or remove it anytime in Settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
