const { contextBridge, ipcRenderer } = require('electron')

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
  
  // Environment check
  isElectron: true
})

console.log('[ELECTRON] Preload script loaded')
