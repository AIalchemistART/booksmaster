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
 * Prompt user to select the root Thomas Books folder
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
      // Verify we still have permission
      const permission = await (handle as any).queryPermission({ mode: 'readwrite' })
      if (permission === 'granted') {
        rootDirHandle = handle
        return handle
      }
    }
    return null
  } catch (error) {
    console.error('Error loading directory handle:', error)
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
 * Save receipts data to file system
 */
export async function saveReceiptsToFileSystem(receipts: any[]): Promise<boolean> {
  try {
    const rootDir = await getRootDirectory()
    if (!rootDir) return false

    const receiptsDir = await rootDir.getDirectoryHandle('receipts', { create: true })
    const dataDir = await receiptsDir.getDirectoryHandle('data', { create: true })
    const imagesDir = await receiptsDir.getDirectoryHandle('images', { create: true })

    // Save index file with all receipt metadata
    const indexFile = await dataDir.getFileHandle('receipts-index.json', { create: true })
    const writable = await indexFile.createWritable()
    await writable.write(JSON.stringify(receipts, null, 2))
    await writable.close()

    // Save individual receipt images if they have imageData
    for (const receipt of receipts) {
      if (receipt.imageData) {
        try {
          const filename = `receipt-${receipt.id}.jpg`
          const imageFile = await imagesDir.getFileHandle(filename, { create: true })
          
          // Convert data URL to blob
          const response = await fetch(receipt.imageData)
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
        } catch (error) {
          console.error(`Error saving receipt ${receipt.id}:`, error)
        }
      }
    }

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
  return handle.name
}
