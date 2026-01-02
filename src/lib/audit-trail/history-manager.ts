/**
 * Audit Trail & History Manager
 * Tracks all changes to transactions, receipts, and other entities
 * Supports undo/redo and version comparison
 */

import type { Transaction, Receipt, Invoice } from '@/types'

// Types of entities we track
export type EntityType = 'transaction' | 'receipt' | 'invoice' | 'mileage_trip'

// A single change record
export interface ChangeRecord {
  id: string
  entityType: EntityType
  entityId: string
  action: 'create' | 'update' | 'delete' | 'restore'
  timestamp: string
  userId?: string // For future multi-user support
  
  // State before and after (for undo/redo)
  previousState: Record<string, unknown> | null
  newState: Record<string, unknown> | null
  
  // What specifically changed
  changedFields: string[]
  
  // Human-readable summary
  summary: string
  
  // Optional context
  context?: {
    source?: 'manual' | 'ai' | 'import' | 'bulk'
    relatedEntityIds?: string[]
    notes?: string
  }
}

// Undo/Redo stack
export interface UndoRedoState {
  undoStack: ChangeRecord[]
  redoStack: ChangeRecord[]
  maxStackSize: number
}

// History query options
export interface HistoryQueryOptions {
  entityType?: EntityType
  entityId?: string
  startDate?: string
  endDate?: string
  action?: ChangeRecord['action']
  limit?: number
  offset?: number
}

// Full history state
export interface AuditTrailState {
  changes: ChangeRecord[]
  undoRedo: UndoRedoState
  lastBackupReminder: string | null
  backupReminderIntervalDays: number
}

const INITIAL_STATE: AuditTrailState = {
  changes: [],
  undoRedo: {
    undoStack: [],
    redoStack: [],
    maxStackSize: 50
  },
  lastBackupReminder: null,
  backupReminderIntervalDays: 7
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a human-readable summary of changes
 */
function createChangeSummary(
  action: ChangeRecord['action'],
  entityType: EntityType,
  changedFields: string[],
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null
): string {
  const entityName = entityType.replace('_', ' ')
  
  switch (action) {
    case 'create':
      const desc = newState?.description || newState?.vendor || 'item'
      return `Created ${entityName}: ${desc}`
    
    case 'delete':
      const delDesc = previousState?.description || previousState?.vendor || 'item'
      return `Deleted ${entityName}: ${delDesc}`
    
    case 'restore':
      const restDesc = newState?.description || newState?.vendor || 'item'
      return `Restored ${entityName}: ${restDesc}`
    
    case 'update':
      if (changedFields.length === 1) {
        const field = changedFields[0]
        const oldVal = previousState?.[field]
        const newVal = newState?.[field]
        return `Updated ${field}: "${oldVal}" → "${newVal}"`
      } else {
        return `Updated ${changedFields.length} fields: ${changedFields.join(', ')}`
      }
    
    default:
      return `${action} ${entityName}`
  }
}

/**
 * Detect which fields changed between two states
 */
export function detectChangedFields(
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null
): string[] {
  if (!previousState && !newState) return []
  if (!previousState) return Object.keys(newState || {})
  if (!newState) return Object.keys(previousState)
  
  const allKeys = new Set([...Object.keys(previousState), ...Object.keys(newState)])
  const changed: string[] = []
  
  allKeys.forEach(key => {
    // Skip internal fields
    if (key === 'updatedAt' || key === 'createdAt') return
    
    const prev = JSON.stringify(previousState[key])
    const next = JSON.stringify(newState[key])
    
    if (prev !== next) {
      changed.push(key)
    }
  })
  
  return changed
}

/**
 * Record a change
 */
export function recordChange(
  state: AuditTrailState,
  entityType: EntityType,
  entityId: string,
  action: ChangeRecord['action'],
  previousState: Record<string, unknown> | null,
  newState: Record<string, unknown> | null,
  context?: ChangeRecord['context']
): AuditTrailState {
  const changedFields = detectChangedFields(previousState, newState)
  
  const record: ChangeRecord = {
    id: generateId(),
    entityType,
    entityId,
    action,
    timestamp: new Date().toISOString(),
    previousState,
    newState,
    changedFields,
    summary: createChangeSummary(action, entityType, changedFields, previousState, newState),
    context
  }
  
  // Add to history
  const newChanges = [...state.changes, record]
  
  // Add to undo stack (clear redo stack on new action)
  const newUndoStack = [...state.undoRedo.undoStack, record]
    .slice(-state.undoRedo.maxStackSize)
  
  return {
    ...state,
    changes: newChanges,
    undoRedo: {
      ...state.undoRedo,
      undoStack: newUndoStack,
      redoStack: [] // Clear redo on new action
    }
  }
}

/**
 * Get the last undoable action
 */
export function getUndoAction(state: AuditTrailState): ChangeRecord | null {
  const { undoStack } = state.undoRedo
  return undoStack.length > 0 ? undoStack[undoStack.length - 1] : null
}

/**
 * Get the last redoable action
 */
export function getRedoAction(state: AuditTrailState): ChangeRecord | null {
  const { redoStack } = state.undoRedo
  return redoStack.length > 0 ? redoStack[redoStack.length - 1] : null
}

/**
 * Pop from undo stack and push to redo
 */
export function performUndo(state: AuditTrailState): {
  newState: AuditTrailState
  actionToUndo: ChangeRecord | null
} {
  const action = getUndoAction(state)
  if (!action) {
    return { newState: state, actionToUndo: null }
  }
  
  const newUndoStack = state.undoRedo.undoStack.slice(0, -1)
  const newRedoStack = [...state.undoRedo.redoStack, action]
    .slice(-state.undoRedo.maxStackSize)
  
  return {
    newState: {
      ...state,
      undoRedo: {
        ...state.undoRedo,
        undoStack: newUndoStack,
        redoStack: newRedoStack
      }
    },
    actionToUndo: action
  }
}

/**
 * Pop from redo stack and push to undo
 */
export function performRedo(state: AuditTrailState): {
  newState: AuditTrailState
  actionToRedo: ChangeRecord | null
} {
  const action = getRedoAction(state)
  if (!action) {
    return { newState: state, actionToRedo: null }
  }
  
  const newRedoStack = state.undoRedo.redoStack.slice(0, -1)
  const newUndoStack = [...state.undoRedo.undoStack, action]
    .slice(-state.undoRedo.maxStackSize)
  
  return {
    newState: {
      ...state,
      undoRedo: {
        ...state.undoRedo,
        undoStack: newUndoStack,
        redoStack: newRedoStack
      }
    },
    actionToRedo: action
  }
}

/**
 * Query history with filters
 */
export function queryHistory(
  state: AuditTrailState,
  options: HistoryQueryOptions = {}
): ChangeRecord[] {
  let results = [...state.changes]
  
  if (options.entityType) {
    results = results.filter(r => r.entityType === options.entityType)
  }
  
  if (options.entityId) {
    results = results.filter(r => r.entityId === options.entityId)
  }
  
  if (options.action) {
    results = results.filter(r => r.action === options.action)
  }
  
  if (options.startDate) {
    results = results.filter(r => r.timestamp >= options.startDate!)
  }
  
  if (options.endDate) {
    results = results.filter(r => r.timestamp <= options.endDate!)
  }
  
  // Sort by timestamp descending (newest first)
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  // Apply pagination
  if (options.offset) {
    results = results.slice(options.offset)
  }
  
  if (options.limit) {
    results = results.slice(0, options.limit)
  }
  
  return results
}

/**
 * Get history for a specific entity
 */
export function getEntityHistory(
  state: AuditTrailState,
  entityType: EntityType,
  entityId: string
): ChangeRecord[] {
  return queryHistory(state, { entityType, entityId })
}

/**
 * Compare two versions of an entity
 */
export function compareVersions(
  record1: ChangeRecord,
  record2: ChangeRecord
): {
  field: string
  oldValue: unknown
  newValue: unknown
}[] {
  const state1 = record1.newState || record1.previousState || {}
  const state2 = record2.newState || record2.previousState || {}
  
  const allKeys = new Set([...Object.keys(state1), ...Object.keys(state2)])
  const diffs: { field: string; oldValue: unknown; newValue: unknown }[] = []
  
  allKeys.forEach(key => {
    if (key === 'updatedAt' || key === 'createdAt' || key === 'id') return
    
    const val1 = state1[key]
    const val2 = state2[key]
    
    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diffs.push({
        field: key,
        oldValue: val1,
        newValue: val2
      })
    }
  })
  
  return diffs
}

/**
 * Check if backup reminder is due
 */
export function isBackupReminderDue(state: AuditTrailState): boolean {
  if (!state.lastBackupReminder) return true
  
  const lastReminder = new Date(state.lastBackupReminder)
  const now = new Date()
  const daysSinceReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24)
  
  return daysSinceReminder >= state.backupReminderIntervalDays
}

/**
 * Mark backup reminder as shown
 */
export function markBackupReminderShown(state: AuditTrailState): AuditTrailState {
  return {
    ...state,
    lastBackupReminder: new Date().toISOString()
  }
}

/**
 * Get history statistics
 */
export function getHistoryStats(state: AuditTrailState): {
  totalChanges: number
  changesByType: Record<EntityType, number>
  changesByAction: Record<string, number>
  undoAvailable: number
  redoAvailable: number
  oldestChange: string | null
  newestChange: string | null
} {
  const changesByType: Record<EntityType, number> = {
    transaction: 0,
    receipt: 0,
    invoice: 0,
    mileage_trip: 0
  }
  
  const changesByAction: Record<string, number> = {
    create: 0,
    update: 0,
    delete: 0,
    restore: 0
  }
  
  state.changes.forEach(change => {
    changesByType[change.entityType]++
    changesByAction[change.action]++
  })
  
  const sortedChanges = [...state.changes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  
  return {
    totalChanges: state.changes.length,
    changesByType,
    changesByAction,
    undoAvailable: state.undoRedo.undoStack.length,
    redoAvailable: state.undoRedo.redoStack.length,
    oldestChange: sortedChanges[0]?.timestamp || null,
    newestChange: sortedChanges[sortedChanges.length - 1]?.timestamp || null
  }
}

export { INITIAL_STATE }
