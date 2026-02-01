const { app, BrowserWindow, ipcMain, dialog, protocol, shell } = require('electron')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const os = require('os')
const heicConvert = require('heic-convert')

let mainWindow = null
let rootDirPath = null

// Protocol scheme registration removed - caused Windows compatibility issues

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
      preload: path.join(__dirname, 'preload.js'),
      // CRITICAL FIX: Use named partition to ensure localStorage persists
      partition: 'persist:booksmaster',
      // Disable web security to allow loading local files with absolute paths
      webSecurity: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  })

  // Load the Next.js app
  const isDev = process.env.NODE_ENV === 'development'
  
  console.log('[WINDOW] NODE_ENV:', process.env.NODE_ENV, 'isDev:', isDev)
  
  if (isDev) {
    console.log('[WINDOW] Loading dev URL: http://localhost:3001')
    mainWindow.loadURL('http://localhost:3001')
  } else {
    const indexPath = path.join(process.resourcesPath, 'app', 'out', 'index.html')
    const fileUrl = `file:///${indexPath.replace(/\\/g, '/')}`
    console.log('[WINDOW] Loading production URL:', fileUrl)
    mainWindow.loadURL(fileUrl)
  }
  
  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[WINDOW] Page finished loading')
    
    // Inject visible logging into renderer
    mainWindow.webContents.executeJavaScript(`
      console.log('[RENDERER] Page loaded - checking CSS');
      console.log('[RENDERER] document.styleSheets.length:', document.styleSheets.length);
      console.log('[RENDERER] CSS links:', Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href));
      
      // Log all failed resource loads
      window.addEventListener('error', (e) => {
        if (e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT') {
          console.error('[RENDERER ERROR] Failed to load:', e.target.tagName, e.target.href || e.target.src);
        }
      }, true);
    `).catch(err => console.error('[WINDOW] Failed to inject logging:', err))
  })
  
  // Log loading failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[WINDOW] Page failed to load:', errorCode, errorDescription)
    mainWindow.webContents.executeJavaScript(`
      console.error('[RENDERER] Page load failed:', ${errorCode}, '${errorDescription}');
    `).catch(() => {})
  })

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
  console.log('[ELECTRON STARTUP] App is ready')
  console.log('[ELECTRON STARTUP] process.resourcesPath:', process.resourcesPath)
  console.log('[ELECTRON STARTUP] __dirname:', __dirname)
  
  loadConfig()
  
  console.log('[ELECTRON STARTUP] Creating window')
  createWindow()
  
  // Register protocol interceptor on the window's session AFTER window is created
  const session = mainWindow.webContents.session
  session.protocol.interceptFileProtocol('file', (request, callback) => {
    let url = request.url.substr(7) // Remove 'file://'
    
    // Decode URL
    url = decodeURIComponent(url)
    
    console.log('[PROTOCOL] Intercepted request:', url)
    
    // Handle _next absolute paths
    if (url.includes('/_next/')) {
      const nextPath = url.substring(url.indexOf('/_next/'))
      const fullPath = path.join(process.resourcesPath, 'app', 'out', nextPath)
      const exists = fsSync.existsSync(fullPath)
      console.log('[PROTOCOL] _next path:', nextPath, '→', fullPath, 'exists:', exists)
      callback({ path: fullPath })
      return
    }
    
    // Default: use as-is
    console.log('[PROTOCOL] Using as-is:', url)
    callback({ path: url })
  })
  
  console.log('[ELECTRON STARTUP] Protocol interceptor registered on session')
  console.log('[ELECTRON STARTUP] Window created')

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

// Batch receipt temp folder storage
// Use app's temp directory for batch receipt images to avoid localStorage quota
const batchReceiptTempDir = path.join(app.getPath('temp'), 'booksmaster-batch-receipts')
console.log('[BATCH TEMP] Temp folder path:', batchReceiptTempDir)

// Ensure temp directory exists
function ensureBatchTempDir() {
  if (!fsSync.existsSync(batchReceiptTempDir)) {
    fsSync.mkdirSync(batchReceiptTempDir, { recursive: true })
    console.log('[BATCH TEMP] Created temp directory:', batchReceiptTempDir)
  }
}

// Save batch receipt image to temp folder
ipcMain.handle('save-batch-receipt-image', async (event, receiptId, imageData) => {
  try {
    ensureBatchTempDir()
    const filePath = path.join(batchReceiptTempDir, `${receiptId}.jpg`)
    
    // imageData is base64 data URL (data:image/jpeg;base64,...)
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    await fs.writeFile(filePath, buffer)
    console.log('[BATCH TEMP] Saved receipt image:', receiptId)
    return { success: true, path: filePath }
  } catch (error) {
    console.error('[BATCH TEMP] Failed to save receipt image:', error)
    return { success: false, error: error.message }
  }
})

// Load batch receipt image from temp folder
ipcMain.handle('load-batch-receipt-image', async (event, receiptId) => {
  try {
    const filePath = path.join(batchReceiptTempDir, `${receiptId}.jpg`)
    const buffer = await fs.readFile(filePath)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64}`
    
    console.log('[BATCH TEMP] Loaded receipt image:', receiptId)
    return { success: true, data: dataUrl }
  } catch (error) {
    console.error('[BATCH TEMP] Failed to load receipt image:', error)
    return { success: false, error: error.message }
  }
})

// Save batch receipt metadata JSON to temp folder
ipcMain.handle('save-batch-receipt-metadata', async (event, receiptId, metadata) => {
  try {
    ensureBatchTempDir()
    const filePath = path.join(batchReceiptTempDir, `${receiptId}.json`)
    await fs.writeFile(filePath, JSON.stringify(metadata))
    console.log('[BATCH TEMP] Saved receipt metadata:', receiptId)
    return { success: true, path: filePath }
  } catch (error) {
    console.error('[BATCH TEMP] Failed to save receipt metadata:', error)
    return { success: false, error: error.message }
  }
})

// Load batch receipt metadata JSON from temp folder
ipcMain.handle('load-batch-receipt-metadata', async (event, receiptId) => {
  try {
    const filePath = path.join(batchReceiptTempDir, `${receiptId}.json`)
    const data = await fs.readFile(filePath, 'utf8')
    const metadata = JSON.parse(data)
    console.log('[BATCH TEMP] Loaded receipt metadata:', receiptId)
    return { success: true, data: metadata }
  } catch (error) {
    console.error('[BATCH TEMP] Failed to load receipt metadata:', error)
    return { success: false, error: error.message }
  }
})

// Delete batch receipt image from temp folder
ipcMain.handle('delete-batch-receipt-image', async (event, receiptId) => {
  try {
    const imagePath = path.join(batchReceiptTempDir, `${receiptId}.jpg`)
    const metadataPath = path.join(batchReceiptTempDir, `${receiptId}.json`)
    
    // Delete both image and metadata files
    const deletePromises = []
    if (fsSync.existsSync(imagePath)) {
      deletePromises.push(fs.unlink(imagePath))
    }
    if (fsSync.existsSync(metadataPath)) {
      deletePromises.push(fs.unlink(metadataPath))
    }
    
    await Promise.all(deletePromises)
    console.log('[BATCH TEMP] Deleted receipt files:', receiptId)
    return { success: true }
  } catch (error) {
    // Ignore errors if file doesn't exist
    return { success: true }
  }
})

// Clear all batch receipt temp files
ipcMain.handle('clear-batch-receipt-temp', async () => {
  try {
    if (fsSync.existsSync(batchReceiptTempDir)) {
      const files = await fs.readdir(batchReceiptTempDir)
      await Promise.all(files.map(file => 
        fs.unlink(path.join(batchReceiptTempDir, file)).catch(() => {})
      ))
      console.log('[BATCH TEMP] Cleared all temp receipt images')
    }
    return { success: true }
  } catch (error) {
    console.error('[BATCH TEMP] Failed to clear temp folder:', error)
    return { success: false, error: error.message }
  }
})

// Open external URL in default browser
ipcMain.handle('open-external', async (event, url) => {
  try {
    console.log('[ELECTRON] Opening external URL:', url)
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('[ELECTRON] Failed to open external URL:', error)
    return { success: false, error: error.message }
  }
})

// Print with preview - generates PDF and opens with system viewer
ipcMain.handle('print-preview', async (event, htmlContent) => {
  let printWindow = null
  
  try {
    console.log('[ELECTRON PRINT] Creating PDF for print preview')
    
    // Create a hidden window for PDF generation
    printWindow = new BrowserWindow({
      width: 800,
      height: 1100,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })
    
    // Load the HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
    
    // Wait for content to fully render
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log('[ELECTRON PRINT] Generating PDF')
    
    // Generate PDF
    const pdfData = await printWindow.webContents.printToPDF({
      printBackground: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    })
    
    // Save to temp directory
    const tempDir = os.tmpdir()
    const pdfPath = path.join(tempDir, `booksmaster-invoice-${Date.now()}.pdf`)
    await fs.writeFile(pdfPath, pdfData)
    
    console.log('[ELECTRON PRINT] PDF saved to:', pdfPath)
    console.log('[ELECTRON PRINT] Opening PDF with system viewer')
    
    // Open with system default PDF viewer (which has print preview)
    await shell.openPath(pdfPath)
    
    // Clean up window
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.destroy()
    }
    
    return { success: true, pdfPath }
    
  } catch (error) {
    console.error('[ELECTRON PRINT] Failed to generate PDF:', error)
    
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.destroy()
    }
    
    return { success: false, error: error.message }
  }
})

