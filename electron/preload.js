const { contextBridge, ipcRenderer } = require('electron')

console.log('[PRELOAD] Preload script starting - EARLY LOGGING')

// Add resource loading listeners BEFORE page loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('[PRELOAD] DOM Content Loaded')
  console.log('[PRELOAD] document.styleSheets.length:', document.styleSheets.length)
  
  const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
  console.log('[PRELOAD] CSS link count:', cssLinks.length)
  cssLinks.forEach((link, i) => {
    console.log(`[PRELOAD] CSS link ${i}:`, link.href)
  })
})

// Capture resource loading errors
window.addEventListener('error', (e) => {
  if (e.target && (e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT')) {
    console.error('[PRELOAD ERROR] Failed to load resource:', e.target.tagName, e.target.href || e.target.src)
  }
}, true)

console.log('[PRELOAD] Event listeners registered')

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Directory selection
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getRootDirectory: () => ipcRenderer.invoke('get-root-directory'),
  
  // File system operations
  fsExists: (path) => ipcRenderer.invoke('fs-exists', path),
  fsMkdir: (path) => ipcRenderer.invoke('fs-mkdir', path),
  fsWriteFile: (path, data) => ipcRenderer.invoke('fs-write-file', path, data),
  fsWriteBinary: (path, dataUrl) => ipcRenderer.invoke('fs-write-binary', path, dataUrl),
  fsReadFile: (path) => ipcRenderer.invoke('fs-read-file', path),
  fsReadBinary: (path) => ipcRenderer.invoke('fs-read-binary', path),
  fsReaddir: (path) => ipcRenderer.invoke('fs-readdir', path),
  fsDeleteFile: (path) => ipcRenderer.invoke('fs-delete-file', path),
  
  // Clear all app data (localStorage, cache, etc.)
  clearAllAppData: () => ipcRenderer.invoke('clear-all-app-data'),
  
  // Batch receipt temp folder operations
  saveBatchReceiptImage: (receiptId, imageData) => ipcRenderer.invoke('save-batch-receipt-image', receiptId, imageData),
  loadBatchReceiptImage: (receiptId) => ipcRenderer.invoke('load-batch-receipt-image', receiptId),
  saveBatchReceiptMetadata: (receiptId, metadata) => ipcRenderer.invoke('save-batch-receipt-metadata', receiptId, metadata),
  loadBatchReceiptMetadata: (receiptId) => ipcRenderer.invoke('load-batch-receipt-metadata', receiptId),
  deleteBatchReceiptImage: (receiptId) => ipcRenderer.invoke('delete-batch-receipt-image', receiptId),
  clearBatchReceiptTemp: () => ipcRenderer.invoke('clear-batch-receipt-temp'),
  
  // Print with preview
  printPreview: (htmlContent) => ipcRenderer.invoke('print-preview', htmlContent),
  
  // Open external URLs in default browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Environment check
  isElectron: true
})

console.log('[ELECTRON] Preload script loaded')
