/**
 * Full Project Export/Import
 * Exports and imports complete bookkeeping project with folder structure,
 * JSON data files, and receipt images
 */

import JSZip from 'jszip'
import type { Receipt, Transaction, CustodyExpense, Invoice, BankAccount } from '@/types'

export interface ProjectData {
  receipts: Receipt[]
  transactions: Transaction[]
  custodyExpenses: CustodyExpense[]
  invoices: Invoice[]
  bankAccounts: BankAccount[]
  businessName?: string
  businessType?: string
  exportDate: string
  exportVersion: string
}

/**
 * Export complete project as a zip file
 * Includes all JSON data and receipt images in proper folder structure
 */
export async function exportCompleteProject(data: ProjectData): Promise<void> {
  const zip = new JSZip()
  
  console.log('[EXPORT] Starting complete project export...')
  console.log('[EXPORT] Receipts with images:', data.receipts.filter(r => r.imageData).length)
  
  // Create folder structure
  const receiptsFolder = zip.folder('receipts')!
  const receiptsDataFolder = receiptsFolder.folder('data')!
  const receiptsImagesFolder = receiptsFolder.folder('images')!
  const transactionsFolder = zip.folder('transactions')!
  const invoicesFolder = zip.folder('invoices')!
  const custodyFolder = zip.folder('custody-expenses')!
  
  // 1. Export receipts data and images
  console.log('[EXPORT] Exporting receipts...')
  const receiptsWithoutImages = data.receipts.map(r => {
    const { imageData, ...receiptData } = r
    return {
      ...receiptData,
      imageFilename: imageData ? `receipt-${r.id}.jpg` : undefined
    }
  })
  
  receiptsDataFolder.file('receipts-index.json', JSON.stringify(receiptsWithoutImages, null, 2))
  
  // Save individual receipt images
  let imageCount = 0
  for (const receipt of data.receipts) {
    if (receipt.imageData) {
      try {
        // Convert data URL to blob
        const base64Data = receipt.imageData.includes('base64,')
          ? receipt.imageData.split('base64,')[1]
          : receipt.imageData
        
        // Add image to zip
        receiptsImagesFolder.file(`receipt-${receipt.id}.jpg`, base64Data, { base64: true })
        
        // Save individual receipt metadata
        const metadata = {
          ...receipt,
          imageData: undefined,
          imageFilename: `receipt-${receipt.id}.jpg`
        }
        receiptsDataFolder.file(`receipt-${receipt.id}.json`, JSON.stringify(metadata, null, 2))
        
        imageCount++
      } catch (error) {
        console.error(`[EXPORT] Error processing receipt ${receipt.id}:`, error)
      }
    }
  }
  console.log(`[EXPORT] Exported ${imageCount} receipt images`)
  
  // 2. Export transactions
  console.log('[EXPORT] Exporting transactions...')
  transactionsFolder.file('transactions-data.json', JSON.stringify(data.transactions, null, 2))
  
  // 3. Export invoices
  console.log('[EXPORT] Exporting invoices...')
  invoicesFolder.file('invoices-data.json', JSON.stringify(data.invoices, null, 2))
  
  // 4. Export custody expenses
  console.log('[EXPORT] Exporting custody expenses...')
  custodyFolder.file('custody-expenses-data.json', JSON.stringify(data.custodyExpenses, null, 2))
  
  // 5. Export bank accounts
  console.log('[EXPORT] Exporting bank accounts...')
  zip.file('bank-accounts.json', JSON.stringify(data.bankAccounts, null, 2))
  
  // 6. Export project metadata
  const metadata = {
    businessName: data.businessName,
    businessType: data.businessType,
    exportDate: data.exportDate,
    exportVersion: data.exportVersion,
    stats: {
      receipts: data.receipts.length,
      transactions: data.transactions.length,
      invoices: data.invoices.length,
      custodyExpenses: data.custodyExpenses.length,
      bankAccounts: data.bankAccounts.length,
      receiptImages: imageCount,
    }
  }
  zip.file('project-metadata.json', JSON.stringify(metadata, null, 2))
  
  // 7. Create README
  const readme = `Booksmaster Project Export
===========================

Export Date: ${data.exportDate}
Business: ${data.businessName || 'Not set'}

This folder contains a complete backup of your bookkeeping data.

Folder Structure:
-----------------
📁 receipts/
   📁 images/        - Receipt photo files (JPG)
   📁 data/          - Receipt metadata (JSON)
📁 transactions/     - Transaction records
📁 invoices/         - Invoice records
📁 custody-expenses/ - Custody expense records
📄 bank-accounts.json
📄 project-metadata.json

Receipt Data Includes:
----------------------
- OCR data (vendor, amount, date, line items)
- Document classification (payment_receipt, bank_deposit_receipt, bank_statement, manifest, invoice)
- Document linking information (linked receipts, supplemental docs)
- Duplicate detection data (source filename, duplicate flags)
- Transaction identifiers (transaction #, order #, invoice #, account #)
- All receipt images

To restore this data:
1. Open Booksmaster application
2. Go to Settings
3. Click "Import Project"
4. Select this zip file

All data will be restored including receipt images and document relationships.
`
  zip.file('README.txt', readme)
  
  // Generate zip file
  console.log('[EXPORT] Generating zip file...')
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
  
  // Download zip file
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const timestamp = new Date().toISOString().split('T')[0]
  a.download = `thomas-books-project-${timestamp}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  console.log('[EXPORT] Export complete!')
}

/**
 * Import complete project from a zip file
 * Restores all JSON data and receipt images
 */
export async function importCompleteProject(file: File): Promise<ProjectData | null> {
  try {
    console.log('[IMPORT] Loading zip file...')
    const zip = await JSZip.loadAsync(file)
    
    console.log('[IMPORT] Zip file loaded, extracting data...')
    
    // Read project metadata
    const metadataFile = zip.file('project-metadata.json')
    let metadata: any = {}
    if (metadataFile) {
      const metadataText = await metadataFile.async('text')
      metadata = JSON.parse(metadataText)
      console.log('[IMPORT] Project metadata:', metadata)
    }
    
    // 1. Import receipts data
    console.log('[IMPORT] Importing receipts...')
    const receiptsIndexFile = zip.file('receipts/data/receipts-index.json')
    let receipts: Receipt[] = []
    
    if (receiptsIndexFile) {
      const receiptsText = await receiptsIndexFile.async('text')
      const receiptsData = JSON.parse(receiptsText)
      
      // Load receipt images
      for (const receipt of receiptsData) {
        if (receipt.imageFilename) {
          const imageFile = zip.file(`receipts/images/${receipt.imageFilename}`)
          if (imageFile) {
            try {
              const imageBlob = await imageFile.async('blob')
              const imageDataUrl = await blobToDataUrl(imageBlob)
              receipt.imageData = imageDataUrl
            } catch (error) {
              console.warn(`[IMPORT] Could not load image for receipt ${receipt.id}:`, error)
            }
          }
        }
        delete receipt.imageFilename
        receipts.push(receipt)
      }
      console.log(`[IMPORT] Imported ${receipts.length} receipts with ${receipts.filter(r => r.imageData).length} images`)
    }
    
    // 2. Import transactions
    console.log('[IMPORT] Importing transactions...')
    const transactionsFile = zip.file('transactions/transactions-data.json')
    let transactions: Transaction[] = []
    if (transactionsFile) {
      const transactionsText = await transactionsFile.async('text')
      transactions = JSON.parse(transactionsText)
      console.log(`[IMPORT] Imported ${transactions.length} transactions`)
    }
    
    // 3. Import invoices
    console.log('[IMPORT] Importing invoices...')
    const invoicesFile = zip.file('invoices/invoices-data.json')
    let invoices: Invoice[] = []
    if (invoicesFile) {
      const invoicesText = await invoicesFile.async('text')
      invoices = JSON.parse(invoicesText)
      console.log(`[IMPORT] Imported ${invoices.length} invoices`)
    }
    
    // 4. Import custody expenses
    console.log('[IMPORT] Importing custody expenses...')
    const custodyFile = zip.file('custody-expenses/custody-expenses-data.json')
    let custodyExpenses: CustodyExpense[] = []
    if (custodyFile) {
      const custodyText = await custodyFile.async('text')
      custodyExpenses = JSON.parse(custodyText)
      console.log(`[IMPORT] Imported ${custodyExpenses.length} custody expenses`)
    }
    
    // 5. Import bank accounts
    console.log('[IMPORT] Importing bank accounts...')
    const bankAccountsFile = zip.file('bank-accounts.json')
    let bankAccounts: BankAccount[] = []
    if (bankAccountsFile) {
      const bankAccountsText = await bankAccountsFile.async('text')
      bankAccounts = JSON.parse(bankAccountsText)
      console.log(`[IMPORT] Imported ${bankAccounts.length} bank accounts`)
    }
    
    const projectData: ProjectData = {
      receipts,
      transactions,
      invoices,
      custodyExpenses,
      bankAccounts,
      businessName: metadata.businessName,
      businessType: metadata.businessType,
      exportDate: metadata.exportDate || new Date().toISOString(),
      exportVersion: metadata.exportVersion || '1.0',
    }
    
    console.log('[IMPORT] Import complete!')
    return projectData
    
  } catch (error) {
    console.error('[IMPORT] Error importing project:', error)
    throw new Error(`Failed to import project: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Convert blob to data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
