# Electron Desktop App Conversion

## ✅ Conversion Status: Core Complete

The Thomas Books web app has been successfully converted to an Electron desktop application with permanent file system access.

---

## What Was Done

### 1. Electron Infrastructure
- **Main Process** (`electron/main.js`): Window management, IPC handlers
- **Preload Script** (`electron/preload.js`): Secure IPC bridge with context isolation
- **Build Configuration**: electron-builder for Windows installer

### 2. File System Abstraction Layer
- **`electron-file-system.ts`**: Node.js `fs` module wrapper for Electron
- **`file-system-adapter.ts`**: Unified adapter that works in both web and Electron
- **Store Integration**: Automatically uses correct file system based on environment

### 3. Key Features
- ✅ **Permanent folder access** - No browser permission expiration
- ✅ **Direct file system operations** - Node.js `fs` module
- ✅ **Configuration persistence** - Folder path saved in Electron user data
- ✅ **Cross-platform compatibility** - Web and desktop share same codebase

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React/Next.js UI                      │
│                  (Renderer Process)                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ├─── Web Browser ────► File System Access API
                      │                      (permission-based)
                      │
                      └─── Electron ───────► IPC Bridge ───► Node.js fs
                                             (permanent access)
```

### IPC Handlers (Electron Main → Renderer)
- `select-directory`: Open folder picker
- `get-root-directory`: Get configured folder path
- `fs-exists`, `fs-mkdir`, `fs-write-file`, `fs-read-file`: File operations
- `fs-write-binary`, `fs-read-binary`: Image handling
- `fs-readdir`, `fs-delete-file`: Directory operations

---

## Development Mode (Currently Running)

**Command:**
```bash
npm run electron:dev
```

**What it does:**
1. Starts Next.js dev server on `http://localhost:3000`
2. Waits for server to be ready
3. Launches Electron window pointing to dev server
4. Enables hot reload for React code

**Current Status:** ✅ Running successfully

---

## Next Steps

### 1. Test the Desktop App (Development Mode)

**The Electron window should be open now. Test:**

1. **Initial Setup**
   - Go to Settings tab
   - Click "Select Folder" in File System Storage section
   - Choose a folder (e.g., `C:\Users\Thomas\Documents\Thomas-Books`)
   - Should see: `[ELECTRON FS] Root directory selected: [path]`

2. **Save API Key**
   - Enter Gemini API key in Settings
   - Should persist across app restarts

3. **Scan Receipts**
   - Go to Receipts tab
   - Upload and scan receipt images
   - Images should save to `[folder]/receipts/images/`

4. **Close and Reopen**
   - Close the Electron app completely
   - Run `npm run electron:dev` again
   - **Images should load automatically** - no permission prompt!
   - Check console for: `[ELECTRON FS] Loaded X receipt images`

5. **Edit Transactions**
   - Go to Transactions tab
   - Edit a transaction
   - Should save to `[folder]/transactions/transactions.json`

### 2. Build Production Windows Executable

Once testing is complete:

```bash
npm run electron:build:win
```

**Output:** `dist\Thomas Books Setup 0.1.0.exe`

**This creates:**
- Windows installer (NSIS)
- Desktop shortcut
- Start menu entry
- Uninstaller

### 3. Distribute to Thomas

**Send Thomas:**
1. The `.exe` installer from `dist/` folder
2. Instructions:
   - Run installer
   - Select installation folder
   - Launch "Thomas Books" from desktop/start menu
   - On first launch: Select data folder in Settings
   - All data persists permanently!

---

## File Structure Created

```
thomas-books/
├── electron/
│   ├── main.js           # Electron main process
│   └── preload.js        # IPC preload script
├── src/
│   └── lib/
│       ├── electron-file-system.ts    # Electron fs adapter
│       ├── file-system-adapter.ts     # Unified adapter
│       └── file-system-storage.ts     # Web FS API (kept for web)
└── package.json          # Added electron scripts
```

---

## Configuration Persistence

**Electron stores config at:**
- Windows: `C:\Users\[user]\AppData\Roaming\thomas-books\config.json`
- Contains: `{ "rootDirPath": "C:\\path\\to\\Thomas-Books" }`

**This persists:**
- ✅ Folder selection
- ✅ Across app restarts
- ✅ Across Windows reboots
- ✅ Forever (until user changes it)

---

## Benefits Over Web Version

| Feature | Web (Before) | Desktop (Now) |
|---------|--------------|---------------|
| **Folder Access** | Expires after browser close | Permanent |
| **Permissions** | Required on every session | One-time setup |
| **API Key** | Could be cleared | Always persists |
| **Images** | Lost on cache clear | Always available |
| **Updates** | Must save manually | Auto-saves to disk |
| **Offline** | Requires server | Fully offline capable |

---

## Troubleshooting

### Electron window doesn't open
```bash
# Check if port 3000 is blocked
npm run dev
# In another terminal:
electron .
```

### "No root directory configured"
- Go to Settings → File System Storage
- Click "Select Folder"
- Choose a folder with write permissions

### Images not loading
- Check Electron console (View → Toggle Developer Tools)
- Look for `[ELECTRON FS]` log messages
- Verify folder path in Settings
- Check that images exist in `[folder]/receipts/images/`

---

## Development Commands

```bash
# Development mode (hot reload)
npm run electron:dev

# Build Windows installer
npm run electron:build:win

# Build for all platforms (requires platform-specific tools)
npm run electron:build

# Run web version (for comparison)
npm run dev
```

---

## Known Issues / Future Enhancements

### Current Limitations
- Icon is missing (needs `public/icon.png`)
- No auto-updater yet (can add later)
- No Mac/Linux builds yet (Windows-focused)

### Future Features
- Auto-update system
- System tray integration
- Automatic backups
- Dark mode toggle
- Multi-window support

---

## Deployment Checklist

**Before distributing to Thomas:**
- [ ] Test full scan workflow
- [ ] Test folder selection persistence
- [ ] Test API key persistence
- [ ] Test transaction editing
- [ ] Test image restoration on restart
- [ ] Build Windows installer
- [ ] Test installer on clean Windows machine
- [ ] Create user guide for first-time setup

---

## Support

**If issues occur:**
1. Check Electron console logs (View → Toggle Developer Tools)
2. Check folder permissions
3. Verify folder structure was created correctly
4. Check `config.json` in AppData\Roaming\thomas-books

**For developers:**
- Electron version: 39.2.7
- Next.js version: 14.2.35
- Node.js version: Check with `node -v`
