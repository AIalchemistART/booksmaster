/**
 * Electron-specific file system storage adapter
 * Uses Node.js fs module via IPC instead of File System Access API
 */

import type { Receipt, Invoice, Transaction, CustodyExpense, CategorizationCorrection } from '@/types'

// Type definitions for Electron API
interface ElectronAPI {
  selectDirectory: () => Promise<{ success: boolean; path?: string }>
  getRootDirectory: () => Promise<string | null>
  fsExists: (path: string) => Promise<boolean>
  fsMkdir: (path: string) => Promise<{ success: boolean; error?: string }>
  fsWriteFile: (path: string, data: string) => Promise<{ success: boolean; error?: string }>
  fsWriteBinary: (path: string, dataUrl: string) => Promise<{ success: boolean; error?: string }>
  fsReadFile: (path: string) => Promise<{ success: boolean; data?: string; error?: string }>
  fsReadBinary: (path: string) => Promise<{ success: boolean; data?: string; error?: string }>
  fsReaddir: (path: string) => Promise<{ success: boolean; files?: string[]; error?: string }>
  fsDeleteFile: (path: string) => Promise<{ success: boolean; error?: string }>
  clearAllAppData: () => Promise<{ success: boolean; error?: string }>
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

/**
 * Check if running in Electron
 */
export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && window.electronAPI?.isElectron === true
}

/**
 * Get Electron API (throws if not in Electron)
 */
function getElectronAPI(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error('Not running in Electron environment')
  }
  return window.electronAPI
}

/**
 * Setup file system storage (Electron version)
 * Prompts user to select a folder
 */
export async function setupFileSystemStorage(): Promise<boolean> {
  try {
    const api = getElectronAPI()
    const result = await api.selectDirectory()
    
    if (result.success && result.path) {
      // console.log('[ELECTRON FS] Root directory selected:', result.path)
      
      // Create folder structure
      await api.fsMkdir('receipts/images')
      await api.fsMkdir('receipts/data')
      await api.fsMkdir('invoices/images')
      await api.fsMkdir('invoices/data')
      await api.fsMkdir('transactions')
      await api.fsMkdir('custody-expenses')
      await api.fsMkdir('backups')
      
      return true
    }
    
    return false
  } catch (error) {
    console.error('[ELECTRON FS] Error setting up file system:', error)
    return false
  }
}

/**
 * Check if root directory is configured
 */
export async function isFileSystemConfigured(): Promise<boolean> {
  try {
    const api = getElectronAPI()
    const rootDir = await api.getRootDirectory()
    return rootDir !== null
  } catch (error) {
    return false
  }
}

/**
 * Get root directory path
 */
export async function getRootDirectoryPath(): Promise<string | null> {
  try {
    const api = getElectronAPI()
    return await api.getRootDirectory()
  } catch (error) {
    return null
  }
}

/**
 * Save receipts to file system
 */
export async function saveReceiptsToFileSystem(receipts: Receipt[]): Promise<void> {
  try {
    const api = getElectronAPI()
    const rootDir = await api.getRootDirectory()
    
    if (!rootDir) {
      console.warn('[ELECTRON FS] No root directory configured')
      return
    }
    
    // console.log(`[ELECTRON FS] Saving ${receipts.length} receipts...`)
    
    // Save each receipt's image
    for (const receipt of receipts) {
      if (receipt.imageData) {
        const imagePath = `receipts/images/${receipt.id}.jpg`
        const result = await api.fsWriteBinary(imagePath, receipt.imageData)
        if (!result.success) {
          console.error(`[ELECTRON FS] Error saving receipt image ${receipt.id}:`, result.error)
        }
      }
    }
    
    // Save metadata (without images to save space)
    const metadata = receipts.map(({ imageData, ...receipt }) => receipt)
    const metadataPath = 'receipts/data/receipts.json'
    const result = await api.fsWriteFile(metadataPath, JSON.stringify(metadata, null, 2))
    
    if (result.success) {
      // console.log('[ELECTRON FS] Receipts saved successfully')
    } else {
      console.error('[ELECTRON FS] Error saving receipts metadata:', result.error)
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error saving receipts:', error)
    throw error
  }
}

/**
 * Load receipt images from file system
 */
export async function loadReceiptImagesFromFileSystem(receipts: Receipt[]): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()
  
  try {
    const api = getElectronAPI()
    const rootDir = await api.getRootDirectory()
    
    if (!rootDir) {
      console.warn('[ELECTRON FS] No root directory configured')
      return imageMap
    }
    
    // console.log('[ELECTRON FS] Loading receipt images...')
    
    // Check if images directory exists
    const imagesExist = await api.fsExists('receipts/images')
    if (!imagesExist) {
      // console.log('[ELECTRON FS] No receipt images directory found')
      return imageMap
    }
    
    // Load each receipt's image
    for (const receipt of receipts) {
      const imagePath = `receipts/images/${receipt.id}.jpg`
      const exists = await api.fsExists(imagePath)
      
      if (exists) {
        const result = await api.fsReadBinary(imagePath)
        if (result.success && result.data) {
          imageMap.set(receipt.id, result.data)
        }
      }
    }
    
    // console.log(`[ELECTRON FS] Loaded ${imageMap.size} receipt images`)
    return imageMap
  } catch (error) {
    console.error('[ELECTRON FS] Error loading receipt images:', error)
    return imageMap
  }
}

/**
 * Save invoices to file system
 */
export async function saveInvoicesToFileSystem(invoices: Invoice[]): Promise<void> {
  try {
    const api = getElectronAPI()
    const rootDir = await api.getRootDirectory()
    
    if (!rootDir) {
      console.warn('[ELECTRON FS] No root directory configured')
      return
    }
    
    // console.log(`[ELECTRON FS] Saving ${invoices.length} invoices...`)
    
    const metadataPath = 'invoices/data/invoices.json'
    const result = await api.fsWriteFile(metadataPath, JSON.stringify(invoices, null, 2))
    
    if (result.success) {
      // console.log('[ELECTRON FS] Invoices saved successfully')
    } else {
      console.error('[ELECTRON FS] Error saving invoices:', result.error)
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error saving invoices:', error)
    throw error
  }
}

/**
 * Save transactions to file system
 */
export async function saveTransactionsToFileSystem(transactions: Transaction[]): Promise<void> {
  try {
    const api = getElectronAPI()
    const rootDir = await api.getRootDirectory()
    
    if (!rootDir) {
      console.warn('[ELECTRON FS] No root directory configured')
      return
    }
    
    // console.log(`[ELECTRON FS] Saving ${transactions.length} transactions...`)
    
    const filePath = 'transactions/transactions.json'
    const result = await api.fsWriteFile(filePath, JSON.stringify(transactions, null, 2))
    
    if (result.success) {
      // console.log('[ELECTRON FS] Transactions saved successfully')
    } else {
      console.error('[ELECTRON FS] Error saving transactions:', result.error)
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error saving transactions:', error)
    throw error
  }
}

/**
 * Save custody expenses to file system
 */
export async function saveCustodyExpensesToFileSystem(expenses: CustodyExpense[]): Promise<void> {
  try {
    const api = getElectronAPI()
    const rootDir = await api.getRootDirectory()
    
    if (!rootDir) {
      console.warn('[ELECTRON FS] No root directory configured')
      return
    }
    
    // console.log(`[ELECTRON FS] Saving ${expenses.length} custody expenses...`)
    
    const filePath = 'custody-expenses/custody-expenses.json'
    const result = await api.fsWriteFile(filePath, JSON.stringify(expenses, null, 2))
    
    if (result.success) {
      // console.log('[ELECTRON FS] Custody expenses saved successfully')
    } else {
      console.error('[ELECTRON FS] Error saving custody expenses:', result.error)
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error saving custody expenses:', error)
    throw error
  }
}

/**
 * Save categorization corrections to file system
 */
export async function saveCorrectionsToFileSystem(corrections: CategorizationCorrection[]): Promise<void> {
  try {
    const api = getElectronAPI()
    // console.log(`[ELECTRON FS] Saving ${corrections.length} categorization corrections...`)
    
    const filePath = 'ai-learning/categorization-corrections.json'
    const result = await api.fsWriteFile(filePath, JSON.stringify(corrections, null, 2))
    
    if (result.success) {
      // console.log('[ELECTRON FS] Categorization corrections saved successfully')
    } else {
      console.error('[ELECTRON FS] Error saving corrections:', result.error)
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error saving corrections:', error)
    throw error
  }
}

/**
 * Load categorization corrections from file system
 */
export async function loadCorrectionsFromFileSystem(): Promise<CategorizationCorrection[]> {
  try {
    const api = getElectronAPI()
    // console.log('[ELECTRON FS] Loading categorization corrections...')
    
    const filePath = 'ai-learning/categorization-corrections.json'
    const result = await api.fsReadFile(filePath)
    
    if (result.success && result.data) {
      const corrections = JSON.parse(result.data)
      // console.log(`[ELECTRON FS] Loaded ${corrections.length} corrections`)
      return corrections
    } else {
      // console.log('[ELECTRON FS] No corrections file found, returning empty array')
      return []
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error loading corrections:', error)
    return []
  }
}

/**
 * Save card payment type mappings to file system
 */
export async function saveCardPaymentMappingsToFileSystem(mappings: any[]): Promise<void> {
  try {
    const api = getElectronAPI()
    // console.log(`[ELECTRON FS] Saving ${mappings.length} card payment type mappings...`)
    
    const filePath = 'ai-learning/card-payment-mappings.json'
    const result = await api.fsWriteFile(filePath, JSON.stringify(mappings, null, 2))
    
    if (result.success) {
      // console.log('[ELECTRON FS] Card payment mappings saved successfully')
    } else {
      console.error('[ELECTRON FS] Failed to save card payment mappings:', result.error)
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error saving card payment mappings:', error)
    throw error
  }
}

/**
 * Load card payment type mappings from file system
 */
export async function loadCardPaymentMappingsFromFileSystem(): Promise<any[]> {
  try {
    const api = getElectronAPI()
    // console.log('[ELECTRON FS] Loading card payment type mappings...')
    
    const filePath = 'ai-learning/card-payment-mappings.json'
    const result = await api.fsReadFile(filePath)
    
    if (result.success && result.data) {
      const mappings = JSON.parse(result.data)
      // console.log(`[ELECTRON FS] Loaded ${mappings.length} card payment mappings`)
      return mappings
    } else {
      // console.log('[ELECTRON FS] No card payment mappings file found, returning empty array')
      return []
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error loading card payment mappings:', error)
    return []
  }
}

/**
 * Delete all data files from file system
 */
export async function deleteAllFiles(): Promise<void> {
  try {
    const api = getElectronAPI()
    const rootDir = await api.getRootDirectory()
    
    if (!rootDir) {
      throw new Error('No root directory configured')
    }
    
    // console.log('[ELECTRON FS] Deleting all data files...')
    
    // List of all data files to delete
    const filesToDelete = [
      'receipts/data/receipts.json',
      'invoices/data/invoices.json',
      'transactions/transactions.json',
      'custody-expenses/custody-expenses.json',
      'ai-learning/categorization-corrections.json'
    ]
    
    // Delete all data files
    for (const filePath of filesToDelete) {
      try {
        const result = await api.fsDeleteFile(filePath)
        if (result.success) {
          // console.log(`[ELECTRON FS] Deleted ${filePath}`)
        }
      } catch (error) {
        console.warn(`[ELECTRON FS] Could not delete ${filePath}:`, error)
      }
    }
    
    // Delete all receipt images
    try {
      const imagesResult = await api.fsReaddir('receipts/images')
      if (imagesResult.success && imagesResult.files) {
        for (const file of imagesResult.files) {
          await api.fsDeleteFile(`receipts/images/${file}`)
        }
        // console.log(`[ELECTRON FS] Deleted ${imagesResult.files.length} receipt images`)
      }
    } catch (error) {
      console.warn('[ELECTRON FS] Could not delete receipt images:', error)
    }
    
    // Delete all invoice images
    try {
      const invoiceImagesResult = await api.fsReaddir('invoices/images')
      if (invoiceImagesResult.success && invoiceImagesResult.files) {
        for (const file of invoiceImagesResult.files) {
          await api.fsDeleteFile(`invoices/images/${file}`)
        }
        // console.log(`[ELECTRON FS] Deleted ${invoiceImagesResult.files.length} invoice images`)
      }
    } catch (error) {
      console.warn('[ELECTRON FS] Could not delete invoice images:', error)
    }
    
    // console.log('[ELECTRON FS] All data files deleted successfully')
  } catch (error) {
    console.error('[ELECTRON FS] Error deleting files:', error)
    throw error
  }
}

/**
 * Create full backup
 */
export async function createFullBackup(): Promise<void> {
  try {
    const api = getElectronAPI()
    const rootDir = await api.getRootDirectory()
    
    if (!rootDir) {
      throw new Error('No root directory configured')
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `backups/backup-${timestamp}.json`
    
    // Read all data files
    const receiptsResult = await api.fsReadFile('receipts/data/receipts.json')
    const invoicesResult = await api.fsReadFile('invoices/data/invoices.json')
    const transactionsResult = await api.fsReadFile('transactions/transactions.json')
    const expensesResult = await api.fsReadFile('custody-expenses/custody-expenses.json')
    const correctionsResult = await api.fsReadFile('ai-learning/categorization-corrections.json')
    
    const backup = {
      timestamp,
      receipts: receiptsResult.success ? JSON.parse(receiptsResult.data!) : [],
      invoices: invoicesResult.success ? JSON.parse(invoicesResult.data!) : [],
      transactions: transactionsResult.success ? JSON.parse(transactionsResult.data!) : [],
      custodyExpenses: expensesResult.success ? JSON.parse(expensesResult.data!) : [],
      categorizationCorrections: correctionsResult.success ? JSON.parse(correctionsResult.data!) : []
    }
    
    const result = await api.fsWriteFile(backupPath, JSON.stringify(backup, null, 2))
    
    if (result.success) {
      // console.log('[ELECTRON FS] Full backup created:', backupPath)
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('[ELECTRON FS] Error creating backup:', error)
    throw error
  }
}

/**
 * Clear all app data including localStorage via Electron session
 */
export async function clearAllAppData(): Promise<void> {
  try {
    const api = getElectronAPI()
    const result = await api.clearAllAppData()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to clear app data')
    }
    
    // console.log('[ELECTRON FS] All app data cleared successfully')
  } catch (error) {
    console.error('[ELECTRON FS] Error clearing app data:', error)
    throw error
  }
}
