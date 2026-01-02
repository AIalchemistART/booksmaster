/**
 * File System Storage for Windows
 * Uses File System Access API to save data to local folders
 */

export interface FileSystemConfig {
  rootDirectoryHandle: FileSystemDirectoryHandle | null
  configured: boolean
}

// Store the directory handle in memory (persists across page reloads via IndexedDB)
let rootDirHandle: FileSystemDirectoryHandle | null = null

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'showDirectoryPicker' in window
}

/**
 * Prompt user to select the root Booksmaster folder
 */
export async function setupFileSystemStorage(): Promise<boolean> {
  try {
    if (!isFileSystemAccessSupported()) {
      console.warn('File System Access API not supported in this browser')
      return false
    }

    // Prompt user to select directory
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    })

    // Store the directory handle
    rootDirHandle = dirHandle
    
    // Save to IndexedDB for persistence
    await saveDirectoryHandle(dirHandle)

    // Create folder structure
    await createFolderStructure(dirHandle)

    return true
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('User cancelled folder selection')
    } else if ((error as Error).message?.includes('system files')) {
      alert('Cannot select this folder - it contains system files. Please create a new folder in your Documents directory (e.g., C:\\Users\\YourName\\Documents\\Thomas-Books) and select that instead.')
    } else {
      console.error('Error setting up file system storage:', error)
      alert('Error setting up file system storage. Please try selecting a folder in your Documents directory.')
    }
    return false
  }
}

/**
 * Create the folder structure
 */
async function createFolderStructure(rootDir: FileSystemDirectoryHandle) {
  const folders = [
    'receipts',
    'receipts/images',
    'receipts/data',
    'invoices',
    'transactions',
    'custody-expenses',
    'reports',
    'backups',
  ]

  for (const folderPath of folders) {
    const parts = folderPath.split('/')
    let currentDir = rootDir

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true })
    }
  }
}

/**
 * Save directory handle to IndexedDB for persistence
 */
async function saveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  const db = await openDB()
  const tx = db.transaction('fileSystem', 'readwrite')
  const store = tx.objectStore('fileSystem')
  store.put(handle, 'rootDirectory')
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Load directory handle from IndexedDB
 */
export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    const tx = db.transaction('fileSystem', 'readonly')
    const store = tx.objectStore('fileSystem')
    const request = store.get('rootDirectory')
    
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as FileSystemDirectoryHandle | null)
      request.onerror = () => reject(request.error)
    })
    
    if (handle) {
      console.log('[FILE SYSTEM] Found stored directory handle, checking permissions...')
      
      // Check current permission state
      let permission = await (handle as any).queryPermission({ mode: 'readwrite' })
      console.log('[FILE SYSTEM] Permission state:', permission)
      
      // If permission is 'prompt', request it automatically
      if (permission === 'prompt') {
        console.log('[FILE SYSTEM] Permission not granted, requesting...')
        permission = await (handle as any).requestPermission({ mode: 'readwrite' })
        console.log('[FILE SYSTEM] Permission after request:', permission)
      }
      
      if (permission === 'granted') {
        console.log('[FILE SYSTEM] Permission granted, directory handle ready')
        rootDirHandle = handle
        return handle
      } else {
        console.warn('[FILE SYSTEM] Permission denied, cannot access directory')
      }
    } else {
      console.log('[FILE SYSTEM] No stored directory handle found')
    }
    return null
  } catch (error) {
    console.error('[FILE SYSTEM] Error loading directory handle:', error)
    return null
  }
}

/**
 * Open IndexedDB for storing file handles
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('thomas-books-fs', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('fileSystem')) {
        db.createObjectStore('fileSystem')
      }
    }
  })
}

/**
 * Get or setup root directory
 */
async function getRootDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (rootDirHandle) return rootDirHandle
  
  // Try to load from IndexedDB
  const handle = await loadDirectoryHandle()
  if (handle) return handle
  
  return null
}

/**
 * Load receipt images from file system
 * Returns a map of receipt ID to image data URL
 */
export async function loadReceiptImagesFromFileSystem(): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()
  
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) {
      console.warn('No root directory configured - cannot load receipt images')
      return imageMap
    }

    const receiptsDir = await rootDir.getDirectoryHandle('receipts', { create: false })
    const imagesDir = await receiptsDir.getDirectoryHandle('images', { create: false })
    
    // Iterate through all image files
    for await (const entry of (imagesDir as any).values()) {
      if (entry.kind === 'file' && entry.name.startsWith('receipt-') && entry.name.endsWith('.jpg')) {
        try {
          // Extract receipt ID from filename (receipt-{id}.jpg)
          const receiptId = entry.name.replace('receipt-', '').replace('.jpg', '')
          
          const fileHandle = await imagesDir.getFileHandle(entry.name, { create: false })
          const file = await fileHandle.getFile()
          
          // Convert file to data URL
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          
          imageMap.set(receiptId, dataUrl)
        } catch (error) {
          console.warn(`Could not load image for ${entry.name}:`, error)
        }
      }
    }
    
    console.log(`[FILE SYSTEM] Loaded ${imageMap.size} receipt images from file system`)
    return imageMap
  } catch (error) {
    console.error('Error loading receipt images from file system:', error)
    return imageMap
  }
}

/**
 * Save receipts data to file system
 */
export async function saveReceiptsToFileSystem(receipts: any[]): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) {
      console.warn('No root directory configured - skipping file system save')
      return false
    }

    const receiptsDir = await rootDir.getDirectoryHandle('receipts', { create: true })
    const dataDir = await receiptsDir.getDirectoryHandle('data', { create: true })
    const imagesDir = await receiptsDir.getDirectoryHandle('images', { create: true })

    // Save index file with all receipt metadata
    const indexFile = await dataDir.getFileHandle('receipts-index.json', { create: true })
    const writable = await indexFile.createWritable()
    await writable.write(JSON.stringify(receipts, null, 2))
    await writable.close()

    // Save individual receipt images if they have imageData
    // Process sequentially to avoid overwhelming file system
    let successCount = 0
    let failCount = 0
    
    for (const receipt of receipts) {
      if (receipt.imageData) {
        try {
          const filename = `receipt-${receipt.id}.jpg`
          const imageFile = await imagesDir.getFileHandle(filename, { create: true })
          
          // Convert data URL to blob with error handling
          const response = await fetch(receipt.imageData)
          if (!response.ok) {
            throw new Error(`Failed to fetch image data: ${response.statusText}`)
          }
          const blob = await response.blob()
          
          const imageWritable = await imageFile.createWritable()
          await imageWritable.write(blob)
          await imageWritable.close()

          // Save metadata JSON for this receipt
          const metadataFilename = `receipt-${receipt.id}.json`
          const metadataFile = await dataDir.getFileHandle(metadataFilename, { create: true })
          const metadataWritable = await metadataFile.createWritable()
          
          const metadata = { ...receipt, imageData: undefined, imageFilename: filename }
          await metadataWritable.write(JSON.stringify(metadata, null, 2))
          await metadataWritable.close()
          
          successCount++
        } catch (error) {
          failCount++
          console.error(`Error saving receipt ${receipt.id}:`, error)
          // Continue processing other receipts even if one fails
        }
      }
    }

    console.log(`[FILE SYSTEM] Saved ${successCount} receipt images, ${failCount} failed`)
    return true
  } catch (error) {
    console.error('Error saving receipts to file system:', error)
    return false
  }
}

/**
 * Save invoices data to file system
 */
export async function saveInvoicesToFileSystem(invoices: any[]): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return false

    const invoicesDir = await rootDir.getDirectoryHandle('invoices', { create: true })
    const file = await invoicesDir.getFileHandle('invoices-data.json', { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(invoices, null, 2))
    await writable.close()

    return true
  } catch (error) {
    console.error('Error saving invoices to file system:', error)
    return false
  }
}

/**
 * Save transactions data to file system
 */
export async function saveTransactionsToFileSystem(transactions: any[]): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return false

    const transactionsDir = await rootDir.getDirectoryHandle('transactions', { create: true })
    const file = await transactionsDir.getFileHandle('transactions-data.json', { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(transactions, null, 2))
    await writable.close()

    return true
  } catch (error) {
    console.error('Error saving transactions to file system:', error)
    return false
  }
}

/**
 * Save custody expenses data to file system
 */
export async function saveCustodyExpensesToFileSystem(expenses: any[]): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return false

    const expensesDir = await rootDir.getDirectoryHandle('custody-expenses', { create: true })
    const file = await expensesDir.getFileHandle('custody-expenses-data.json', { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(expenses, null, 2))
    await writable.close()

    return true
  } catch (error) {
    console.error('Error saving custody expenses to file system:', error)
    return false
  }
}

/**
 * Save categorization corrections to file system
 */
export async function saveCorrectionsToFileSystem(corrections: any[]): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return false

    const aiLearningDir = await rootDir.getDirectoryHandle('ai-learning', { create: true })
    const file = await aiLearningDir.getFileHandle('categorization-corrections.json', { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(corrections, null, 2))
    await writable.close()

    console.log(`Saved ${corrections.length} categorization corrections to file system`)
    return true
  } catch (error) {
    console.error('Error saving corrections to file system:', error)
    return false
  }
}

/**
 * Load categorization corrections from file system
 */
export async function loadCorrectionsFromFileSystem(): Promise<any[]> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return []

    const aiLearningDir = await rootDir.getDirectoryHandle('ai-learning', { create: true })
    
    try {
      const file = await aiLearningDir.getFileHandle('categorization-corrections.json')
      const fileData = await file.getFile()
      const text = await fileData.text()
      const corrections = JSON.parse(text)
      console.log(`Loaded ${corrections.length} categorization corrections from file system`)
      return corrections
    } catch (error) {
      console.log('No corrections file found, returning empty array')
      return []
    }
  } catch (error) {
    console.error('Error loading corrections from file system:', error)
    return []
  }
}

/**
 * Save card payment type mappings to file system
 */
export async function saveCardPaymentMappingsToFileSystem(mappings: any[]): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return false

    const aiLearningDir = await rootDir.getDirectoryHandle('ai-learning', { create: true })
    const file = await aiLearningDir.getFileHandle('card-payment-mappings.json', { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(mappings, null, 2))
    await writable.close()

    console.log(`Saved ${mappings.length} card payment type mappings to file system`)
    return true
  } catch (error) {
    console.error('Error saving card payment mappings to file system:', error)
    return false
  }
}

/**
 * Load card payment type mappings from file system
 */
export async function loadCardPaymentMappingsFromFileSystem(): Promise<any[]> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return []

    const aiLearningDir = await rootDir.getDirectoryHandle('ai-learning', { create: true })
    
    try {
      const file = await aiLearningDir.getFileHandle('card-payment-mappings.json')
      const fileData = await file.getFile()
      const text = await fileData.text()
      const mappings = JSON.parse(text)
      console.log(`Loaded ${mappings.length} card payment type mappings from file system`)
      return mappings
    } catch (error) {
      console.log('No card payment mappings file found, returning empty array')
      return []
    }
  } catch (error) {
    console.error('Error loading card payment mappings from file system:', error)
    return []
  }
}

/**
 * Delete all data files from file system
 */
export async function deleteAllFiles(): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return false

    console.log('[WEB FS] Deleting all data files...')

    // Delete data files
    const dataFiles = [
      { dir: 'receipts/data', file: 'receipts.json' },
      { dir: 'invoices/data', file: 'invoices.json' },
      { dir: 'transactions', file: 'transactions.json' },
      { dir: 'custody-expenses', file: 'custody-expenses.json' },
      { dir: 'ai-learning', file: 'categorization-corrections.json' }
    ]

    for (const { dir, file } of dataFiles) {
      try {
        const parts = dir.split('/')
        let currentDir = rootDir
        for (const part of parts) {
          currentDir = await currentDir.getDirectoryHandle(part, { create: false })
        }
        await currentDir.removeEntry(file)
        console.log(`[WEB FS] Deleted ${dir}/${file}`)
      } catch (error) {
        console.warn(`[WEB FS] Could not delete ${dir}/${file}:`, error)
      }
    }

    // Delete receipt images
    try {
      const receiptsDir = await rootDir.getDirectoryHandle('receipts', { create: false })
      const imagesDir = await receiptsDir.getDirectoryHandle('images', { create: false })
      
      let deleteCount = 0
      for await (const entry of (imagesDir as any).values()) {
        if (entry.kind === 'file') {
          await imagesDir.removeEntry(entry.name)
          deleteCount++
        }
      }
      console.log(`[WEB FS] Deleted ${deleteCount} receipt images`)
    } catch (error) {
      console.warn('[WEB FS] Could not delete receipt images:', error)
    }

    // Delete invoice images
    try {
      const invoicesDir = await rootDir.getDirectoryHandle('invoices', { create: false })
      const imagesDir = await invoicesDir.getDirectoryHandle('images', { create: false })
      
      let deleteCount = 0
      for await (const entry of (imagesDir as any).values()) {
        if (entry.kind === 'file') {
          await imagesDir.removeEntry(entry.name)
          deleteCount++
        }
      }
      console.log(`[WEB FS] Deleted ${deleteCount} invoice images`)
    } catch (error) {
      console.warn('[WEB FS] Could not delete invoice images:', error)
    }

    console.log('[WEB FS] All data files deleted successfully')
    return true
  } catch (error) {
    console.error('[WEB FS] Error deleting files:', error)
    return false
  }
}

/**
 * Create a full backup of all data
 */
export async function createFullBackup(allData: any): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return false

    const backupsDir = await rootDir.getDirectoryHandle('backups', { create: true })
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `full-backup-${timestamp}.json`
    
    const file = await backupsDir.getFileHandle(filename, { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(allData, null, 2))
    await writable.close()

    return true
  } catch (error) {
    console.error('Error creating full backup:', error)
    return false
  }
}

/**
 * Check if file system storage is configured
 */
export async function isFileSystemConfigured(): Promise<boolean> {
  const handle = await loadDirectoryHandle()
  return handle !== null
}

/**
 * Get the current folder path (name) if configured
 */
export async function getConfiguredFolderPath(): Promise<string | null> {
  const handle = await loadDirectoryHandle()
  if (!handle) return null
  
  // Log for debugging - File System Access API doesn't expose full paths for security
  console.log('Configured folder handle:', handle.name, handle.kind)
  
  return handle.name
}

/**
 * Verify folder is accessible and log structure
 */
export async function debugFolderStructure(): Promise<void> {
  try {
    const handle = await loadDirectoryHandle()
    if (!handle) {
      console.log('No folder configured')
      return
    }
    
    console.log('=== File System Debug ===')
    console.log('Folder name:', handle.name)
    console.log('Folder kind:', handle.kind)
    
    // List all subdirectories
    const entries: string[] = []
    for await (const entry of (handle as any).values()) {
      entries.push(`${entry.kind === 'directory' ? '📁' : '📄'} ${entry.name}`)
    }
    console.log('Contents:', entries)
    
  } catch (error) {
    console.error('Debug error:', error)
  }
}
