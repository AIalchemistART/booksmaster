'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Trophy, ChevronRight } from 'lucide-react'
import { LEVELS, type UserLevel } from '@/lib/gamification/leveling-system'

interface LevelUpNotificationProps {
  newLevel: UserLevel
  onClose: () => void
  isVisible: boolean
}

export function LevelUpNotification({ newLevel, onClose, isVisible }: LevelUpNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const levelData = LEVELS[newLevel - 1]
  
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      // Stagger content appearance
      const timer = setTimeout(() => setShowContent(true), 200)
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(false)
      setShowContent(false)
    }
  }, [isVisible])

  if (!levelData || !isVisible) return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      {/* Confetti animation using CSS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#3B82F6'][i % 5],
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div
        className={`relative bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-purple-500/30 transform transition-all duration-500 ${showContent ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Level badge */}
        <div className={`flex justify-center mb-6 transition-all duration-700 delay-200 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30 animate-pulse-slow">
              <span className="text-5xl">{levelData.badge}</span>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-300/50 animate-spin-slow" />
          </div>
        </div>

        {/* Level up text */}
        <div className={`text-center transition-all duration-500 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
            <span className="text-yellow-400 font-semibold uppercase tracking-wider text-sm">Level Up!</span>
            <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-1">
            Level {newLevel}
          </h2>
          <p className="text-xl text-purple-200 font-medium mb-4">
            {levelData.title}
          </p>
          <p className="text-gray-300 text-sm mb-6">
            {levelData.description}
          </p>
        </div>

        {/* Unlocked features */}
        {levelData.unlocksFeatures.length > 0 && (
          <div className={`bg-white/10 rounded-xl p-4 mb-6 transition-all duration-500 delay-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-semibold text-white">Features Learned</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {levelData.unlocksFeatures.map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs font-medium capitalize"
                >
                  {feature.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={onClose}
          className={`w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/30 duration-500 delay-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          Continue Your Journey
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
