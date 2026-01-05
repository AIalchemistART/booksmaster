'use client'

import { useState } from 'react'
import { useStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CheckCircle, ArrowRight, ArrowLeft, Sparkles, Rocket, Moon, Sun, Briefcase, Calendar, FolderOpen } from 'lucide-react'
import { JOB_TYPE_LABELS, type TechTreePath } from '@/lib/gamification/leveling-system'
import { setupFileSystemStorage } from '@/lib/file-system-adapter'
import { setGeminiApiKey, getGeminiApiKey } from '@/lib/persistent-storage'
import { CustomJobDescriptionDialog } from '@/components/gamification/CustomJobDescriptionDialog'

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const store = useStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | null>(null)
  const [selectedJobType, setSelectedJobType] = useState<TechTreePath | ''>('')
  const [showCustomJobDialog, setShowCustomJobDialog] = useState(false)
  const [fiscalYearType, setFiscalYearType] = useState<'calendar' | 'federal' | 'custom'>('calendar')
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(1)
  const [fiscalYearEndMonth, setFiscalYearEndMonth] = useState(12)
  const [fileSystemConfigured, setFileSystemConfigured] = useState(false)
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '')
  const [unlockedFeatures, setUnlockedFeatures] = useState<Set<number>>(new Set())
  const [showConfetti, setShowConfetti] = useState(false)

  const totalSteps = 8

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      
      // Trigger confetti when entering Step 7 (feature unlocks)
      if (currentStep === 6) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 4000)
      }
      
      // Award cosmetic XP for completing steps (doesn't auto-level, just fills progress bar)
      if (currentStep === 3 && businessName) {
        store.completeAction('completeProfile')
      }
      if (currentStep === 4 && fiscalYearType) {
        store.completeAction('setFiscalYear')
      }
      if (currentStep === 7 && apiKey) {
        store.completeAction('connectApiKey')
      }
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    console.log('[WIZARD] handleComplete called')
    console.log('[WIZARD] businessName:', businessName)
    console.log('[WIZARD] selectedTheme:', selectedTheme)
    console.log('[WIZARD] selectedJobType:', selectedJobType)
    console.log('[WIZARD] fileSystemConfigured:', fileSystemConfigured)
    console.log('[WIZARD] apiKey present:', !!apiKey)
    
    // Save business info
    if (businessName.trim()) {
      store.setBusinessName(businessName.trim())
      console.log('[WIZARD] Set business name:', businessName.trim())
    }
    if (businessType.trim()) {
      store.setBusinessType(businessType.trim())
      console.log('[WIZARD] Set business type:', businessType.trim())
    }
    
    // Save job specialization
    if (selectedJobType) {
      store.selectTechPath(selectedJobType)
      console.log('[WIZARD] Set tech path:', selectedJobType)
    }
    
    // Apply selected theme (already applied on selection, but ensure it's saved)
    if (selectedTheme) {
      const isDark = selectedTheme === 'dark'
      // Update store state (zustand persist will save to localStorage)
      if (isDark !== store.darkMode) {
        store.toggleDarkMode()
      }
      // Apply CSS class
      if (isDark) {
        document.documentElement.classList.add('dark')
        console.log('[WIZARD] Set dark theme')
      } else {
        document.documentElement.classList.remove('dark')
        console.log('[WIZARD] Set light theme')
      }
    }
    
    // Save fiscal year configuration
    if (fiscalYearType === 'calendar') {
      store.setFiscalYearType('calendar')
      store.setFiscalYearStartMonth(1)
    } else if (fiscalYearType === 'federal') {
      store.setFiscalYearType('custom')
      store.setFiscalYearStartMonth(10) // October
    } else {
      store.setFiscalYearType('custom')
      store.setFiscalYearStartMonth(fiscalYearStartMonth)
    }
    console.log('[WIZARD] Set fiscal year:', fiscalYearType)
    
    // Save API key to persistent storage (IndexedDB + localStorage)
    if (apiKey && apiKey.trim()) {
      console.log('[WIZARD] Saving API key to persistent storage...')
      console.log('[WIZARD] API key length:', apiKey.trim().length, 'chars')
      await setGeminiApiKey(apiKey.trim()).catch(err => {
        console.error('[WIZARD ERROR] Failed to save API key:', err)
      })
      console.log('[WIZARD] Saved API key to IndexedDB and localStorage')
      
      // Verify save with detailed logging
      const savedKey = localStorage.getItem('gemini_api_key')
      console.log('[WIZARD] Verified localStorage API key:', savedKey ? `PRESENT (${savedKey.length} chars)` : 'MISSING')
      
      // Double-check IndexedDB
      const indexedKey = await getGeminiApiKey()
      console.log('[WIZARD] Verified IndexedDB API key:', indexedKey ? `PRESENT (${indexedKey.length} chars)` : 'MISSING')
      
      // Critical: Wait for Settings component to pick up the API key
      // Settings page renders immediately after wizard, needs time to load from storage
      console.log('[WIZARD] Waiting 500ms for API key to propagate to Settings component...')
      await new Promise(resolve => setTimeout(resolve, 500))
    } else {
      console.log('[WIZARD] No API key to save (empty or whitespace)')
    }
    
    // Mark onboarding complete (no XP award - stay at Level 1)
    store.completeOnboarding()
    console.log('[WIZARD] Marked onboarding complete - user stays at Level 1')
    
    // Unlock wizard-related achievements
    console.log('[WIZARD] Unlocking wizard achievements...')
    store.unlockAchievement('onboarding_complete')
    if (selectedJobType) {
      store.unlockAchievement('job_type_selected')
    }
    if (apiKey && apiKey.trim()) {
      store.unlockAchievement('api_connected')
    }
    
    // Force zustand persist to flush to localStorage
    // Give the persist middleware time to save (increased for reliability)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Verify localStorage persistence
    const stored = localStorage.getItem('thomas-books-storage')
    console.log('[WIZARD] localStorage thomas-books-storage present:', !!stored)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        console.log('[WIZARD] Stored onboardingComplete:', parsed.state?.userProgress?.onboardingComplete)
        console.log('[WIZARD] Stored businessName:', parsed.state?.businessName)
        console.log('[WIZARD] Stored selectedTechPath:', parsed.state?.userProgress?.selectedTechPath)
        console.log('[WIZARD] Stored darkMode:', parsed.state?.darkMode)
      } catch (e) {
        console.error('[WIZARD] Failed to parse stored data:', e)
      }
    }
    
    // Verify API key persistence
    const verifyApiKey = localStorage.getItem('gemini_api_key')
    console.log('[WIZARD] Verified API key in localStorage:', verifyApiKey ? 'PRESENT' : 'MISSING')
    
    // Additional delay to ensure Electron file system config saves
    if (fileSystemConfigured) {
      console.log('[WIZARD] Waiting for file system config to persist...')
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    onComplete()
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true // Welcome - always can proceed
      case 2:
        return selectedTheme !== null // Theme selection required
      case 3:
        return businessName.trim().length > 0 && selectedJobType !== '' // Business name + job specialization
      case 4:
        return true // Fiscal year - has default
      case 5:
        return fileSystemConfigured // File system setup required
      case 6:
        return true // Feature unlocks - informational only
      case 7:
        return true // API key - optional (can skip)
      case 8:
        return true // Summary - always can proceed
      default:
        return false
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-3xl w-full shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                Welcome to Booksmaster
              </CardTitle>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center space-y-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Welcome to Your Bookkeeping Assistant!
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Let&apos;s set up your account in just a few steps. We&apos;ll help you:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Track Your Finances
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receipts, expenses, and income in one place
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      AI-Powered Tools
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Smart categorization and OCR scanning
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Tax-Ready Reports
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Schedule C, quarterly estimates, and more
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-2" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Gamified Progress
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Level up as you learn the system
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Theme Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🎨</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Choose Your Theme
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Make Booksmaster your own with light or dark mode
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Light Mode */}
                    <button
                      onClick={() => {
                        setSelectedTheme('light')
                        document.documentElement.classList.remove('dark')
                        localStorage.setItem('theme', 'light')
                      }}
                      className={`relative p-8 rounded-xl transition-all duration-300 transform ${
                        selectedTheme === 'light'
                          ? 'ring-4 ring-blue-500 scale-105 bg-gradient-to-br from-white to-blue-50 shadow-xl'
                          : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:scale-105 hover:shadow-lg'
                      }`}
                    >
                      <div className="text-center space-y-4">
                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                          selectedTheme === 'light' ? 'bg-yellow-100' : 'bg-gray-200'
                        } transition-colors`}>
                          <Sun className={`h-10 w-10 ${
                            selectedTheme === 'light' ? 'text-yellow-500' : 'text-gray-500'
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Light Mode</h3>
                          <p className="text-sm text-gray-600">
                            Bright and clean workspace for daytime use
                          </p>
                        </div>
                        {selectedTheme === 'light' && (
                          <div className="absolute top-4 right-4">
                            <CheckCircle className="h-6 w-6 text-blue-500" />
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Dark Mode */}
                    <button
                      onClick={() => {
                        setSelectedTheme('dark')
                        document.documentElement.classList.add('dark')
                        localStorage.setItem('theme', 'dark')
                      }}
                      className={`relative p-8 rounded-xl transition-all duration-300 transform ${
                        selectedTheme === 'dark'
                          ? 'ring-4 ring-purple-500 scale-105 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl'
                          : 'bg-gradient-to-br from-gray-700 to-gray-800 hover:scale-105 hover:shadow-lg'
                      }`}
                    >
                      <div className="text-center space-y-4">
                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                          selectedTheme === 'dark' ? 'bg-indigo-900' : 'bg-gray-600'
                        } transition-colors`}>
                          <Moon className={`h-10 w-10 ${
                            selectedTheme === 'dark' ? 'text-purple-300' : 'text-gray-300'
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">Dark Mode</h3>
                          <p className="text-sm text-gray-300">
                            Easy on the eyes for extended sessions
                          </p>
                        </div>
                        {selectedTheme === 'dark' && (
                          <div className="absolute top-4 right-4">
                            <CheckCircle className="h-6 w-6 text-purple-400" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>

                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    💡 Don&apos;t worry - you can change this anytime in settings
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Business Info */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">💼</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Tell Us About Your Business
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    This helps us customize your experience
                  </p>
                </div>
                
                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Name *
                    </label>
                    <Input
                      placeholder="e.g., My Company LLC"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This will appear on your reports and invoices
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Briefcase className="h-4 w-4" />
                      Job Specialization *
                    </label>
                    <select
                      value={selectedJobType}
                      onChange={(e) => {
                        const value = e.target.value as TechTreePath | ''
                        setSelectedJobType(value)
                        // Update businessType to match selection
                        if (value) {
                          setBusinessType(JOB_TYPE_LABELS[value as TechTreePath])
                        }
                      }}
                      className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select your specialization...</option>
                      {(Object.entries(JOB_TYPE_LABELS) as [TechTreePath, string][]).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCustomJobDialog(true)}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Describe Your Job & Let AI Match
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This customizes features and expense categories for your work
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Fiscal Year Configuration */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">📅</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Fiscal Year Configuration
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    When does your business year run?
                  </p>
                </div>
                
                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="h-4 w-4" />
                      Fiscal Year Type
                    </label>
                    <select
                      value={fiscalYearType}
                      onChange={(e) => {
                        const value = e.target.value as 'calendar' | 'federal' | 'custom'
                        setFiscalYearType(value)
                        if (value === 'calendar') {
                          setFiscalYearStartMonth(1)
                          setFiscalYearEndMonth(12)
                        } else if (value === 'federal') {
                          setFiscalYearStartMonth(10)
                          setFiscalYearEndMonth(9)
                        }
                      }}
                      className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="calendar">Calendar Year (Jan 1 - Dec 31)</option>
                      <option value="federal">Federal Fiscal Year (Oct 1 - Sep 30)</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This affects tax calculations and annual reports
                    </p>
                  </div>

                  {fiscalYearType === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Month
                        </label>
                        <select
                          value={fiscalYearStartMonth}
                          onChange={(e) => setFiscalYearStartMonth(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                            <option key={idx} value={idx + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Month
                        </label>
                        <select
                          value={fiscalYearEndMonth}
                          onChange={(e) => setFiscalYearEndMonth(parseInt(e.target.value))}
                          className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                            <option key={idx} value={idx + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Most common:</strong> Calendar year (Jan-Dec) for small businesses. Federal fiscal year (Oct-Sep) is used by government contractors.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Local Storage Folder Setup */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">📁</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Choose Your Storage Folder
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Where should we save your data?
                  </p>
                </div>
                
                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      Local Storage Required
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      Booksmaster saves all your receipts, invoices, and data locally on your computer for maximum privacy and control.
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
                      We recommend creating a dedicated folder like:
                      <code className="block bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded mt-1 font-mono">
                        C:\Users\YourName\Documents\Booksmaster
                      </code>
                    </p>
                  </div>

                  {!fileSystemConfigured ? (
                    <Button
                      onClick={async () => {
                        try {
                          const success = await setupFileSystemStorage()
                          if (success) {
                            setFileSystemConfigured(true)
                          }
                        } catch (error) {
                          console.error('Failed to setup file system:', error)
                        }
                      }}
                      className="w-full"
                      size="lg"
                    >
                      <FolderOpen className="h-5 w-5 mr-2" />
                      Choose Storage Folder
                    </Button>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Storage folder configured!</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Your data will be saved to the selected folder
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <strong>Note:</strong> You can change this location later in Settings if needed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Feature Unlocks */}
            {currentStep === 6 && (
              <div className="space-y-6 relative">
                {/* Confetti Animation */}
                {showConfetti && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(50)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute animate-confetti"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: '-10px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 5],
                          animationDelay: `${Math.random() * 0.5}s`,
                          animationDuration: `${2 + Math.random() * 2}s`
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="text-6xl mb-4 animate-bounce">🎉</div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Features Learned!
                  </h2>
                  <p className="text-lg text-green-600 dark:text-green-400 font-semibold mb-2">
                    You&apos;ve completed the setup!
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Here&apos;s what you can do with Booksmaster
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Receipt Capture Method */}
                  <div className="p-4 border dark:border-gray-700 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <span className="text-2xl">📸</span>
                      How do you usually capture receipts?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button className="p-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">📱 Phone Camera</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Snap photos on the go</p>
                        <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                          ✓ Enabled
                        </span>
                      </button>
                      <button className="p-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">💾 File Upload</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Upload existing images</p>
                        <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                          ✓ Enabled
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Transaction Tracking */}
                  <div className="p-4 border dark:border-gray-700 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <span className="text-2xl">💰</span>
                      What will you track?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button className="p-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">💸 Expenses</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Business costs & purchases</p>
                        <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                          ✓ Enabled
                        </span>
                      </button>
                      <button className="p-4 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">💵 Income</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Payments & revenue</p>
                        <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                          ✓ Enabled
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Level 1 Achievement Banner */}
                  <div className="p-4 bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 dark:from-yellow-900/30 dark:via-amber-900/30 dark:to-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg mb-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🌱</span>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 uppercase tracking-wider">Welcome to</p>
                        <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">Level 1: Beginner</h3>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">Your bookkeeping journey begins!</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">+50 XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Feature Unlocks - Interactive Reveal */}
                  <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <span className="text-2xl">🎁</span>
                      Level 1 Features Learned!
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { id: 0, icon: '📸', label: 'Receipt Scanning' },
                        { id: 1, icon: '🎮', label: 'Level System' },
                        { id: 2, icon: '⚙️', label: 'Settings' },
                        { id: 3, icon: '🏆', label: 'XP & Achievements' },
                        { id: 4, icon: '🎯', label: 'Dashboard' },
                        { id: 5, icon: '💾', label: 'Local Storage' },
                      ].map((feature) => {
                        const isUnlocked = unlockedFeatures.has(feature.id)
                        return (
                          <button
                            key={feature.id}
                            onClick={() => {
                              if (!isUnlocked) {
                                setUnlockedFeatures(prev => {
                                  const newSet = new Set(Array.from(prev))
                                  newSet.add(feature.id)
                                  return newSet
                                })
                              }
                            }}
                            className={`relative p-4 rounded-lg transition-all duration-500 transform ${
                              isUnlocked
                                ? 'bg-green-100 dark:bg-green-900/40 border-2 border-green-500 scale-105'
                                : 'bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-purple-300 dark:border-purple-700 hover:scale-105 cursor-pointer'
                            }`}
                            style={{
                              animation: isUnlocked ? 'bounce 0.5s ease-out' : 'none'
                            }}
                          >
                            {isUnlocked ? (
                              <div className="text-center space-y-1">
                                <div className="text-3xl">{feature.icon}</div>
                                <div className="text-xs font-medium text-green-800 dark:text-green-200">
                                  {feature.label}
                                </div>
                                <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                              </div>
                            ) : (
                              <div className="text-center space-y-1">
                                <div className="text-3xl">🎁</div>
                                <div className="text-xs font-medium text-purple-800 dark:text-purple-200">
                                  Reveal!
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-3">
                      {unlockedFeatures.size === 6 ? '🎉 All features learned!' : `${unlockedFeatures.size}/6 features revealed`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: API Key */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🤖</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Enable AI Features
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Connect your Gemini API key for smart categorization and receipt scanning
                  </p>
                </div>
                
                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Gemini API Key *
                    </label>
                    <Input
                      type="password"
                      placeholder="AIza..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Get your API key at <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>. We recommend <strong>Tier 1 API</strong> (paid tier, ~$2/month) for reliable performance and faster processing. Free tier may have rate limits.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      What you&apos;ll learn:
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Automatic transaction categorization
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Receipt OCR (scan receipts with camera)
                      </li>
                      <li className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI-powered expense insights
                      </li>
                    </ul>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setApiKey('')
                      handleNext()
                    }}
                    className="w-full"
                  >
                    Skip for now (you can add this later)
                  </Button>
                </div>
              </div>
            )}

            {/* Step 8: Configuration Summary */}
            {currentStep === 8 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    You&apos;re All Set!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Here&apos;s what we configured for you
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-4">
                  {/* Theme */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        {selectedTheme === 'dark' ? <Moon className="h-5 w-5 text-blue-600 dark:text-blue-400" /> : <Sun className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Theme</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'} - Change anytime in Settings
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Business Information</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>{businessName}</strong> - {selectedJobType && JOB_TYPE_LABELS[selectedJobType]}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>

                  {/* Fiscal Year */}
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Fiscal Year</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {fiscalYearType === 'calendar' && 'Calendar Year (Jan 1 - Dec 31)'}
                          {fiscalYearType === 'federal' && 'Federal Fiscal Year (Oct 1 - Sep 30)'}
                          {fiscalYearType === 'custom' && `Custom (Month ${fiscalYearStartMonth} - Month ${fiscalYearEndMonth})`}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>

                  {/* File System */}
                  <div className={`p-4 border rounded-lg ${fileSystemConfigured ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${fileSystemConfigured ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        <FolderOpen className={`h-5 w-5 ${fileSystemConfigured ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Local Storage Folder</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {fileSystemConfigured ? 'Configured - All data will be saved locally' : 'Not configured - Using browser storage'}
                        </p>
                        {!fileSystemConfigured && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            ⚠️ You can set this up later in Settings
                          </p>
                        )}
                      </div>
                      {fileSystemConfigured ? <CheckCircle className="h-5 w-5 text-green-600" /> : <span className="text-gray-400">⊘</span>}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className={`p-4 border rounded-lg ${apiKey.trim() ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${apiKey.trim() ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        <Sparkles className={`h-5 w-5 ${apiKey.trim() ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">AI Features</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {apiKey.trim() ? `API Key: ${apiKey.substring(0, 8)}${'•'.repeat(20)}` : 'Not configured - Add API key in Settings'}
                        </p>
                        {!apiKey.trim() && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            ⚠️ Receipt OCR requires an API key
                          </p>
                        )}
                      </div>
                      {apiKey.trim() ? <CheckCircle className="h-5 w-5 text-green-600" /> : <span className="text-gray-400">⊘</span>}
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-6">
                    <p className="text-sm text-center text-gray-700 dark:text-gray-300">
                      💡 <strong>Pro Tip:</strong> Visit <strong>Settings</strong> anytime to adjust these preferences or view detailed configuration status.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t dark:border-gray-700">
              {currentStep > 1 ? (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div></div>
              )}
              
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="ml-auto"
              >
                {currentStep === totalSteps ? (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Get Started!
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Job Description Dialog */}
      {showCustomJobDialog && (
        <CustomJobDescriptionDialog
          onPathSelected={(path) => {
            setSelectedJobType(path)
            setBusinessType(JOB_TYPE_LABELS[path])
            setShowCustomJobDialog(false)
          }}
          onCustomPathSelected={(nodeIds) => {
            // For custom paths, store the custom path selection
            if (nodeIds.length > 0) {
              store.selectCustomPath(nodeIds)
              // Use first node ID as business type for now
              setBusinessType('Custom Specialization')
            }
            setShowCustomJobDialog(false)
          }}
          onCancel={() => setShowCustomJobDialog(false)}
        />
      )}
    </div>
  )
}
