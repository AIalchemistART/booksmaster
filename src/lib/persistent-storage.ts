/**
 * Persistent Storage using IndexedDB
 * More reliable than localStorage - survives cache clears, deployments, and browser restarts
 */

const DB_NAME = 'thomas-books-persistent'
const DB_VERSION = 1
const STORE_NAME = 'settings'

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * Get value from persistent storage
 */
export async function getPersistentValue(key: string): Promise<any | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error getting persistent value:', error)
    return null
  }
}

/**
 * Set value in persistent storage
 */
export async function setPersistentValue(key: string, value: any): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(value, key)
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('Error setting persistent value:', error)
    return false
  }
}

/**
 * Delete value from persistent storage
 */
export async function deletePersistentValue(key: string): Promise<boolean> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(key)
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('Error deleting persistent value:', error)
    return false
  }
}

/**
 * Get Gemini API Key from persistent storage (IndexedDB)
 * Falls back to localStorage for migration, then environment variable
 */
export async function getGeminiApiKey(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
  }
  
  // Try IndexedDB first
  const key = await getPersistentValue('gemini_api_key')
  if (key) return key
  
  // Migrate from localStorage if exists
  const localStorageKey = localStorage.getItem('gemini_api_key')
  if (localStorageKey) {
    await setPersistentValue('gemini_api_key', localStorageKey)
    localStorage.removeItem('gemini_api_key') // Clean up old storage
    return localStorageKey
  }
  
  // Fall back to environment variable
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
}

/**
 * Set Gemini API Key in persistent storage (IndexedDB)
 * Also writes to localStorage for backward compatibility with synchronous reads
 */
export async function setGeminiApiKey(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return
  await setPersistentValue('gemini_api_key', apiKey)
  localStorage.setItem('gemini_api_key', apiKey) // Backward compatibility
  console.log('[PERSISTENT] Gemini API key saved to IndexedDB and localStorage')
}

/**
 * Clear Gemini API Key from persistent storage
 */
export async function clearGeminiApiKey(): Promise<void> {
  if (typeof window === 'undefined') return
  await deletePersistentValue('gemini_api_key')
  localStorage.removeItem('gemini_api_key') // Clean up old storage too
  console.log('[PERSISTENT] Gemini API key cleared from IndexedDB')
}

/**
 * Check if Gemini API is configured
 */
export async function isGeminiConfigured(): Promise<boolean> {
  const key = await getGeminiApiKey()
  return key !== null && key.trim() !== ''
}

/**
 * Synchronous wrapper for legacy code - returns promise that resolves to key or null
 * WARNING: This is async, update callers to use await
 */
export function getGeminiApiKeySync(): string | null {
  // For immediate/synchronous access, try localStorage first
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
  }
  return localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
}
