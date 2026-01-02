'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Award } from 'lucide-react'

interface XPNotificationProps {
  xpGained: number
  leveledUp: boolean
  newLevel?: number
  onClose: () => void
}

export function XPNotification({ xpGained, leveledUp, newLevel, onClose }: XPNotificationProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, leveledUp ? 5000 : 3000) // Show longer for level ups

    return () => clearTimeout(timer)
  }, [leveledUp, onClose])

  if (!visible) {
    return null
  }

  if (leveledUp && newLevel) {
    return (
      <>
        {/* Level Up Confetti */}
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: '12px',
                height: '12px',
                backgroundColor: ['#fbbf24', '#f59e0b', '#f97316', '#fb923c', '#fdba74'][i % 5],
                animationDelay: `${Math.random() * 0.3}s`,
                animationDuration: `${2.5 + Math.random() * 1.5}s`,
                borderRadius: i % 3 === 0 ? '50%' : '0'
              }}
            />
          ))}
        </div>
        
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-500">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-2xl p-6 min-w-[320px] border-4 border-amber-300 relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slow" />
            
            <div className="flex items-center gap-3 relative z-10">
              <Award className="h-10 w-10 flex-shrink-0 animate-bounce" />
              <div className="flex-1">
                <p className="font-bold text-2xl mb-1">Level Up! 🎉</p>
                <p className="text-base text-amber-100">
                  You&apos;ve reached <span className="font-bold text-xl">Level {newLevel}</span>
                </p>
                <p className="text-sm text-amber-200 mt-1">
                  +{xpGained} XP earned
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">+{xpGained} XP</p>
          </div>
        </div>
      </div>
    </div>
  )
}
