'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { BackgroundProcessingIndicator } from '@/components/layout/BackgroundProcessingIndicator'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { AchievementNotification } from '@/components/gamification/AchievementNotification'
import { LevelUpNotification } from '@/components/gamification/LevelUpNotification'
import { useProcessingGuard } from '@/hooks/useProcessingGuard'
import { useStore } from '@/store'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  // FUNCTION ENTRY - fires immediately when component function is called
  console.log('[LAYOUT ENTRY] LayoutClient function called')
  
  useProcessingGuard()
  const { userProgress, pendingLevelUp, dismissLevelUp, darkMode, lastUnlockedFeature } = useStore()
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
    
    console.log('[LAYOUT] Waiting for persist rehydration...')
    console.log('[LAYOUT] Sidebar import type:', typeof Sidebar)
    console.log('[LAYOUT] Sidebar:', Sidebar)
    
    return () => clearTimeout(timer)
  }, [])

  // Dark mode watcher - maintain dark class based on store state
  useEffect(() => {
    console.log('[LAYOUT CLIENT] Dark mode watcher triggered, darkMode:', darkMode)
    console.log('[LAYOUT CLIENT] Current document classes:', document.documentElement.className)
    
    if (darkMode) {
      document.documentElement.classList.add('dark')
      console.log('[LAYOUT CLIENT] ✅ Applied dark class')
    } else {
      document.documentElement.classList.remove('dark')
      console.log('[LAYOUT CLIENT] ❌ Removed dark class')
    }
    
    console.log('[LAYOUT CLIENT] Final document classes:', document.documentElement.className)
  }, [darkMode])

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

  // LAYOUT RENDER CHECK
  console.log('[LAYOUT RENDER] Rendering layout with Sidebar, hasRehydrated:', hasRehydrated, 'showOnboarding:', showOnboarding)

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
    </>
  )
}
