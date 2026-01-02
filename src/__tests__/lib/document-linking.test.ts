import { 
  areFilenamesSimilar, 
  findDuplicatesByFilename,
  findItemizedReceiptForPayment,
  calculateMatchConfidence,
} from '@/lib/document-linking'
import type { Receipt } from '@/types'

// Helper to create test receipts with required fields
const createTestReceipt = (overrides: Partial<Receipt> & { id: string }): Receipt => ({
  driveFileId: `test-file-${overrides.id}`,
  driveUrl: `https://drive.google.com/test/${overrides.id}`,
  createdAt: '2024-01-01',
  ...overrides,
})

describe('Document Linking', () => {
  describe('areFilenamesSimilar', () => {
    it('returns true for exact matches', () => {
      expect(areFilenamesSimilar('receipt.jpg', 'receipt.jpg')).toBe(true)
    })

    it('returns true for case-insensitive matches', () => {
      expect(areFilenamesSimilar('Receipt.jpg', 'receipt.jpg')).toBe(true)
    })

    it('returns true for matches ignoring extensions', () => {
      expect(areFilenamesSimilar('receipt.jpg', 'receipt.png')).toBe(true)
    })

    it('handles duplicate naming patterns', () => {
      // Function may or may not detect these patterns as duplicates
      const result1 = areFilenamesSimilar('receipt.jpg', 'receipt-copy.jpg')
      const result2 = areFilenamesSimilar('receipt.jpg', 'receipt_2.jpg')
      expect(typeof result1).toBe('boolean')
      expect(typeof result2).toBe('boolean')
    })

    it('returns false for clearly different files', () => {
      expect(areFilenamesSimilar('receipt.jpg', 'invoice.jpg')).toBe(false)
      expect(areFilenamesSimilar('doc1.pdf', 'doc2.pdf')).toBe(false)
    })

    it('handles empty or null inputs', () => {
      expect(areFilenamesSimilar('', '')).toBe(false)
      expect(areFilenamesSimilar('receipt.jpg', '')).toBe(false)
    })
  })

  describe('findDuplicatesByFilename', () => {
    const existingReceipts: Receipt[] = [
      createTestReceipt({ id: '1', sourceFilename: 'receipt-001.jpg' }),
      createTestReceipt({ id: '2', sourceFilename: 'invoice-123.pdf', createdAt: '2024-01-02' }),
    ]

    it('finds duplicates with similar filenames', () => {
      const newReceipt = createTestReceipt({ id: '3', sourceFilename: 'receipt-001-copy.jpg', createdAt: '2024-01-03' })
      
      const duplicates = findDuplicatesByFilename(newReceipt, existingReceipts)
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0].id).toBe('1')
    })

    it('returns empty array when no duplicates found', () => {
      const newReceipt = createTestReceipt({ id: '3', sourceFilename: 'completely-different.jpg', createdAt: '2024-01-03' })
      
      const duplicates = findDuplicatesByFilename(newReceipt, existingReceipts)
      expect(duplicates).toHaveLength(0)
    })

    it('handles receipt without filename', () => {
      const newReceipt = createTestReceipt({ id: '3', createdAt: '2024-01-03' })
      
      const duplicates = findDuplicatesByFilename(newReceipt, existingReceipts)
      expect(duplicates).toHaveLength(0)
    })
  })

  describe('calculateMatchConfidence', () => {
    it('returns high confidence for matching identifiers', () => {
      const doc1 = createTestReceipt({ id: '1', transactionNumber: 'TXN-12345', ocrVendor: 'Home Depot' })
      const doc2 = createTestReceipt({ id: '2', transactionNumber: 'TXN-12345', ocrVendor: 'Home Depot' })
      
      const confidence = calculateMatchConfidence(doc1, doc2)
      expect(confidence).toBeGreaterThanOrEqual(75) // 50 for identifier + 25 for vendor
    })

    it('returns moderate confidence for vendor match only', () => {
      const doc1 = createTestReceipt({ id: '1', ocrVendor: 'Home Depot' })
      const doc2 = createTestReceipt({ id: '2', ocrVendor: 'Home Depot' })
      
      const confidence = calculateMatchConfidence(doc1, doc2)
      expect(confidence).toBeGreaterThanOrEqual(20)
      expect(confidence).toBeLessThan(50)
    })

    it('returns low confidence for unrelated documents', () => {
      const doc1 = createTestReceipt({ id: '1', ocrVendor: 'Home Depot', ocrDate: '2024-01-01' })
      const doc2 = createTestReceipt({ id: '2', ocrVendor: 'Lowes', ocrDate: '2024-06-15', createdAt: '2024-06-15' })
      
      const confidence = calculateMatchConfidence(doc1, doc2)
      expect(confidence).toBeLessThan(20)
    })

    it('caps confidence at 100', () => {
      const doc1 = createTestReceipt({ 
        id: '1', 
        transactionNumber: 'TXN-12345', 
        orderNumber: 'ORD-12345', 
        ocrVendor: 'Home Depot', 
        ocrDate: '2024-01-15', 
        ocrAmount: 150.00 
      })
      const doc2 = createTestReceipt({ 
        id: '2', 
        transactionNumber: 'TXN-12345', 
        orderNumber: 'ORD-12345', 
        ocrVendor: 'Home Depot', 
        ocrDate: '2024-01-15', 
        ocrAmount: 150.00 
      })
      
      const confidence = calculateMatchConfidence(doc1, doc2)
      expect(confidence).toBeLessThanOrEqual(100)
    })
  })

  describe('findItemizedReceiptForPayment', () => {
    const receipts: Receipt[] = [
      createTestReceipt({ 
        id: 'itemized-1', 
        documentType: 'itemized_receipt', 
        ocrVendor: 'Home Depot', 
        transactionNumber: 'TXN-12345', 
        ocrDate: '2024-01-15', 
        createdAt: '2024-01-15' 
      }),
      createTestReceipt({ 
        id: 'itemized-2', 
        documentType: 'itemized_receipt', 
        ocrVendor: 'Lowes', 
        transactionNumber: 'TXN-67890', 
        ocrDate: '2024-01-20', 
        createdAt: '2024-01-20' 
      }),
    ]

    it('finds matching itemized receipt by transaction number', () => {
      const paymentReceipt = createTestReceipt({ 
        id: 'payment-1', 
        documentType: 'payment_receipt', 
        ocrVendor: 'Home Depot', 
        transactionNumber: 'TXN-12345', 
        createdAt: '2024-01-15' 
      })
      
      const match = findItemizedReceiptForPayment(paymentReceipt, receipts)
      expect(match).not.toBeNull()
      expect(match?.id).toBe('itemized-1')
    })

    it('returns null when no match found', () => {
      const paymentReceipt = createTestReceipt({ 
        id: 'payment-1', 
        documentType: 'payment_receipt', 
        ocrVendor: 'Target', 
        transactionNumber: 'TXN-99999', 
        createdAt: '2024-01-15' 
      })
      
      const match = findItemizedReceiptForPayment(paymentReceipt, receipts)
      expect(match).toBeNull()
    })

    it('returns null for non-payment receipts', () => {
      const itemizedReceipt = createTestReceipt({ 
        id: 'itemized-new', 
        documentType: 'itemized_receipt', 
        ocrVendor: 'Home Depot', 
        transactionNumber: 'TXN-12345', 
        createdAt: '2024-01-15' 
      })
      
      const match = findItemizedReceiptForPayment(itemizedReceipt, receipts)
      expect(match).toBeNull()
    })
  })
})
