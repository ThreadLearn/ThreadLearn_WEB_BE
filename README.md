# ThreadLearn_WEB_BE

## 🤝 Collaboration & Workflow Guide

Welcome to the ThreadLearn Backend repository! To ensure code quality and a smooth development experience, please follow these guidelines when contributing.

### 1. Branching Strategy
We follow a GitFlow-inspired branching model:
- **`main`**: Production-ready code. Commits here should only come from `develop`.
- **`develop`**: The integration branch for staging. Features merge here first.
- **`feature/*`**, **`fix/*`**, **`refactor/*`**: Create these branches from `develop` for your daily work.

### 2. Feature Branch Naming Convention
Please use descriptive branch names:
- `feat/add-quiz-timer` (For new features)
- `fix/login-crash` (For bug fixes)
- `refactor/auth-service` (For code improvements)

### 3. Commit Naming Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: [Module] Add new functionality` (e.g., `feat: [Auth] Add email verification`)
- `fix: [Module] Resolve a bug`
- `refactor: [Module] Restructure code without changing behavior`
- `docs: Update documentation`
- `chore: Update dependencies or CI`

### 4. Pull Request Workflow
1. Commit your changes and push your feature branch.
2. Open a Pull Request (PR) against the `develop` branch.
3. **CI/CD Validation**: GitHub Actions will automatically run ESLint, Next.js build, and Docker build checks. **All checks must pass** before merging.
4. **Code Review**: According to our `.github/CODEOWNERS`, relevant team members will be automatically requested for review based on the modules you modified.
5. Once approved and CI passes, squash and merge into `develop`.

### 5. Local Development Setup

**Prerequisites:**
- Node.js v20.x
- MongoDB (Running locally on port 27017 or via Atlas)
- Redis (Running locally on port 6379)

**Steps:**
1. Clone the repository and checkout `develop`.
2. Copy `.env.example` to `.env` and configure your local URIs.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server (runs on port 3001 to avoid Next.js frontend conflicts):
   ```bash
   npm run dev
   ```
5. View API Swagger documentation at `http://localhost:5000/api/v1/docs`.
