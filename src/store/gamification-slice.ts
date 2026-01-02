import { StateCreator } from 'zustand'
import type { UserProgress, TechTreePath, UserLevel } from '@/lib/gamification/leveling-system'
import { awardXP, XP_REWARDS, REPEATABLE_XP_REWARDS, ONE_TIME_XP_REWARDS, BATCH_XP_REWARDS, DAILY_XP_REWARDS, getUnlockedFeaturesAtLevel, calculateLevel, LEVELS } from '@/lib/gamification/leveling-system'
import type { AchievementId, Achievement } from '@/lib/gamification/achievements'
import { ACHIEVEMENTS, checkAchievements } from '@/lib/gamification/achievements'
import { saveGamificationData, loadGamificationData, deleteGamificationData } from '@/lib/file-system/gamification-persistence'

// Track daily batch operations to prevent XP boosting
interface DailyBatchTracker {
  date: string  // YYYY-MM-DD
  parseCount: number
  validateCount: number
}

export interface GamificationSlice {
  userProgress: UserProgress
  unlockedAchievements: Achievement[]
  pendingAchievement: Achievement | null
  pendingLevelUp: UserLevel | null  // Track pending level-up for notification
  dailyBatchTracker: DailyBatchTracker
  
  // Actions
  initializeUserProgress: () => void
  selectTechPath: (path: TechTreePath) => void
  selectCustomPath: (nodeIds: string[]) => void
  manualLevelUp: (targetLevel: UserLevel) => void  // Manually level up to a specific level
  completeAction: (action: keyof typeof XP_REWARDS) => { leveledUp: boolean; newLevel?: UserLevel; xpGained: number }
  completeBatchAction: (type: 'parse' | 'validate', count: number) => { leveledUp: boolean; newLevel?: UserLevel; xpGained: number }
  completeOnboarding: () => void
  isFeatureUnlocked: (feature: string) => boolean
  unlockAchievement: (id: AchievementId) => void
  dismissAchievement: () => void
  dismissLevelUp: () => void  // Dismiss level-up notification
  checkAndUnlockAchievements: () => void
  resetProgress: () => void
}

const DEFAULT_USER_PROGRESS: UserProgress = {
  currentLevel: 1,
  currentXP: 0,
  totalXP: 0,
  completedActions: [],
  unlockedFeatures: ['settings', 'dashboard'],
  onboardingComplete: false
}

export const createGamificationSlice: StateCreator<
  GamificationSlice
> = (set, get) => ({
  userProgress: DEFAULT_USER_PROGRESS,
  unlockedAchievements: [],
  pendingAchievement: null,
  pendingLevelUp: null,
  dailyBatchTracker: { date: '', parseCount: 0, validateCount: 0 },

  initializeUserProgress: async () => {
    // NOTE: This is now handled by zustand persist automatically
    // This function is kept for backward compatibility but does nothing
    // zustand persist will rehydrate userProgress from localStorage on app start
    console.log('[GAMIFICATION] Using zustand persist for state management')
  },

  selectTechPath: (path: TechTreePath) => {
    set((state) => {
      const newProgress = {
        ...state.userProgress,
        selectedTechPath: path,
        isCustomPath: false,
        customSelectedNodes: undefined
      }
      // File system backup only - zustand persist handles localStorage
      saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
      return { userProgress: newProgress }
    })
  },
  
  selectCustomPath: (nodeIds: string[]) => {
    set((state) => {
      const newProgress = {
        ...state.userProgress,
        isCustomPath: true,
        customSelectedNodes: nodeIds,
        selectedTechPath: undefined
      }
      // File system backup only - zustand persist handles localStorage
      saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
      return { userProgress: newProgress }
    })
  },

  manualLevelUp: (targetLevel: UserLevel) => {
    set((state) => {
      // Only level up if target is higher than current
      if (targetLevel <= state.userProgress.currentLevel) {
        return state
      }
      
      // Get features for the target level
      const newFeatures = getUnlockedFeaturesAtLevel(targetLevel)
      
      // Award cosmetic XP to match the new level (makes progress bar feel satisfying)
      const targetLevelData = LEVELS.find(l => l.level === targetLevel)
      const cosmeticXP = targetLevelData ? targetLevelData.xpRequired : state.userProgress.totalXP
      
      const newProgress = {
        ...state.userProgress,
        currentLevel: targetLevel,
        unlockedFeatures: newFeatures,
        totalXP: Math.max(cosmeticXP, state.userProgress.totalXP), // Take higher of current or target
        currentXP: Math.max(cosmeticXP, state.userProgress.currentXP)
      }
      
      console.log(`[LEVEL UP] Manual level up to Level ${targetLevel} (cosmetic XP: ${cosmeticXP})`)
      
      // File system backup only - zustand persist handles localStorage
      saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
      
      return { 
        userProgress: newProgress,
        pendingLevelUp: targetLevel
      }
    })
  },

  completeAction: (action: keyof typeof XP_REWARDS) => {
    const currentProgress = get().userProgress
    
    // Check if this is a one-time action that's already been completed
    const isOneTimeAction = action in ONE_TIME_XP_REWARDS
    const isDailyAction = action in DAILY_XP_REWARDS
    const isBatchAction = action in BATCH_XP_REWARDS
    
    // Skip batch actions here - they should use completeBatchAction
    if (isBatchAction) {
      console.log(`[XP] Skipping batch action ${action} - use completeBatchAction instead`)
      return { leveledUp: false, xpGained: 0 }
    }
    
    if (isOneTimeAction && currentProgress.completedActions.includes(action)) {
      // One-time actions can only award XP once
      return { leveledUp: false, xpGained: 0 }
    }

    const result = awardXP(currentProgress, action)
    
    // CAP XP: Don't exceed next level requirement (maintain suspension of disbelief)
    // Find next level's XP requirement
    const nextLevelData = LEVELS.find(l => l.level === currentProgress.currentLevel + 1)
    if (nextLevelData && result.newProgress.totalXP >= nextLevelData.xpRequired) {
      // Cap at 90% of next level requirement
      const cappedXP = Math.floor(nextLevelData.xpRequired * 0.9)
      result.newProgress.totalXP = cappedXP
      result.newProgress.currentXP = cappedXP
      console.log(`[XP] Capped at ${cappedXP} XP (90% of Level ${nextLevelData.level} requirement: ${nextLevelData.xpRequired})`)
    }
    
    // For daily/repeatable actions, don't add to completedActions (to save memory)
    // For one-time actions, track that they've been completed
    const newCompletedActions = isDailyAction 
      ? currentProgress.completedActions 
      : currentProgress.completedActions.includes(action) 
        ? currentProgress.completedActions 
        : [...currentProgress.completedActions, action]
    
    const finalProgress = {
      ...result.newProgress,
      completedActions: newCompletedActions
    }
    
    const state = get()
    set({ userProgress: finalProgress })
    // File system backup only - zustand persist handles localStorage
    saveGamificationData(finalProgress, state.unlockedAchievements).catch(console.error)
    
    console.log(`[XP] ${action}: +${result.xpGained} XP (Total: ${finalProgress.totalXP})`)
    
    // If leveled up, set pending level-up for notification
    if (result.leveledUp && result.newLevel) {
      set({ pendingLevelUp: result.newLevel })
    }

    return {
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      xpGained: result.xpGained
    }
  },

  // Handle batch operations with flat XP (prevents boosting from large batches)
  completeBatchAction: (type: 'parse' | 'validate', count: number) => {
    const currentProgress = get().userProgress
    const today = new Date().toISOString().split('T')[0]
    let tracker = get().dailyBatchTracker
    
    // Reset tracker if it's a new day
    if (tracker.date !== today) {
      tracker = { date: today, parseCount: 0, validateCount: 0 }
    }
    
    // Determine XP based on whether this is first batch of day or subsequent
    let xpGained = 0
    if (type === 'parse') {
      xpGained = tracker.parseCount === 0 
        ? BATCH_XP_REWARDS.batchParseFirst 
        : BATCH_XP_REWARDS.batchParseSubsequent
      tracker.parseCount++
    } else {
      xpGained = tracker.validateCount === 0 
        ? BATCH_XP_REWARDS.batchValidateFirst 
        : BATCH_XP_REWARDS.batchValidateSubsequent
      tracker.validateCount++
    }
    
    const newTotalXP = currentProgress.totalXP + xpGained
    const newLevel = calculateLevel(newTotalXP)
    const leveledUp = newLevel > currentProgress.currentLevel
    
    const finalProgress: UserProgress = {
      ...currentProgress,
      totalXP: newTotalXP,
      currentXP: newTotalXP,
      currentLevel: newLevel,
      unlockedFeatures: getUnlockedFeaturesAtLevel(newLevel)
    }
    
    const state = get()
    set({ 
      userProgress: finalProgress,
      dailyBatchTracker: tracker
    })
    saveGamificationData(finalProgress, state.unlockedAchievements).catch(console.error)
    
    console.log(`[XP] Batch ${type} (${count} items): +${xpGained} XP (Total: ${finalProgress.totalXP})`)
    
    if (leveledUp) {
      set({ pendingLevelUp: newLevel })
    }
    
    return {
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
      xpGained
    }
  },

  completeOnboarding: () => {
    set((state) => {
      const newProgress = {
        ...state.userProgress,
        onboardingComplete: true
      }
      // File system backup only - zustand persist handles localStorage
      saveGamificationData(newProgress, state.unlockedAchievements).catch(console.error)
      return { userProgress: newProgress }
    })
  },

  isFeatureUnlocked: (feature: string) => {
    return get().userProgress.unlockedFeatures.includes(feature)
  },
  
  unlockAchievement: (id: AchievementId) => {
    const achievementDef = ACHIEVEMENTS[id]
    if (!achievementDef) return
    
    const current = get().unlockedAchievements
    const alreadyUnlocked = current.some(a => a.id === id)
    
    if (alreadyUnlocked) return
    
    const achievement: Achievement = {
      ...achievementDef,
      id,
      unlockedAt: new Date().toISOString()
    }
    
    const newAchievements = [...current, achievement]
    const state = get()
    
    set({
      unlockedAchievements: newAchievements,
      pendingAchievement: achievement
    })
    
    // Save to file system
    saveGamificationData(state.userProgress, newAchievements).catch(console.error)
    
    console.log(`🏆 Achievement Unlocked: ${achievement.title}`)
  },
  
  dismissAchievement: () => {
    set({ pendingAchievement: null })
  },
  
  dismissLevelUp: () => {
    set({ pendingLevelUp: null })
  },
  
  checkAndUnlockAchievements: () => {
    const state = get()
    // This would be called periodically to check for new achievements
    // For now, it's a placeholder - achievements will be unlocked via explicit calls
  },

  resetProgress: () => {
    localStorage.removeItem('thomas-books-user-progress')
    deleteGamificationData().catch(console.error)
    set({ 
      userProgress: DEFAULT_USER_PROGRESS,
      unlockedAchievements: [],
      pendingAchievement: null
    })
  }
})
