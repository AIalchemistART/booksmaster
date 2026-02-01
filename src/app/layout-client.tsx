'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { BackgroundProcessingIndicator } from '@/components/layout/BackgroundProcessingIndicator'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { AchievementNotification } from '@/components/gamification/AchievementNotification'
import { LevelUpNotification } from '@/components/gamification/LevelUpNotification'
import { DonationModal } from '@/components/modals/DonationModal'
import { useProcessingGuard } from '@/hooks/useProcessingGuard'
import { useStore } from '@/store'
import { logger } from '@/lib/logger'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  // FUNCTION ENTRY - fires immediately when component function is called
  logger.debug('[LAYOUT ENTRY] LayoutClient function called')
  
  useProcessingGuard()
  const { userProgress, pendingLevelUp, dismissLevelUp, darkMode, lastUnlockedFeature } = useStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasRehydrated, setHasRehydrated] = useState(false)
  const [showLevel7DonationModal, setShowLevel7DonationModal] = useState(false)
  const [previousLevel, setPreviousLevel] = useState<number>(1)

  // Wait for zustand persist to finish rehydrating
  useEffect(() => {
    // Check if persist has completed by looking for non-default values
    // or waiting a short time for rehydration
    const timer = setTimeout(() => {
      setHasRehydrated(true)
      logger.debug('[LAYOUT] Persist rehydration complete, checking onboarding status')
    }, 100) // Small delay to ensure persist completes
    
    logger.debug('[LAYOUT] Waiting for persist rehydration...')
    logger.debug('[LAYOUT] Sidebar import type:', typeof Sidebar)
    logger.debug('[LAYOUT] Sidebar:', Sidebar)
    
    return () => clearTimeout(timer)
  }, [])

  // Dark mode watcher - maintain dark class based on store state
  useEffect(() => {
    logger.debug('[LAYOUT CLIENT] Dark mode watcher triggered, darkMode:', darkMode)
    logger.debug('[LAYOUT CLIENT] Current document classes:', document.documentElement.className)
    
    if (darkMode) {
      document.documentElement.classList.add('dark')
      logger.debug('[LAYOUT CLIENT] ✅ Applied dark class')
    } else {
      document.documentElement.classList.remove('dark')
      logger.debug('[LAYOUT CLIENT] ❌ Removed dark class')
    }
    
    logger.debug('[LAYOUT CLIENT] Final document classes:', document.documentElement.className)
  }, [darkMode])

  useEffect(() => {
    // Only check onboarding status after rehydration is complete
    if (!hasRehydrated) {
      logger.debug('[LAYOUT] Waiting for persist rehydration...')
      return
    }
    
    // Check if user needs onboarding (after zustand persist rehydrates)
    const hasCompletedOnboarding = userProgress.onboardingComplete
    const hasSelectedPath = userProgress.selectedTechPath || userProgress.isCustomPath
    
    logger.debug('[LAYOUT] Onboarding check - completed:', hasCompletedOnboarding, 'selectedPath:', userProgress.selectedTechPath)
    
    if (!hasCompletedOnboarding && !hasSelectedPath) {
      logger.debug('[LAYOUT] Showing onboarding wizard')
      setTimeout(() => setShowOnboarding(true), 1000)
    } else {
      logger.debug('[LAYOUT] Hiding onboarding wizard')
      setShowOnboarding(false)
    }
  }, [hasRehydrated, userProgress.onboardingComplete, userProgress.selectedTechPath, userProgress.isCustomPath])

  // Watch for level 7 achievement to show donation modal
  useEffect(() => {
    const currentLevel = userProgress.currentLevel
    const hasSeenLevel7Modal = localStorage.getItem('hasSeenLevel7DonationModal')
    
    // Check if user just reached level 7 and hasn't seen the modal yet
    if (currentLevel === 7 && previousLevel < 7 && !hasSeenLevel7Modal && !pendingLevelUp) {
      logger.debug('[LAYOUT] User reached level 7, showing donation modal')
      // Small delay to ensure level-up modal has been dismissed
      setTimeout(() => {
        setShowLevel7DonationModal(true)
      }, 500)
    }
    
    setPreviousLevel(currentLevel)
  }, [userProgress.currentLevel, pendingLevelUp, previousLevel])

  // LAYOUT RENDER CHECK
  logger.debug('[LAYOUT RENDER] Rendering layout with Sidebar, hasRehydrated:', hasRehydrated, 'showOnboarding:', showOnboarding)

  return (
    <>
      <div className="flex h-screen dark:bg-gray-900">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
      <BackgroundProcessingIndicator />
      <AchievementNotification />
      {pendingLevelUp && (
        <LevelUpNotification 
          newLevel={pendingLevelUp} 
          isVisible={!!pendingLevelUp} 
          onClose={dismissLevelUp}
          unlockedFeature={lastUnlockedFeature}
        />
      )}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
      <DonationModal
        isOpen={showLevel7DonationModal}
        onClose={() => {
          localStorage.setItem('hasSeenLevel7DonationModal', 'true')
          setShowLevel7DonationModal(false)
        }}
        variant="level7"
      />
    </>
  )
}
