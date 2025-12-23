import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TableLayoutType, VerticalAlign, TextDirection } from 'docx'
import { saveAs } from 'file-saver'
import type { Receipt } from '@/types'

/**
 * Generate a comprehensive tax receipt report as a Word document
 */
export async function generateTaxReceiptDocx(
  receipts: Receipt[],
  startDate: string,
  endDate: string,
  includeLineItems: boolean
): Promise<void> {
  const totalAmount = receipts.reduce((sum, r) => sum + (r.ocrAmount || 0), 0)
  const totalSubtotal = receipts.reduce((sum, r) => sum + (r.ocrSubtotal || 0), 0)
  const totalTax = receipts.reduce((sum, r) => sum + (r.ocrTax || 0), 0)

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: 'landscape' as any,
            width: 15840,  // 11 inches
            height: 12240  // 8.5 inches
          },
          margin: {
            top: 720,    // 0.5 inch
            right: 720,
            bottom: 720,
            left: 720
          }
        }
      },
      children: [
        // Title
        new Paragraph({
          text: 'TAX RECEIPT REPORT',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),

        // Report metadata
        new Paragraph({
          children: [
            new TextRun({ text: 'Period: ', bold: true }),
            new TextRun(formatDate(startDate) + ' - ' + formatDate(endDate))
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Generated: ', bold: true }),
            new TextRun(formatDate(new Date()))
          ],
          spacing: { after: 400 }
        }),

        // Summary section
        new Paragraph({
          text: 'SUMMARY',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Receipts: ', bold: true }),
            new TextRun(receipts.length.toString())
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Amount: ', bold: true }),
            new TextRun(formatCurrency(totalAmount))
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Subtotal: ', bold: true }),
            new TextRun(formatCurrency(totalSubtotal))
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Tax: ', bold: true }),
            new TextRun(formatCurrency(totalTax))
          ],
          spacing: { after: 400 }
        }),

        // Detailed receipts section
        new Paragraph({
          text: 'DETAILED RECEIPTS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),

        // Create table for receipts
        createReceiptsTable(receipts, includeLineItems)
      ]
    }]
  })

  // Generate and download
  const blob = await require('docx').Packer.toBlob(doc)
  saveAs(blob, `tax-receipt-report-${startDate}-to-${endDate}.docx`)
}

/**
 * Generate custody expense report as Word document
 */
export async function generateCustodyReportDocx(
  expenses: any[],
  startDate: string,
  endDate: string,
  totals: any
): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: 'landscape' as any,
            width: 15840,  // 11 inches
            height: 12240  // 8.5 inches
          },
          margin: {
            top: 720,    // 0.5 inch
            right: 720,
            bottom: 720,
            left: 720
          }
        }
      },
      children: [
        new Paragraph({
          text: 'CUSTODY EXPENSE REPORT',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: 'Period: ', bold: true }),
            new TextRun(formatDate(startDate) + ' - ' + formatDate(endDate))
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Generated: ', bold: true }),
            new TextRun(formatDate(new Date()))
          ],
          spacing: { after: 400 }
        }),

        new Paragraph({
          text: 'SUMMARY',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Expenses: ', bold: true }),
            new TextRun(formatCurrency(totals.totalAmount))
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Thomas Owes: ', bold: true }),
            new TextRun(formatCurrency(totals.totalThomasOwes))
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Other Parent Owes: ', bold: true }),
            new TextRun(formatCurrency(totals.totalOtherParentOwes))
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Net Balance: ', bold: true }),
            new TextRun(formatCurrency(totals.totalOtherParentOwes - totals.totalThomasOwes)),
            new TextRun(' (Positive = Owed to Thomas)')
          ],
          spacing: { after: 400 }
        })
      ]
    }]
  })

  const blob = await require('docx').Packer.toBlob(doc)
  saveAs(blob, `custody-report-${startDate}-to-${endDate}.docx`)
}

function createReceiptsTable(receipts: Receipt[], includeLineItems: boolean): Table {
  // Cell margin configuration
  const cellMargins = {
    top: 100,
    bottom: 100,
    left: 100,
    right: 100
  }

  // Use much larger DXA values to prevent text rotation
  // Landscape Letter: 11" wide = 15840 DXA total
  // 1 inch = 1440 DXA
  const colWidths = {
    date: 2500,      // ~1.7 inches
    vendor: 7000,    // ~4.9 inches - largest for vendor names
    amount: 2500,    // ~1.7 inches
    tax: 2000,       // ~1.4 inches
    payment: 2500    // ~1.7 inches
  }
  const totalTableWidth = 16500 // ~11.5 inches in DXA

  const rows: TableRow[] = [
    // Header row
    new TableRow({
      children: [
        new TableCell({ 
          width: { size: colWidths.date, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })] 
        }),
        new TableCell({ 
          width: { size: colWidths.vendor, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: 'Vendor', bold: true })] })] 
        }),
        new TableCell({ 
          width: { size: colWidths.amount, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: 'Amount', bold: true })] })] 
        }),
        new TableCell({ 
          width: { size: colWidths.tax, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: 'Tax', bold: true })] })] 
        }),
        new TableCell({ 
          width: { size: colWidths.payment, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: 'Payment', bold: true })] })] 
        })
      ]
    })
  ]

  const sortedReceipts = receipts.sort((a, b) => {
    const dateA = new Date(a.ocrDate || a.createdAt)
    const dateB = new Date(b.ocrDate || b.createdAt)
    return dateA.getTime() - dateB.getTime()
  })

  sortedReceipts.forEach(receipt => {
    rows.push(new TableRow({
      children: [
        new TableCell({ 
          width: { size: colWidths.date, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph(formatDate(receipt.ocrDate || receipt.createdAt))] 
        }),
        new TableCell({ 
          width: { size: colWidths.vendor, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph(receipt.ocrVendor || 'Unknown')] 
        }),
        new TableCell({ 
          width: { size: colWidths.amount, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph(formatCurrency(receipt.ocrAmount || 0))] 
        }),
        new TableCell({ 
          width: { size: colWidths.tax, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph(formatCurrency(receipt.ocrTax || 0))] 
        }),
        new TableCell({ 
          width: { size: colWidths.payment, type: WidthType.DXA },
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph(receipt.ocrPaymentMethod || '-')] 
        })
      ]
    }))

    if (includeLineItems && receipt.ocrLineItems && receipt.ocrLineItems.length > 0) {
      receipt.ocrLineItems.forEach((item: any) => {
        rows.push(new TableRow({
          children: [
            new TableCell({ 
              width: { size: colWidths.date, type: WidthType.DXA },
              margins: cellMargins,
              children: [new Paragraph('')] 
            }),
            new TableCell({ 
              width: { size: colWidths.vendor, type: WidthType.DXA },
              margins: cellMargins,
              children: [new Paragraph({
                children: [
                  new TextRun({ text: '  • ', italics: true }),
                  new TextRun({ text: item.description, italics: true })
                ]
              })] 
            }),
            new TableCell({ 
              width: { size: colWidths.amount, type: WidthType.DXA },
              margins: cellMargins,
              children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(item.price || 0), italics: true })] })] 
            }),
            new TableCell({ 
              width: { size: colWidths.tax, type: WidthType.DXA },
              margins: cellMargins,
              children: [new Paragraph('')] 
            }),
            new TableCell({ 
              width: { size: colWidths.payment, type: WidthType.DXA },
              margins: cellMargins,
              children: [new Paragraph('')] 
            })
          ]
        }))
      })
    }
  })

  return new Table({
    width: { size: totalTableWidth, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows
  })
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}
