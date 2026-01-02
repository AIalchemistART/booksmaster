/**
 * IndexedDB Cache Manager
 * Provides fast local caching for receipts, transactions, and images
 */

const DB_NAME = 'thomas-books-cache'
const DB_VERSION = 1

// Store names
const STORES = {
  RECEIPTS: 'receipts',
  TRANSACTIONS: 'transactions',
  IMAGES: 'images',
  METADATA: 'metadata'
} as const

type StoreName = typeof STORES[keyof typeof STORES]

interface CacheMetadata {
  key: string
  lastUpdated: string
  size: number
  ttl?: number // Time to live in ms
}

let dbInstance: IDBDatabase | null = null

/**
 * Open the IndexedDB database
 */
export async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error)
      reject(request.error)
    }
    
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Create object stores
      if (!db.objectStoreNames.contains(STORES.RECEIPTS)) {
        const receiptStore = db.createObjectStore(STORES.RECEIPTS, { keyPath: 'id' })
        receiptStore.createIndex('driveFileId', 'driveFileId', { unique: false })
        receiptStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
      
      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const txStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' })
        txStore.createIndex('date', 'date', { unique: false })
        txStore.createIndex('category', 'category', { unique: false })
      }
      
      if (!db.objectStoreNames.contains(STORES.IMAGES)) {
        db.createObjectStore(STORES.IMAGES, { keyPath: 'id' })
      }
      
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
      }
    }
  })
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

/**
 * Generic get from store
 */
async function getFromStore<T>(storeName: StoreName, key: string): Promise<T | null> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

/**
 * Generic put to store
 */
async function putToStore<T extends { id: string }>(
  storeName: StoreName,
  data: T
): Promise<void> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(data)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Generic delete from store
 */
async function deleteFromStore(storeName: StoreName, key: string): Promise<void> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get all items from a store
 */
async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

/**
 * Clear all items from a store
 */
async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Receipt-specific methods
export const receiptCache = {
  get: (id: string) => getFromStore<any>(STORES.RECEIPTS, id),
  put: (receipt: any) => putToStore(STORES.RECEIPTS, receipt),
  delete: (id: string) => deleteFromStore(STORES.RECEIPTS, id),
  getAll: () => getAllFromStore<any>(STORES.RECEIPTS),
  clear: () => clearStore(STORES.RECEIPTS),
  
  async bulkPut(receipts: any[]): Promise<void> {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.RECEIPTS, 'readwrite')
      const store = transaction.objectStore(STORES.RECEIPTS)
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      
      receipts.forEach(receipt => store.put(receipt))
    })
  }
}

// Transaction-specific methods
export const transactionCache = {
  get: (id: string) => getFromStore<any>(STORES.TRANSACTIONS, id),
  put: (tx: any) => putToStore(STORES.TRANSACTIONS, tx),
  delete: (id: string) => deleteFromStore(STORES.TRANSACTIONS, id),
  getAll: () => getAllFromStore<any>(STORES.TRANSACTIONS),
  clear: () => clearStore(STORES.TRANSACTIONS),
  
  async bulkPut(transactions: any[]): Promise<void> {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRANSACTIONS, 'readwrite')
      const store = transaction.objectStore(STORES.TRANSACTIONS)
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      
      transactions.forEach(tx => store.put(tx))
    })
  },
  
  async getByDateRange(startDate: string, endDate: string): Promise<any[]> {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRANSACTIONS, 'readonly')
      const store = transaction.objectStore(STORES.TRANSACTIONS)
      const index = store.index('date')
      const range = IDBKeyRange.bound(startDate, endDate)
      const request = index.getAll(range)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }
}

// Image cache (for receipt images)
export const imageCache = {
  async get(id: string): Promise<string | null> {
    const result = await getFromStore<{ id: string; data: string }>(STORES.IMAGES, id)
    return result?.data || null
  },
  
  async put(id: string, imageData: string): Promise<void> {
    await putToStore(STORES.IMAGES, { id, data: imageData })
  },
  
  delete: (id: string) => deleteFromStore(STORES.IMAGES, id),
  clear: () => clearStore(STORES.IMAGES),
  
  async getSize(): Promise<number> {
    const images = await getAllFromStore<{ id: string; data: string }>(STORES.IMAGES)
    return images.reduce((total, img) => total + (img.data?.length || 0), 0)
  }
}

// Metadata cache
export const metadataCache = {
  async get(key: string): Promise<CacheMetadata | null> {
    return getFromStore<CacheMetadata>(STORES.METADATA, key)
  },
  
  async set(key: string, size: number, ttl?: number): Promise<void> {
    await putToStore(STORES.METADATA, {
      id: key, // Use 'id' for keyPath compatibility
      key,
      lastUpdated: new Date().toISOString(),
      size,
      ttl
    } as any)
  },
  
  async isExpired(key: string): Promise<boolean> {
    const meta = await this.get(key)
    if (!meta || !meta.ttl) return false
    
    const lastUpdated = new Date(meta.lastUpdated).getTime()
    const now = Date.now()
    return now - lastUpdated > meta.ttl
  }
}

/**
 * Get total cache size
 */
export async function getCacheSize(): Promise<{
  receipts: number
  transactions: number
  images: number
  total: number
}> {
  const [receipts, transactions, imageSize] = await Promise.all([
    receiptCache.getAll(),
    transactionCache.getAll(),
    imageCache.getSize()
  ])
  
  const receiptsSize = JSON.stringify(receipts).length
  const transactionsSize = JSON.stringify(transactions).length
  
  return {
    receipts: receiptsSize,
    transactions: transactionsSize,
    images: imageSize,
    total: receiptsSize + transactionsSize + imageSize
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  await Promise.all([
    receiptCache.clear(),
    transactionCache.clear(),
    imageCache.clear(),
    clearStore(STORES.METADATA)
  ])
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}
