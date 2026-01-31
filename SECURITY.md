# Security Policy

## Supported Versions

Booksmaster is currently in active development. Security updates are provided for the latest release only.

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| < 0.3   | :x:                |

## Reporting a Vulnerability

**Please do NOT open a public issue for security vulnerabilities.**

If you discover a security vulnerability in Booksmaster, please report it privately to:

**Email:** [manny@aialchemist.net](mailto:manny@aialchemist.net)

### What to Include

When reporting a vulnerability, please include:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Impact** assessment (what could an attacker do?)
- **Affected versions** (if known)
- **Suggested fix** (if you have one)

### What to Expect

- **Acknowledgment:** Within 48 hours
- **Initial Assessment:** Within 1 week
- **Fix Timeline:** Depends on severity
  - **Critical:** 1-7 days
  - **High:** 1-2 weeks
  - **Medium:** 2-4 weeks
  - **Low:** Next release cycle

### Disclosure Policy

- Security issues will be fixed before public disclosure
- We will coordinate disclosure timing with the reporter
- Credit will be given to reporters (unless anonymity is requested)

## Security Best Practices for Users

### API Keys & Credentials

Booksmaster uses a **Bring Your Own Key (BYOK)** model:

- **Google Gemini API Key:** Required for AI receipt scanning
  - Stored encrypted in browser localStorage
  - Never transmitted to our servers
  - Get your key: https://makersuite.google.com/app/apikey

- **Plaid Credentials:** Optional for bank syncing
  - Configured via `.env.local` (never commit this file)
  - See `.env.example` for setup

### Data Storage

- **Your data stays local:** All financial data is stored in your browser's localStorage
- **No cloud uploads:** We never see or store your financial information
- **Regular backups:** Export your data regularly via Settings → Export Data

### Running Booksmaster Securely

1. **Keep it updated:** Always use the latest version
2. **Protect your API key:** Never share your Google Gemini API key
3. **Backup your data:** Export regularly to external storage
4. **Review permissions:** Booksmaster only requests necessary permissions

## Security Features

### Built-in Protections

- ✅ **Local-first architecture:** Your data never leaves your computer
- ✅ **Encrypted API key storage:** Google API keys are encrypted at rest
- ✅ **No server dependencies:** Works completely offline (except AI features)
- ✅ **Open source:** Code is publicly auditable on GitHub

### Third-Party Services

Booksmaster integrates with the following third-party services (all optional):

| Service | Purpose | Data Shared | Privacy Policy |
|---------|---------|-------------|----------------|
| **Google Gemini** | AI receipt scanning | Receipt images only | [Google Privacy](https://policies.google.com/privacy) |
| **Plaid** | Bank syncing (optional) | Bank credentials (direct to Plaid) | [Plaid Privacy](https://plaid.com/legal/#privacy-statement) |

**Important:** We never see your bank credentials or API keys. All third-party communications are direct.

## Known Security Considerations

### Client-Side Storage

Booksmaster stores data in browser localStorage, which is:

- ✅ **Isolated per-origin** (other websites can't access it)
- ⚠️ **Not encrypted by default** (use full-disk encryption on your device)
- ⚠️ **Accessible by browser extensions** (review extensions carefully)

**Recommendation:** Use full-disk encryption (BitLocker, FileVault) on your computer.

### Electron Desktop App

The Electron desktop app:

- ✅ **Sandboxed:** Runs in isolated environment
- ✅ **No remote code execution:** All code is bundled locally
- ⚠️ **Extractable source:** Advanced users can extract app.asar (intentional for open source)

### Tax Software Disclaimer

⚠️ **Booksmaster is a bookkeeping tool, not tax advice.**

- We provide no guarantees of tax compliance
- Always consult a licensed CPA or tax professional
- Review all AI categorizations before filing taxes
- See [DISCLAIMER.md](DISCLAIMER.md) for full details

## Security Audit History

| Date | Type | Findings | Status |
|------|------|----------|--------|
| 2026-01-30 | Pre-release security audit | No critical issues | ✅ Resolved |

## Contact

For security concerns:
- **Email:** manny@aialchemist.net
- **GitHub Issues:** Only for non-security bugs
- **Support:** See [support.html](public/support.html)

---

*Last updated: January 30, 2026*
