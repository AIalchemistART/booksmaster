'use client'

import { useState, useEffect } from 'react'
import { isFileSystemConfigured } from '@/lib/file-system-storage'

export function useFileSystemCheck() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    checkConfiguration()
  }, [])

  const checkConfiguration = async () => {
    const configured = await isFileSystemConfigured()
    setIsConfigured(configured)
  }

  const requireFileSystem = async (callback: () => void) => {
    const configured = await isFileSystemConfigured()
    
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

  const handleCancel = () => {
    setShowModal(false)
  }

  return {
    isConfigured,
    showModal,
    requireFileSystem,
    handleSetupComplete,
    handleCancel,
  }
}
