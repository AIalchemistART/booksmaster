import jsPDF from 'jspdf'
import type { Receipt, Transaction } from '@/types'
import { formatDate, formatCurrency } from '../utils'

/**
 * Export receipts to a PDF archive organized by date and category
 */
export async function exportReceiptArchivePDF(
  receipts: Receipt[],
  transactions: Transaction[],
  year?: number
): Promise<void> {
  const targetYear = year || new Date().getFullYear()
  
  // Filter receipts for target year
  const yearReceipts = receipts.filter(r => {
    const receiptYear = new Date(r.ocrDate || r.createdAt).getFullYear()
    return receiptYear === targetYear && r.imageData
  })

  if (yearReceipts.length === 0) {
    throw new Error('No receipts with images found for selected year')
  }

  // Sort by date
  yearReceipts.sort((a, b) => {
    const dateA = new Date(a.ocrDate || a.createdAt).getTime()
    const dateB = new Date(b.ocrDate || b.createdAt).getTime()
    return dateA - dateB
  })

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  })

  // Title page
  pdf.setFontSize(24)
  pdf.text('Receipt Archive', 105, 40, { align: 'center' })
  pdf.setFontSize(16)
  pdf.text(`Tax Year ${targetYear}`, 105, 55, { align: 'center' })
  pdf.setFontSize(12)
  pdf.text(`Generated: ${formatDate(new Date().toISOString())}`, 105, 70, { align: 'center' })
  pdf.text(`Total Receipts: ${yearReceipts.length}`, 105, 80, { align: 'center' })

  // Summary statistics
  const totalAmount = yearReceipts.reduce((sum, r) => sum + (r.ocrAmount || 0), 0)
  const validatedCount = yearReceipts.filter(r => r.userValidated).length
  
  pdf.setFontSize(10)
  pdf.text(`Total Amount: ${formatCurrency(totalAmount)}`, 105, 95, { align: 'center' })
  pdf.text(`Validated: ${validatedCount} of ${yearReceipts.length}`, 105, 105, { align: 'center' })

  // Add each receipt
  for (let i = 0; i < yearReceipts.length; i++) {
    const receipt = yearReceipts[i]
    const linkedTx = transactions.find(t => t.id === receipt.linkedTransactionId)
    
    // New page for each receipt
    pdf.addPage()

    // Receipt header
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Receipt ${i + 1} of ${yearReceipts.length}`, 20, 20)
    
    // Receipt details
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    
    let yPos = 30
    
    pdf.text(`Date: ${formatDate(receipt.ocrDate || receipt.createdAt)}`, 20, yPos)
    yPos += 6
    
    if (receipt.ocrVendor) {
      pdf.text(`Vendor: ${receipt.ocrVendor}`, 20, yPos)
      yPos += 6
    }
    
    if (receipt.ocrAmount !== undefined && receipt.ocrAmount !== null) {
      pdf.text(`Amount: ${formatCurrency(receipt.ocrAmount)}`, 20, yPos)
      yPos += 6
    }
    
    if (receipt.transactionType) {
      pdf.text(`Type: ${receipt.transactionType}`, 20, yPos)
      yPos += 6
    }
    
    if (receipt.transactionCategory) {
      pdf.text(`Category: ${receipt.transactionCategory}`, 20, yPos)
      yPos += 6
    }
    
    if (receipt.ocrPaymentMethod) {
      pdf.text(`Payment: ${receipt.ocrPaymentMethod}`, 20, yPos)
      yPos += 6
    }
    
    if (receipt.ocrCardLastFour) {
      pdf.text(`Card: ****${receipt.ocrCardLastFour}`, 20, yPos)
      yPos += 6
    }
    
    if (linkedTx) {
      pdf.text(`Linked Transaction: ${linkedTx.description}`, 20, yPos)
      yPos += 6
    }
    
    pdf.text(`Validated: ${receipt.userValidated ? 'Yes' : 'No'}`, 20, yPos)
    yPos += 6
    
    if (receipt.categorizationConfidence) {
      pdf.text(`AI Confidence: ${(receipt.categorizationConfidence * 100).toFixed(0)}%`, 20, yPos)
      yPos += 6
    }

    // Add receipt image
    if (receipt.imageData) {
      try {
        // Calculate image dimensions to fit on page
        const pageWidth = 210 // A4 width in mm
        const pageHeight = 297 // A4 height in mm
        const margin = 20
        const maxWidth = pageWidth - (margin * 2)
        const maxHeight = pageHeight - yPos - margin - 10
        
        // Use the preferred image (cropped if available and preferred)
        const imageToUse = receipt.prefersCropped && receipt.croppedImageData 
          ? receipt.croppedImageData 
          : receipt.imageData

        // Add image - jsPDF will automatically scale
        pdf.addImage(
          imageToUse,
          'JPEG',
          margin,
          yPos + 5,
          maxWidth,
          maxHeight,
          undefined,
          'FAST'
        )
      } catch (error) {
        console.error('Failed to add receipt image to PDF:', error)
        pdf.setFontSize(8)
        pdf.setTextColor(255, 0, 0)
        pdf.text('⚠️ Image could not be embedded', 20, yPos + 10)
        pdf.setTextColor(0, 0, 0)
      }
    }

    // Add line items if available
    if (receipt.ocrLineItems && receipt.ocrLineItems.length > 0) {
      // Add line items on a new page if they exist
      pdf.addPage()
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Line Items', 20, 20)
      
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      
      let itemY = 30
      receipt.ocrLineItems.forEach((item: any, idx: number) => {
        if (itemY > 270) {
          pdf.addPage()
          itemY = 20
        }
        
        const itemText = `${idx + 1}. ${item.description || 'Unknown'}`
        const priceText = item.price !== undefined ? formatCurrency(item.price) : ''
        const qtyText = item.quantity ? `Qty: ${item.quantity}` : ''
        
        pdf.text(itemText, 20, itemY)
        if (qtyText) {
          pdf.text(qtyText, 140, itemY)
        }
        if (priceText) {
          pdf.text(priceText, 170, itemY)
        }
        itemY += 5
      })
    }
  }

  // Save the PDF
  pdf.save(`receipt-archive-${targetYear}.pdf`)
}

/**
 * Download receipt archive PDF
 */
export async function downloadReceiptArchive(
  receipts: Receipt[],
  transactions: Transaction[],
  year?: number
) {
  try {
    await exportReceiptArchivePDF(receipts, transactions, year)
  } catch (error) {
    console.error('PDF export failed:', error)
    throw error
  }
}
