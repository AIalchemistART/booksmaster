const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const heicConvert = require('heic-convert')

let mainWindow = null
let rootDirPath = null

// Store user data path for persistent storage
const userDataPath = app.getPath('userData')
const configPath = path.join(userDataPath, 'config.json')

// Load saved configuration
function loadConfig() {
  try {
    console.log('[ELECTRON] Loading config from:', configPath)
    if (fsSync.existsSync(configPath)) {
      const config = JSON.parse(fsSync.readFileSync(configPath, 'utf-8'))
      rootDirPath = config.rootDirPath
      console.log('[ELECTRON] Config loaded - rootDirPath:', rootDirPath)
    } else {
      console.log('[ELECTRON] No config file found - first run')
    }
  } catch (error) {
    console.error('[ELECTRON] Error loading config:', error)
  }
}

// Save configuration
function saveConfig() {
  try {
    const config = { rootDirPath }
    fsSync.writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('[ELECTRON] Error saving config:', error)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Booksmaster - Contractor Bookkeeping',
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png')
  })

  // Load the Next.js app
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3001')
  } else {
    const indexPath = path.join(process.resourcesPath, 'app', 'out', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  // Handle navigation events
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // If navigating within the app, prevent and manually load
    if (url.startsWith('file://') && !url.includes('index.html')) {
      event.preventDefault()
      
      // Extract the route
      const match = url.match(/\/C:\/([^/?]+)/)
      const route = match ? match[1] : ''
      
      // Handle root route (dashboard)
      if (!route || route === '') {
        const dashboardPath = path.join(process.resourcesPath, 'app', 'out', 'index.html')
        if (fsSync.existsSync(dashboardPath)) {
          mainWindow.loadFile(dashboardPath)
        }
      } else {
        const routePath = path.join(process.resourcesPath, 'app', 'out', route, 'index.html')
        if (fsSync.existsSync(routePath)) {
          mainWindow.loadFile(routePath)
        }
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  loadConfig()
  
  // Intercept file:// protocol for static asset loading
  if (process.env.NODE_ENV !== 'development') {
    protocol.interceptFileProtocol('file', (request, callback) => {
      let fileUrl = request.url.substring(7)
      fileUrl = decodeURIComponent(fileUrl)
      
      // If already in app directory, use as-is
      if (fileUrl.includes('\\app\\out') || fileUrl.includes('/app/out')) {
        const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl
        callback({ path: cleanPath })
        return
      }
      
      // Strip /C:/ prefix
      if (fileUrl.startsWith('/C:/') || fileUrl.startsWith('/C:')) {
        fileUrl = fileUrl.replace(/^\/C:/, '')
      }
      
      // Remove leading slash
      if (fileUrl.startsWith('/')) {
        fileUrl = fileUrl.substring(1)
      }
      
      // Build path to out directory
      let filePath = path.join(process.resourcesPath, 'app', 'out', fileUrl)
      
      // Append index.html for directory paths
      if (fileUrl.endsWith('/') || (!fileUrl.includes('.') && fsSync.existsSync(filePath) && fsSync.statSync(filePath).isDirectory())) {
        filePath = path.join(filePath, 'index.html')
      }
      
      callback({ path: filePath })
    })
  }
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers for file system operations

// Select directory
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Thomas-Books Data Folder'
  })

  if (!result.canceled && result.filePaths.length > 0) {
    rootDirPath = result.filePaths[0]
    saveConfig()
    return { success: true, path: rootDirPath }
  }

  return { success: false }
})

// Get root directory path
ipcMain.handle('get-root-directory', async () => {
  return rootDirPath
})

// Check if file/directory exists
ipcMain.handle('fs-exists', async (event, filePath) => {
  try {
    const fullPath = path.join(rootDirPath, filePath)
    await fs.access(fullPath)
    return true
  } catch {
    return false
  }
})

// Create directory
ipcMain.handle('fs-mkdir', async (event, dirPath) => {
  try {
    const fullPath = path.join(rootDirPath, dirPath)
    await fs.mkdir(fullPath, { recursive: true })
    return { success: true }
  } catch (error) {
    console.error('[ELECTRON] Error creating directory:', error)
    return { success: false, error: error.message }
  }
})

// Write file
ipcMain.handle('fs-write-file', async (event, filePath, data) => {
  try {
    const fullPath = path.join(rootDirPath, filePath)
    const dir = path.dirname(fullPath)
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })
    
    // Write file
    await fs.writeFile(fullPath, data, 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('[ELECTRON] Error writing file:', error)
    return { success: false, error: error.message }
  }
})

// Write binary file (for images)
ipcMain.handle('fs-write-binary', async (event, filePath, dataUrl) => {
  try {
    const fullPath = path.join(rootDirPath, filePath)
    const dir = path.dirname(fullPath)
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true })
    
    // Convert data URL to buffer
    const base64Data = dataUrl.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Write file
    await fs.writeFile(fullPath, buffer)
    return { success: true }
  } catch (error) {
    console.error('[ELECTRON] Error writing binary file:', error)
    return { success: false, error: error.message }
  }
})

// Read file
ipcMain.handle('fs-read-file', async (event, filePath) => {
  try {
    const fullPath = path.join(rootDirPath, filePath)
    const data = await fs.readFile(fullPath, 'utf-8')
    return { success: true, data }
  } catch (error) {
    console.error('[ELECTRON] Error reading file:', error)
    return { success: false, error: error.message }
  }
})

// Read binary file (for images) - returns data URL
ipcMain.handle('fs-read-binary', async (event, filePath) => {
  try {
    const fullPath = path.join(rootDirPath, filePath)
    const buffer = await fs.readFile(fullPath)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64}`
    return { success: true, data: dataUrl }
  } catch (error) {
    console.error('[ELECTRON] Error reading binary file:', error)
    return { success: false, error: error.message }
  }
})

// List directory contents
ipcMain.handle('fs-readdir', async (event, dirPath) => {
  try {
    const fullPath = path.join(rootDirPath, dirPath)
    const files = await fs.readdir(fullPath)
    return { success: true, files }
  } catch (error) {
    console.error('[ELECTRON] Error reading directory:', error)
    return { success: false, error: error.message }
  }
})

// Delete file
ipcMain.handle('fs-delete-file', async (event, filePath) => {
  try {
    const fullPath = path.join(rootDirPath, filePath)
    await fs.unlink(fullPath)
    return { success: true }
  } catch (error) {
    console.error('[ELECTRON] Error deleting file:', error)
    return { success: false, error: error.message }
  }
})

// Clear all app data (localStorage, session, cache)
ipcMain.handle('clear-all-app-data', async () => {
  try {
    console.log('[ELECTRON] Clearing all app data...')
    
    // Clear session storage (includes localStorage)
    if (mainWindow && mainWindow.webContents) {
      const session = mainWindow.webContents.session
      await session.clearStorageData({
        storages: ['localstorage', 'indexdb', 'cachestorage', 'websql']
      })
      console.log('[ELECTRON] Session storage cleared')
    }
    
    // Reset the root directory config
    rootDirPath = null
    try {
      await fs.unlink(configPath)
      console.log('[ELECTRON] Config file deleted')
    } catch (e) {
      // Config file may not exist
    }
    
    return { success: true }
  } catch (error) {
    console.error('[ELECTRON] Error clearing app data:', error)
    return { success: false, error: error.message }
  }
})

// Convert HEIC to JPEG using native heic-convert
ipcMain.handle('convert-heic', async (event, arrayBuffer) => {
  try {
    console.log('[ELECTRON HEIC] Starting HEIC conversion, input size:', arrayBuffer.byteLength)
    
    const outputBuffer = await heicConvert({
      buffer: Buffer.from(arrayBuffer),
      format: 'JPEG',
      quality: 0.92
    })
    
    console.log('[ELECTRON HEIC] Conversion successful, output size:', outputBuffer.byteLength)
    return { 
      success: true, 
      buffer: Array.from(new Uint8Array(outputBuffer))
    }
  } catch (error) {
    console.error('[ELECTRON HEIC] Conversion failed:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
})

