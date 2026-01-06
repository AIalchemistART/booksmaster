# Booksmaster

**AI-powered accounting software for perpetual entrepreneurs and sole proprietors.**

## Market Positioning

Booksmaster targets the 10-15M perpetual entrepreneurs in the US - contractors, freelancers, and serial business owners who cycle through multiple ventures over 5-10 years before finding sustained success. Unlike competitors (Xero, Wave, QuickBooks) who optimize for growth-trajectory businesses, we solve the recurring pain point that persists across all ventures: **receipt chaos**.

**Key Differentiators:**
- **First-to-market true AI parsing** - Gemini-powered contextual understanding vs. legacy OCR
- **Built for reality, not growth fantasy** - No feature bloat, no unnecessary complexity
- **Contractor-specific intelligence** - Manifest detection, document linking, itemization
- **Export freedom** - QuickBooks/CSV/JSON export, no vendor lock-in
- **Honest pricing** - $10-20/mo vs. $200-300/year competitors

See `docs/MARKET_STRATEGY.md` for full market analysis and `docs/website-content/PHILOSOPHY.md` for customer-facing messaging.

## Features

- **Business Bookkeeping**: Track income and expenses with contractor-specific categories (materials, tools, fuel, subcontractors, insurance, permits)
- **Custody Accounting**: Track child-related expenses, calculate splits, and generate court-ready reports
- **Invoice Management**: Create and track client invoices
- **Receipt Management**: Link receipt photos from Google Drive
- **Reports**: Generate detailed reports for custody expense splits and business summaries
- **Data Export/Import**: Backup and restore your data

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: TailwindCSS
- **State Management**: Zustand with localStorage persistence
- **Icons**: Lucide React
- **Deployment**: Netlify (static export)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
```

The static site will be generated in the `out` directory.

## Deployment

This app is configured for static export and can be deployed to Netlify:

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `out`

## Integrations

### Plaid Bank Connection
Connect bank accounts securely via Plaid to import transactions automatically.

**Setup:**
1. Sign up at [dashboard.plaid.com](https://dashboard.plaid.com/signup)
2. Get your Client ID and Secret from the Keys section
3. Add to `.env.local`:
   ```
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_secret
   PLAID_ENV=sandbox
   ```
4. Restart dev server and go to Bank Accounts page

### Receipt OCR (Tesseract.js + SAM AI)
Scan receipts with your camera or upload images to auto-extract:
- Vendor name
- Total amount
- Date

**Two segmentation modes:**

| Mode | Speed | Best For |
|------|-------|----------|
| **Fast Mode** | ~5s | Receipts stacked vertically |
| **SAM AI Mode** | ~30s | Complex layouts, side-by-side receipts |

SAM (Segment Anything Model) by Meta provides intelligent image segmentation that can detect receipt boundaries regardless of orientation or layout. First use downloads ~25MB model.

Works entirely client-side - no API keys needed!

## Future Enhancements

- **Google Drive API**: Direct integration for receipt photo management
- **Multi-user support**: Allow accountant or co-parent access
- **Invoice PDF generation**: Create professional invoices

## Data Storage

All data is stored locally in your browser using localStorage. Use the Settings page to export backups regularly.

## License

Private - For Thomas's use only.
