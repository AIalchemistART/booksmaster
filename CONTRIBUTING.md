# Contributing to Booksmaster

Thank you for considering contributing to Booksmaster! This document provides guidelines and instructions for contributing.

---

## Ways to Contribute

### 🐛 Report Bugs
Found a bug? [Open an issue](https://github.com/AIalchemistART/booksmaster/issues/new) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Your OS and Booksmaster version

**⚠️ Security vulnerabilities:** Please report privately to manny@aialchemist.net, NOT as public issues.

### 💡 Request Features
Have an idea? [Open an issue](https://github.com/AIalchemistART/booksmaster/issues/new) with:
- Clear description of the feature
- Why it would be useful (use case)
- How you envision it working

### 📝 Improve Documentation
- Fix typos or unclear instructions
- Add examples or tutorials
- Translate to other languages
- Create video guides

### 💻 Contribute Code
See the [Development](#development) section below.

---

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

**TL;DR:** Be respectful, constructive, and inclusive.

---

## Development

### Prerequisites

- Node.js 18+ and npm
- Git
- Code editor (VS Code recommended)

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/booksmaster.git
   cd booksmaster
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/AIalchemistART/booksmaster.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

6. **Open http://localhost:3000**

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS
- **State:** Zustand with localStorage persistence
- **Database:** IndexedDB (local storage)
- **Icons:** Lucide React
- **AI/OCR:** Google Gemini Vision API

### Project Structure

```
booksmaster/
├── src/
│   ├── app/              # Next.js pages and routes
│   ├── components/       # React components
│   ├── store/           # Zustand state management
│   ├── lib/             # Utilities and helpers
│   └── types/           # TypeScript types
├── docs/                # Documentation
├── public/              # Static assets
└── tests/               # Test files
```

### Environment Setup

**⚠️ CRITICAL: Never commit API keys or secrets!**

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your API keys to `.env.local`:**
   ```bash
   NEXT_PUBLIC_GEMINI_API_KEY=your_actual_key_here
   ```

3. **Verify `.env.local` is gitignored:**
   ```bash
   git check-ignore .env.local
   # Should output: .env.local
   ```

**What's safe to commit:**
- ✅ `.env.example` (placeholders only)
- ❌ `.env.local` (actual keys - NEVER commit this)
- ❌ `.env` (gitignored - keep it that way)

---

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-payroll-integration`
- `fix/receipt-upload-crash`
- `docs/improve-readme`
- `refactor/simplify-state-management`

### Commit Messages

Follow conventional commits:
- `feat: add payroll integration`
- `fix: resolve receipt upload crash on iOS`
- `docs: update README with new features`
- `refactor: simplify receipt state management`
- `test: add unit tests for tax calculations`

### Code Style

- **TypeScript:** Use strict types, avoid `any`
- **React:** Functional components with hooks
- **Formatting:** Run `npm run lint` before committing
- **Comments:** Explain *why*, not *what*

### Testing

- **Run tests:** `npm test`
- **Add tests** for new features (especially tax calculations)
- **Manual testing:** Test your changes in dev mode

---

## Pull Request Process

### Before Submitting

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run linter:**
   ```bash
   npm run lint
   ```

3. **Test your changes:**
   ```bash
   npm test
   npm run build  # Ensure build succeeds
   ```

4. **Update documentation** if needed

### Submitting

1. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template:**
   - What does this PR do?
   - Why is this change needed?
   - How was it tested?
   - Screenshots (if UI change)

4. **Wait for review:**
   - Address feedback promptly
   - Be open to suggestions
   - Keep discussion respectful

### Review Process

- **Maintainer will review** within 3-7 days
- **CI checks must pass** (linting, tests, build)
- **At least 1 approval** required before merge
- **Squash and merge** strategy used

---

## Development Guidelines

### Contractor-First Design

Booksmaster is built for contractors and freelancers. Consider:
- **Simplicity over features** - only add what's truly needed
- **Speed over polish** - fast workflows beat fancy animations
- **Practical over perfect** - real-world use cases trump edge cases

### Tax Software Responsibility

This is tax-related software. Take extra care with:
- **Accuracy:** Tax calculations must be precise
- **Testing:** Tax logic needs thorough unit tests
- **Disclaimers:** Never guarantee IRS compliance
- **Clarity:** Users must understand what the software does/doesn't do

### Privacy & Security

**🔒 Security is a top priority for tax software. Follow these rules:**

#### API Keys & Secrets
- ✅ **ALWAYS** use environment variables (`.env.local`)
- ✅ **NEVER** hardcode API keys in source code
- ✅ **NEVER** commit `.env.local` or `.env` files
- ✅ **Check `.gitignore`** before adding new file types
- ✅ **Use placeholders** in `.env.example` (e.g., `your_key_here`)

#### Before Every Commit
```bash
# 1. Check for accidentally staged secrets
git status

# 2. Verify .env.local is ignored
git check-ignore .env.local

# 3. Search for accidental API keys (run this occasionally)
git grep -i "api.*key" -- '*.ts' '*.tsx' '*.js'
```

#### Data Handling
- **Local-first:** Default to local storage, cloud is optional
- **No tracking:** Don't add analytics without consent
- **Encryption:** Sensitive data (API keys) must be encrypted
- **Check redaction:** Protect banking credentials in check images
- **No telemetry:** User must explicitly opt-in

#### Third-Party Services
When adding new integrations:
1. Document in `.env.example` with placeholder
2. Add to README under "Third-Party Services"
3. Link to service's privacy policy
4. Make it optional (user brings their own key)

#### Security Vulnerabilities
- **Found a security issue?** Report to manny@aialchemist.net (NOT public issues)
- See [SECURITY.md](SECURITY.md) for full policy

---

## Areas Needing Help

### High Priority

- [ ] Unit tests for tax calculations
- [ ] Mobile app (React Native)
- [ ] Multi-user support (families, partnerships)
- [ ] Bank integration (Plaid)

### Medium Priority

- [ ] Dark mode
- [ ] Internationalization (i18n)
- [ ] Docker deployment
- [ ] Performance optimizations

### Low Priority

- [ ] Keyboard shortcuts
- [ ] Advanced search
- [ ] Custom categories
- [ ] Themes and customization

---

## Questions?

- **GitHub Issues:** For bug reports and feature requests
- **GitHub Discussions:** For questions and community chat
- **Email:** manny@aialchemist.net for private inquiries
- **Security Issues:** manny@aialchemist.net (do NOT open public issues)

---

## Recognition

Contributors are recognized in:
- **README.md** - List of contributors
- **Release notes** - Credit for specific features
- **Community highlights** - Featured in project updates

Thank you for contributing to Booksmaster! 🎉
