/**
 * Unified file system adapter that works in both web and Electron environments
 */

import type { Receipt, Invoice, Transaction, CustodyExpense, CategorizationCorrection, CardPaymentTypeMapping } from '@/types'

// Import both implementations
import * as webFS from './file-system-storage'
import * as electronFS from './electron-file-system'

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  return electronFS.isElectronEnvironment()
}

/**
 * Setup file system storage
 */
export async function setupFileSystemStorage(): Promise<boolean> {
  if (isElectron()) {
    console.log('[FS ADAPTER] Using Electron file system')
    return electronFS.setupFileSystemStorage()
  } else {
    console.log('[FS ADAPTER] Using web File System Access API')
    return webFS.setupFileSystemStorage()
  }
}

/**
 * Check if file system is configured
 */
export async function isFileSystemConfigured(): Promise<boolean> {
  if (isElectron()) {
    return electronFS.isFileSystemConfigured()
  } else {
    const handle = await webFS.loadDirectoryHandle()
    return handle !== null
  }
}

/**
 * Get root directory path (Electron only, returns null for web)
 */
export async function getRootDirectoryPath(): Promise<string | null> {
  if (isElectron()) {
    return electronFS.getRootDirectoryPath()
  } else {
    return null
  }
}

/**
 * Save receipts to file system
 */
export async function saveReceiptsToFileSystem(receipts: Receipt[]): Promise<boolean> {
  if (isElectron()) {
    await electronFS.saveReceiptsToFileSystem(receipts)
    return true
  } else {
    return webFS.saveReceiptsToFileSystem(receipts)
  }
}

/**
 * Load receipt images from file system
 */
export async function loadReceiptImagesFromFileSystem(receipts?: Receipt[]): Promise<Map<string, string>> {
  if (isElectron()) {
    if (!receipts) return new Map()
    return electronFS.loadReceiptImagesFromFileSystem(receipts)
  } else {
    return webFS.loadReceiptImagesFromFileSystem()
  }
}

/**
 * Save invoices to file system
 */
export async function saveInvoicesToFileSystem(invoices: Invoice[]): Promise<boolean> {
  if (isElectron()) {
    await electronFS.saveInvoicesToFileSystem(invoices)
    return true
  } else {
    return webFS.saveInvoicesToFileSystem(invoices)
  }
}

/**
 * Save transactions to file system
 */
export async function saveTransactionsToFileSystem(transactions: Transaction[]): Promise<boolean> {
  if (isElectron()) {
    await electronFS.saveTransactionsToFileSystem(transactions)
    return true
  } else {
    return webFS.saveTransactionsToFileSystem(transactions)
  }
}

/**
 * Save custody expenses to file system
 */
export async function saveCustodyExpensesToFileSystem(expenses: CustodyExpense[]): Promise<boolean> {
  if (isElectron()) {
    await electronFS.saveCustodyExpensesToFileSystem(expenses)
    return true
  } else {
    return webFS.saveCustodyExpensesToFileSystem(expenses)
  }
}

/**
 * Create full backup
 */
export async function createFullBackup(allData?: any): Promise<boolean> {
  if (isElectron()) {
    await electronFS.createFullBackup()
    return true
  } else {
    return webFS.createFullBackup(allData)
  }
}

/**
 * Save categorization corrections to file system
 */
export async function saveCorrectionsToFileSystem(corrections: CategorizationCorrection[]): Promise<boolean> {
  if (isElectron()) {
    await electronFS.saveCorrectionsToFileSystem(corrections)
    return true
  } else {
    return webFS.saveCorrectionsToFileSystem(corrections)
  }
}

/**
 * Load categorization corrections from file system
 */
export async function loadCorrectionsFromFileSystem(): Promise<CategorizationCorrection[]> {
  if (isElectron()) {
    return electronFS.loadCorrectionsFromFileSystem()
  } else {
    return webFS.loadCorrectionsFromFileSystem()
  }
}

/**
 * Save card payment type mappings to file system
 */
export async function saveCardPaymentMappingsToFileSystem(mappings: CardPaymentTypeMapping[]): Promise<boolean> {
  if (isElectron()) {
    await electronFS.saveCardPaymentMappingsToFileSystem(mappings)
    return true
  } else {
    return webFS.saveCardPaymentMappingsToFileSystem(mappings)
  }
}

/**
 * Load card payment type mappings from file system
 */
export async function loadCardPaymentMappingsFromFileSystem(): Promise<CardPaymentTypeMapping[]> {
  if (isElectron()) {
    return electronFS.loadCardPaymentMappingsFromFileSystem()
  } else {
    return webFS.loadCardPaymentMappingsFromFileSystem()
  }
}

/**
 * Delete all data files from file system
 */
export async function deleteAllFiles(): Promise<boolean> {
  if (isElectron()) {
    await electronFS.deleteAllFiles()
    return true
  } else {
    return webFS.deleteAllFiles()
  }
}

/**
 * Check if File System Access API is supported (web only)
 */
export function isFileSystemAccessSupported(): boolean {
  if (isElectron()) {
    return true // Electron always supports file system access
  } else {
    return webFS.isFileSystemAccessSupported()
  }
}

/**
 * Clear all app data (Electron only - clears localStorage via session)
 */
export async function clearAllAppData(): Promise<boolean> {
  if (isElectron()) {
    await electronFS.clearAllAppData()
    return true
  }
  // Web version doesn't need this - localStorage.removeItem works directly
  return false
}
