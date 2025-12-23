'use client'

import { useState, useEffect } from 'react'
import { isGeminiConfigured } from '@/lib/ocr/gemini-vision'

export function useGeminiApiKeyCheck() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    checkConfiguration()
  }, [])

  const checkConfiguration = () => {
    const configured = isGeminiConfigured()
    setIsConfigured(configured)
  }

  const requireGeminiApiKey = (callback: () => void) => {
    const configured = isGeminiConfigured()
    
    if (!configured) {
      setShowModal(true)
      return false
    }
    
    callback()
    return true
  }

  const handleSetupComplete = () => {
    setIsConfigured(true)
    setShowModal(false)
  }

  const handleSkip = () => {
    setShowModal(false)
  }

  return {
    isConfigured,
    showModal,
    requireGeminiApiKey,
    handleSetupComplete,
    handleSkip,
  }
}
