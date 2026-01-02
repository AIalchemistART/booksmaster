'use client'

import { ReactNode } from 'react'
import { useStore } from '@/store'
import { LEVELS } from '@/lib/gamification/leveling-system'
import { Lock, TrendingUp } from 'lucide-react'

interface FeatureLockProps {
  feature: string
  children: ReactNode
  requiredLevel?: number
  fallback?: ReactNode
}

/**
 * Wrapper component that locks features until the user reaches the required level
 */
export function FeatureLock({ feature, children, requiredLevel, fallback }: FeatureLockProps) {
  const { userProgress, isFeatureUnlocked } = useStore()
  
  const unlocked = isFeatureUnlocked(feature)

  if (unlocked) {
    return <>{children}</>
  }

  // Find which level unlocks this feature
  const unlockLevel = requiredLevel || LEVELS.find(level => 
    level.unlocksFeatures.includes(feature)
  )?.level || 2

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="relative">
      {/* Blurred/disabled content */}
      <div className="pointer-events-none opacity-30 blur-sm select-none">
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2">
            Feature Locked
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Reach <span className="font-bold text-blue-600 dark:text-blue-400">Level {unlockLevel}</span> to unlock this feature.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-4 w-4" />
            <span>
              Current Level: {userProgress.currentLevel} ({LEVELS[userProgress.currentLevel - 1].badge})
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
