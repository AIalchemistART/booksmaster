'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProgress, initializeUserProgress } = useStore()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Initialize gamification progress on app load
    initializeUserProgress()
    
    // Check if user needs onboarding
    const hasCompletedOnboarding = userProgress.onboardingComplete
    const hasSelectedPath = userProgress.selectedTechPath || userProgress.isCustomPath
    
    if (!hasCompletedOnboarding && !hasSelectedPath) {
      // Show onboarding after a brief delay
      setTimeout(() => setShowOnboarding(true), 500)
    }
  }, [initializeUserProgress])

  useEffect(() => {
    // Hide onboarding if user completes it
    if (userProgress.onboardingComplete) {
      setShowOnboarding(false)
    }
  }, [userProgress.onboardingComplete])

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
    </>
  )
}
