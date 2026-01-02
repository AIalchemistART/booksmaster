import { 
  XP_REWARDS, 
  LEVELS, 
  calculateLevel, 
  getNextLevelRequirements,
  awardXP 
} from '@/lib/gamification/leveling-system'
import type { UserProgress } from '@/lib/gamification/leveling-system'

describe('Gamification System', () => {
  describe('XP_REWARDS', () => {
    it('has defined XP values for all actions', () => {
      expect(XP_REWARDS.parseReceipt).toBe(5)
      expect(XP_REWARDS.validateReceipt).toBe(15)
      expect(XP_REWARDS.linkReceiptToTransaction).toBe(20)
      expect(XP_REWARDS.uploadFirstReceipt).toBe(100)
      expect(XP_REWARDS.createTransaction).toBe(50)
    })

    it('has Tier 1 actions with low XP (5-10)', () => {
      expect(XP_REWARDS.parseReceipt).toBeLessThanOrEqual(10)
      expect(XP_REWARDS.editTransaction).toBeLessThanOrEqual(10)
    })

    it('has Tier 4 actions with high XP (200+)', () => {
      expect(XP_REWARDS.exportScheduleC).toBeGreaterThanOrEqual(200)
      expect(XP_REWARDS.reviewQuarterlyTax).toBeGreaterThanOrEqual(200)
    })
  })

  describe('LEVELS', () => {
    it('has 12 levels defined', () => {
      expect(LEVELS).toHaveLength(12)
    })

    it('has increasing XP requirements', () => {
      for (let i = 1; i < LEVELS.length; i++) {
        expect(LEVELS[i].xpRequired).toBeGreaterThan(LEVELS[i - 1].xpRequired)
      }
    })

    it('has level 1 starting at 0 XP', () => {
      expect(LEVELS[0].level).toBe(1)
      expect(LEVELS[0].xpRequired).toBe(0)
    })

    it('has level 12 as max level', () => {
      expect(LEVELS[11].level).toBe(12)
    })

    it('has unique badges for each level', () => {
      const badges = LEVELS.map(l => l.badge)
      const uniqueBadges = new Set(badges)
      expect(uniqueBadges.size).toBe(12)
    })
  })

  describe('calculateLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1)
    })

    it('returns level 2 at 250 XP', () => {
      expect(calculateLevel(250)).toBe(2)
    })

    it('returns level 3 at 600 XP', () => {
      expect(calculateLevel(600)).toBe(3)
    })

    it('returns level 12 for very high XP', () => {
      expect(calculateLevel(50000)).toBe(12)
    })

    it('handles edge cases at level boundaries', () => {
      expect(calculateLevel(249)).toBe(1)
      expect(calculateLevel(250)).toBe(2)
      expect(calculateLevel(599)).toBe(2)
      expect(calculateLevel(600)).toBe(3)
    })
  })

  describe('getNextLevelRequirements', () => {
    it('returns next level info for non-max level', () => {
      const result = getNextLevelRequirements(1, 100)
      
      expect(result).not.toBeNull()
      expect(result?.nextLevel).toBe(2)
      expect(result?.xpNeeded).toBe(150) // 250 - 100
      expect(result?.progress).toBeCloseTo(0.4) // 100/250
    })

    it('returns null for max level', () => {
      const result = getNextLevelRequirements(12, 15000)
      expect(result).toBeNull()
    })

    it('calculates progress correctly', () => {
      // Test the actual progress calculation
      const result = getNextLevelRequirements(2, 400)
      expect(result?.progress).toBeGreaterThan(0)
      expect(result?.progress).toBeLessThan(1)
    })
  })

  describe('awardXP', () => {
    const baseProgress: UserProgress = {
      currentLevel: 1,
      currentXP: 0,
      totalXP: 0,
      selectedTechPath: 'general_contractor',
      unlockedFeatures: [],
      completedActions: [],
      onboardingComplete: false,
    }

    it('awards XP correctly', () => {
      const result = awardXP(baseProgress, 'parseReceipt')
      
      expect(result.newProgress.currentXP).toBe(5)
      expect(result.newProgress.totalXP).toBe(5)
      expect(result.xpGained).toBe(5)
    })

    it('detects level up', () => {
      const progress: UserProgress = {
        ...baseProgress,
        currentXP: 245,
        totalXP: 245,
      }
      
      const result = awardXP(progress, 'parseReceipt') // +5 XP = 250 = Level 2
      
      expect(result.leveledUp).toBe(true)
      expect(result.newProgress.currentLevel).toBe(2)
    })

    it('tracks completed actions', () => {
      const result = awardXP(baseProgress, 'uploadFirstReceipt')
      
      expect(result.newProgress.completedActions).toContain('uploadFirstReceipt')
    })
  })
})
