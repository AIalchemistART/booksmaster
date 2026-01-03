# Changelog

All notable changes to Booksmaster will be documented in this file.

## [0.3.0] - 2026-01-03

### Fixed
- **Critical:** localStorage persistence in Electron - data now persists between app restarts
- Receipt linkage metric now correctly counts transactions with supporting documents (not receipts with transactions)
- First transaction achievement now triggers properly on all conversion paths
- Duplicate receipt display - converted receipts no longer appear in Supporting Documents tab
- Payment receipt auto-linking logic tightened to prevent false positives

### Added
- Invoice payment workflow - paid invoices create supplemental documentation
- Field-weighted accuracy tracking (replaces binary all-or-nothing accuracy)
- Navigation arrows in transaction edit modal (matches supporting docs UI)
- Extensive debug logging for localStorage persistence issues
- Invoice linking fields (`linkedReceiptId`, `linkedTransactionId`)

### Changed
- Receipt linkage calculation methodology for more accurate metrics
- AI accuracy now tracks individual field correctness (6 core fields)
- Improved payment receipt classification to reduce supplemental doc overpopulation

## [0.2.0] - 2025-12-31

### Added
- Initial Electron desktop application
- Receipt scanning and OCR
- Transaction management
- Gamification system with achievements and XP
- Supporting documents tab
- Invoice management
- AI-powered categorization

### Features
- Gemini AI integration for receipt parsing
- Dark mode support
- File system persistence
- Multiple receipt document types
- Transaction verification levels
