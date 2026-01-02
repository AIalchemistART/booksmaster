'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Trophy, X } from 'lucide-react'

export function AchievementNotification() {
  const { pendingAchievement, dismissAchievement } = useStore()

  useEffect(() => {
    if (pendingAchievement) {
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        dismissAchievement()
      }, 8000)
      
      return () => clearTimeout(timer)
    }
  }, [pendingAchievement, dismissAchievement])

  if (!pendingAchievement) return null

  return (
    <>
      {/* Achievement Stars/Sparkles - Different from level up confetti */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-sparkle"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              fontSize: `${12 + Math.random() * 12}px`,
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1.5 + Math.random()}s`,
            }}
          >
            {['✨', '⭐', '💫', '🌟'][i % 4]}
          </div>
        ))}
      </div>
      
      <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
        <Card className="w-80 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-2 border-amber-300 dark:border-amber-700 shadow-2xl relative overflow-hidden">
          {/* Radial glow pulse */}
          <div className="absolute inset-0 bg-gradient-radial from-amber-200/30 to-transparent animate-pulse" />
          
          <div className="p-4 relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-amber-900 dark:text-amber-100">
                  Achievement Unlocked!
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissAchievement}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="text-4xl">{pendingAchievement.icon}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {pendingAchievement.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {pendingAchievement.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded">
                    +{pendingAchievement.xpReward} XP
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {pendingAchievement.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
