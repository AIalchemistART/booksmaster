/**
 * File system persistence for gamification data
 * 
 * NOTE: Gamification data is primarily persisted via localStorage through
 * Zustand's persist middleware. These functions are stubs that maintain
 * API compatibility but don't perform file system operations.
 */

import type { UserProgress } from '@/lib/gamification/leveling-system'
import type { Achievement } from '@/lib/gamification/achievements'

export interface GamificationData {
  userProgress: UserProgress
  unlockedAchievements: Achievement[]
  lastSaved: string
}

/**
 * Save gamification data (stub - data persisted via localStorage)
 */
export async function saveGamificationData(
  _userProgress: UserProgress,
  _unlockedAchievements: Achievement[]
): Promise<void> {
  // Gamification data is persisted via Zustand's localStorage middleware
  // This function is a no-op stub for API compatibility
}

/**
 * Load gamification data (stub - returns null, data loaded from localStorage)
 */
export async function loadGamificationData(): Promise<GamificationData | null> {
  // Gamification data is loaded via Zustand's localStorage middleware
  // Return null to let localStorage handle initialization
  return null
}

/**
 * Delete gamification data (stub - handled by clear all data)
 */
export async function deleteGamificationData(): Promise<void> {
  // Gamification data is cleared via localStorage.removeItem
  // This function is a no-op stub for API compatibility
}

/**
 * Check if gamification data exists (stub - always returns false)
 */
export async function hasGamificationData(): Promise<boolean> {
  // Return false to let localStorage handle data presence
  return false
}
