'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { BackgroundProcessingIndicator } from '@/components/layout/BackgroundProcessingIndicator'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { AchievementNotification } from '@/components/gamification/AchievementNotification'
import { LevelUpNotification } from '@/components/gamification/LevelUpNotification'
import { useProcessingGuard } from '@/hooks/useProcessingGuard'
import { useStore } from '@/store'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  useProcessingGuard()
  const { userProgress, pendingLevelUp, dismissLevelUp } = useStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasRehydrated, setHasRehydrated] = useState(false)

  // Wait for zustand persist to finish rehydrating
  useEffect(() => {
    // Check if persist has completed by looking for non-default values
    // or waiting a short time for rehydration
    const timer = setTimeout(() => {
      setHasRehydrated(true)
      console.log('[LAYOUT] Persist rehydration complete, checking onboarding status')
    }, 100) // Small delay to ensure persist completes
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Only check onboarding status after rehydration is complete
    if (!hasRehydrated) {
      console.log('[LAYOUT] Waiting for persist rehydration...')
      return
    }
    
    // Check if user needs onboarding (after zustand persist rehydrates)
    const hasCompletedOnboarding = userProgress.onboardingComplete
    const hasSelectedPath = userProgress.selectedTechPath || userProgress.isCustomPath
    
    console.log('[LAYOUT] Onboarding check - completed:', hasCompletedOnboarding, 'selectedPath:', userProgress.selectedTechPath)
    
    if (!hasCompletedOnboarding && !hasSelectedPath) {
      console.log('[LAYOUT] Showing onboarding wizard')
      setTimeout(() => setShowOnboarding(true), 1000)
    } else {
      console.log('[LAYOUT] Hiding onboarding wizard')
      setShowOnboarding(false)
    }
  }, [hasRehydrated, userProgress.onboardingComplete, userProgress.selectedTechPath, userProgress.isCustomPath])

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
        />
      )}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  )
}
