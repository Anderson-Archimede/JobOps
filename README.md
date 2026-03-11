[![Stars](https://img.shields.io/github/stars/Anderson-Archimede/JobOps?style=social)](https://github.com/Anderson-Archimede/JobOps)
[![GHCR](https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker&logoColor=white)](https://github.com/Anderson-Archimede/JobOps/pkgs/container/job-ops)
[![Release](https://github.com/Anderson-Archimede/JobOps/actions/workflows/ghcr.yml/badge.svg)](https://github.com/Anderson-Archimede/JobOps/actions/workflows/ghcr.yml)
[![Maintainer](https://img.shields.io/badge/maintainer-Anderson--Archimede-blue)](https://github.com/Anderson-Archimede)
[![Cloud Waitlist](https://img.shields.io/badge/☁️_Cloud-Join_Waitlist-orange?style=flat-square)](https://try.jobops.app?utm_source=github&utm_medium=badge&utm_campaign=waitlist)

<img width="1200" height="600" alt="Jobops-banner-900" src="https://github.com/user-attachments/assets/e929e389-2ebb-4de1-82c6-8e136b849b78" />

JobOps: Your Ironman Suit for Job Hunting, Stop applying blind.

Scrapes major job boards (LinkedIn, Indeed, Glassdoor & more), AI-scores suitability, tailors resumes (RxResume), and tracks application emails automatically.

You still apply to every job yourself. JobOps just finds jobs, makes sure you're applying to the right ones with a tailored CV, and not losing track of where you're at.

Self-hosted. Docker-based.

## 40s Demo: Crawl → Score → PDF → Track

<details>
<summary>
Pipeline Demo
</summary>
  
  https://github.com/user-attachments/assets/5b9157a9-13b0-4ec6-9bd2-a39dbc2b11c5
</details>


<details>
<summary>
Apply & Track
</summary>
  
  https://github.com/user-attachments/assets/06e5e782-47f5-42d0-8b28-b89102d7ea1b
</details>

## Documentation (Start Here)

JobOps ships with full docs for setup, architecture, extractors, and troubleshooting.

### 📚 Getting Started Guides

- **[Quick Start Guide](./QUICKSTART.md)** 🚀 - **NEW!** Get up and running in 5 minutes (local development)
- **[Installation Complete Guide](./INSTALLATION_COMPLETE.md)** 📦 - Complete setup, testing, and validation guide
- [Self-Hosting Guide](https://jobops.dakheera47.com/docs/getting-started/self-hosting) - Docker deployment guide

### 📖 Documentation

- [Documentation Home](https://jobops.dakheera47.com/docs/)
- [Feature Overview](https://jobops.dakheera47.com/docs/features/overview)
- [Orchestrator Pipeline](https://jobops.dakheera47.com/docs/features/orchestrator)
- [Extractor System](https://jobops.dakheera47.com/docs/extractors/overview)
- [Troubleshooting](https://jobops.dakheera47.com/docs/troubleshooting/common-problems)

### 🔧 Developer Resources

- [Contributing Guide](./CONTRIBUTING.md) - Includes E2E testing with Playwright
- [Validation Report](./VALIDATION_REPORT.md) - Latest stability and test results
- [Changelog](./CHANGELOG.md) - Recent improvements and fixes
- [Port Management Guide](./PORT_MANAGEMENT.md) - Automatic port detection and configuration

### 📋 Implementation Documentation

- [CV Manager Implementation](./orchestrator/CV_MANAGER_IMPLEMENTATION.md) - 🆕 Resume library system
- [Authentication Implementation](./orchestrator/AUTH_IMPLEMENTATION.md) - 🆕 JWT RS256 auth system
- [Authentication Validation](./orchestrator/AUTH_VALIDATION_FINALE.md) - 🆕 Final security review
- [Sidebar Implementation](./orchestrator/SIDEBAR_IMPLEMENTATION.md) - Navigation architecture
- [Navbar Implementation](./orchestrator/NAVBAR_IMPLEMENTATION.md) - Top bar features
- [Dashboard Implementation](./orchestrator/DASHBOARD_IMPLEMENTATION.md) - KPIs and analytics
- [Agents Implementation](./orchestrator/AGENTS_IMPLEMENTATION.md) - Agent orchestration system
- [BullMQ Implementation](./orchestrator/BULLMQ_FINAL_IMPLEMENTATION.md) - Async job queues
- [Datasets Implementation](./orchestrator/DATASETS_IMPLEMENTATION.md) - Data management system
- [Monitoring & Logs](./orchestrator/MONITORING_LOGS_IMPLEMENTATION.md) - System observability

## Quick Start

### Option 1: Docker (Recommended for Production)

```bash
# 1. Download
git clone https://github.com/Anderson-Archimede/JobOps.git
cd JobOps

# 2. Start (Pulls pre-built image)
docker compose up -d

# 3. Launch Dashboard
# Open http://localhost:3005 to start the onboarding wizard
```

### Option 2: Local Development (Automated)

**Prerequisites:**
- Node.js 18+ (recommended: 20)
- Redis (for BullMQ job queues)
- PostgreSQL (or Neon cloud database)

**Install Redis:**
```bash
# Docker (recommended)
docker run -d -p 6379:6379 --name redis redis:alpine

# Or install locally:
# Windows: https://redis.io/docs/install/install-redis/
# macOS: brew install redis && brew services start redis
# Linux: sudo apt install redis-server && sudo systemctl start redis
```

**Setup Database:**
Create a `.env` file in the `orchestrator` directory:
```env
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=redis://localhost:6379
```

**Windows (PowerShell):**
```powershell
cd job-ops
.\scripts\start.ps1
```

**Linux/macOS (Bash):**
```bash
cd job-ops
chmod +x scripts/start.sh
./scripts/start.sh
```

This automated script will:
- ✅ Check Docker and Redis status (starts if needed)
- ✅ Generate JWT RS256 keys for authentication (if not exists)
- ✅ Install all dependencies (npm ci)
- ✅ Build the client bundle (Vite)
- ✅ Run database migrations (PostgreSQL + Drizzle)
- ✅ **Check port availability and find alternative if needed**
- ✅ **Automatically update PORT in .env file**
- ✅ Start the server and BullMQ workers

**Port Management:** The script automatically detects if port 3001 is in use and offers 3 options:
1. Kill the existing process
2. Find an alternative port automatically (3002, 3003, etc.)
3. Exit

The chosen port is saved in `.env` for future runs. See [Port Management Guide](./PORT_MANAGEMENT.md) for details.

**First Access:** Navigate to http://localhost:3001/register to create your first user account. The application now requires authentication for security.

### Option 3: Manual Installation

From the repository root (`job-ops/` directory):

```bash
# Install dependencies
npm ci

# Build client
npm --workspace orchestrator run build:client

# Run migrations (PostgreSQL + Drizzle)
npm --workspace orchestrator run db:migrate

# Start Redis (if not using Docker)
redis-server

# Start server + workers
npm --workspace orchestrator run dev
```

Then open:
- **Dashboard:** http://localhost:3001 (or http://localhost:3001/dashboard)
- **Login/Register:** http://localhost:3001/login (first-time users)
- **Agents Management:** http://localhost:3001/agents (NEW)
- **CV Manager:** http://localhost:3001/cv-manager (NEW)
- **Queue Monitoring:** http://localhost:3001/admin/queues (Bull Board)
- **Global Search:** Press Cmd+K anywhere in the app

**Important:** All npm commands must be run from the **monorepo root** (`job-ops/` directory with `package.json`), not from parent folders.

**Security Note:** All API routes are now protected by JWT authentication. Create an account on first access at `/register`.

## Why JobOps?

* **Universal Scraping**: Supports **LinkedIn, Indeed, Glassdoor, Adzuna, Hiring Café, Gradcracker, UK Visa Jobs**.
* **AI Scoring**: Ranks jobs by fit against *your* profile using your preferred LLM (OpenRouter/OpenAI/Gemini).
* **Auto-Tailoring**: Generates custom resumes (PDFs) for every application using RxResume v4.
* **CV Manager**: 🆕 Professional CV library with versioning and role-based organization
* **Email Tracking**: Connect Gmail to auto-detect interviews, offers, and rejections.
* **Asynchronous Processing**: BullMQ-powered job queues with automatic retry and monitoring.
* **PostgreSQL Database**: Scalable, production-ready database with Drizzle ORM.
* **JWT Authentication**: 🆕 Secure multi-user authentication with RS256 tokens and refresh mechanisms
* **Real-time Monitoring**: Bull Board dashboard for queue visualization and job management.
* **Modern UI/UX**: 🆕 Professional sidebar, feature-rich navbar, and premium high-contrast design
* **Dashboard Analytics**: 🆕 Real-time KPIs, high-visibility interactive charts (Donut, Area), and activity feed
* **Global Search**: 🆕 Cmd+K quick search across jobs, applications, and agents
* **Agents System**: 🆕 CRUD interface for AI agent orchestration with live monitoring
* **Self-Hosted**: Your data stays with you. No SaaS fees.
* **Skip Onboarding**: 🆕 Start using the dashboard immediately, configure integrations later.
* **E2E Tested**: 🆕 Playwright end-to-end tests ensure stability and reliability.

## Recent Updates (2026-03-11)

### ✅ Latest Improvements (March 2026)

#### 📄 CV Manager - Professional Resume Library (NEW - March 11, 2026)

- **CV Library Management**: Multi-CV support with role-based organization
  - Upload PDF resumes or RxResume JSON
  - Drag & drop file upload (max 10MB)
  - PDF preview with iframe
  - Version history tracking
  - Active CV designation for job scoring
  - Soft delete with recovery option
  
- **Version Control**: Complete history tracking
  - Automatic version creation on upload
  - Changes summary for each version
  - Download previous versions
  - Restore capability to revert to any version
  
- **Organization Features**: Smart filtering and search
  - Filter by target role (Software Engineer, Data Scientist, etc.)
  - Filter by active status
  - Filter by date (Last 7/30/90 days)
  - Search by CV name
  - Usage tracking (applications count)
  - Statistics dashboard with KPIs
  
- **Bulk Operations**: Efficient management
  - Multi-select CVs with checkboxes
  - Bulk delete (soft delete)
  - Export selected as ZIP archive
  - Duplicate CVs for role variations
  - "Used in X applications" indicator per CV

#### 🔐 Authentication & Security (NEW - March 11, 2026)

- **JWT RS256 Authentication**: Production-ready multi-user authentication system
  - RS256 asymmetric key signing (4096-bit)
  - Access tokens (15 minutes) + Refresh tokens (7 days)
  - Automatic token refresh with transparent UX
  - Token blacklist on logout (Redis-based)
  - httpOnly cookies for secure storage
  - Protected API routes with middleware
  - Rate limiting on login (5 attempts per 15 minutes)
  
- **User Management**: Complete auth flow
  - Registration with Argon2id password hashing
  - Login with credential validation
  - Logout with token revocation
  - User profile endpoint
  - Protected routes with auto-redirect
  
- **Frontend Auth UI**: Modern authentication pages
  - Login page with error handling
  - Registration with password validation
  - Forgot password placeholder
  - Loading states and feedback
  - Dark theme consistency

#### 🚀 Major Architecture Upgrades

- **PostgreSQL Migration**: Migrated from SQLite to PostgreSQL (Neon) with Drizzle ORM for better scalability and performance
- **BullMQ Integration**: Complete asynchronous job processing system with Redis
  - 4 specialized queues: scraping, scoring, tailoring, export
  - Automatic retry (3x) with exponential backoff (2s, 4s, 8s)
  - Real-time monitoring dashboard (Bull Board)
  - Horizontal scaling ready
- **Automatic Port Management**: 🆕 Intelligent port detection finds available ports automatically (3001, 3002, 3003...) and updates `.env`
- **Skip Onboarding Feature**: New "Skip setup for now" button lets you access the dashboard immediately without completing the 3-step onboarding wizard
- **Automated Setup Scripts**: One-command installation scripts for Windows (`start.ps1`) and Linux/macOS (`start.sh`)
- **E2E Testing with Playwright**: Complete end-to-end test suite validates app stability and user flows
- **Enhanced Documentation**: New Quick Start guide, Installation Complete guide, and Validation Report
- **TypeScript Validation**: Zero type errors across the codebase

#### 🎨 Modern UI & UX (March 2026)

- **Professional Sidebar**: New collapsible navigation with 4 groups (CORE, INTELLIGENCE, DATA, OPS) and 13 tabs
  - Smart collapsible groups with localStorage persistence
  - Active state with accent color (#E94560)
  - Responsive design (hidden on mobile, toggle via hamburger)
  - Smooth 300ms animations
  - Icons, badges (NEW/BETA), and tooltips
  
- **Feature-Rich Navbar**: Sticky navbar with 3 zones and advanced features
  - **LEFT:** Hamburger menu, JobOps logo + version badge
  - **CENTER:** Global search (Cmd+K) with categorized results (Jobs, Applications, Agents)
  - **RIGHT:** Notifications badge, Quick actions menu (⚡ Nouveau), System status dot, User menu
  - Auto-refresh progress bar on API calls
  - Backdrop blur effect
  
- **Dashboard KPIs & Analytics**: 🆕 Real-time metrics and high-visibility visualizations
  - 4 Animated KPI Cards: Total Applications, Average Score, Response Rate, Pending Jobs
  - **Vibrancy & Contrast Refinements**: High-contrast strokes, visible axes, and premium card gradients
  - Counter-up animations (1000ms duration)
  - Month-over-month trends with percentage indicators
  - 3 Premium Recharts graphs:
    - **LineChart**: Applications over 30 days with glowing area gradient
    - **DonutChart**: Modern status distribution with interactive legend
    - **BarChart**: Top 10 companies by score with expanded labels visibility
  - Activity Feed: 10 latest activities with timestamps and links
  - Skeleton loading states for better UX
  
- **Agents Management System**: 🆕 Complete CRUD interface for AI agent orchestration
  - 4 Pre-built Agents: Scraper, Scoring, Tailoring, Inbox
  - Real-time monitoring with live status badges (Idle/Running/Error/Disabled)
  - Run/Stop controls with visual feedback
  - Configuration modal with JSON preview
  - Terminal-like logs panel with level filters (info/warn/error/debug)
  - Enable/Disable toggles without restart
  - Auto-refresh every 10 seconds with LIVE indicator
  - Metrics per agent: Total runs, Success rate, Jobs/hour
  - 8 RESTful API endpoints for full CRUD operations

#### 📊 New API Endpoints (March 2026)

- **Authentication APIs** (5 routes):
  - `POST /api/auth/register` - Create new user account
  - `POST /api/auth/login` - Authenticate and get tokens
  - `POST /api/auth/refresh` - Renew access token
  - `POST /api/auth/logout` - Revoke refresh token
  - `GET /api/auth/me` - Get current user profile

- **Analytics APIs** (5 routes):
  - `GET /api/analytics/kpis` - Dashboard KPIs with trends
  - `GET /api/analytics/daily` - Applications per day (30 days)
  - `GET /api/analytics/status-distribution` - Status breakdown
  - `GET /api/analytics/top-companies` - Top 10 by score
  - `GET /api/analytics/activity` - Recent activity feed

- **Search & Monitoring APIs** (5 routes):
  - `GET /api/search?q=query` - Global search (jobs, applications, agents)
  - `GET /api/notifications/count` - Notification badge count
  - `GET /api/health` - System health (database, redis, queues)
  - `GET /api/health/ping` - Simple ping endpoint
  - `GET /api/notifications` - Full notifications list

- **Agents APIs** (8 routes):
  - `GET /api/agents` - List all agents with metrics
  - `GET /api/agents/:id` - Agent detail + run history (20 last)
  - `POST /api/agents/:id/run` - Trigger manual run
  - `POST /api/agents/:id/stop` - Stop running agent
  - `PUT /api/agents/:id/config` - Update configuration
  - `POST /api/agents/:id/enable` - Enable agent
  - `POST /api/agents/:id/disable` - Disable agent
  - `GET /api/agents/:id/logs` - Paginated logs with level filters

- **CV Management APIs** (11 routes):
  - `GET /api/cvs` - List all CVs with filters (role, active, date)
  - `GET /api/cvs/stats` - Statistics overview (total, by role, recent)
  - `GET /api/cvs/:id` - Single CV details
  - `GET /api/cvs/:id/versions` - Version history with metadata
  - `POST /api/cvs` - Upload new CV (PDF/JSON, Multer)
  - `POST /api/cvs/:id/duplicate` - Duplicate CV with new name
  - `POST /api/cvs/:id/set-active` - Set as active CV
  - `POST /api/cvs/bulk-delete` - Bulk delete (soft delete)
  - `POST /api/cvs/bulk-export` - Export selected CVs as ZIP
  - `POST /api/cvs/:id/restore/:versionId` - Restore previous version
  - `DELETE /api/cvs/:id` - Delete CV (soft delete)

See detailed documentation in:
- [orchestrator/SIDEBAR_IMPLEMENTATION.md](./orchestrator/SIDEBAR_IMPLEMENTATION.md) - Sidebar architecture
- [orchestrator/NAVBAR_IMPLEMENTATION.md](./orchestrator/NAVBAR_IMPLEMENTATION.md) - Navbar features
- [orchestrator/DASHBOARD_IMPLEMENTATION.md](./orchestrator/DASHBOARD_IMPLEMENTATION.md) - Dashboard KPIs
- [orchestrator/AGENTS_IMPLEMENTATION.md](./orchestrator/AGENTS_IMPLEMENTATION.md) - Agents system
- [orchestrator/BULLMQ_FINAL_IMPLEMENTATION.md](./orchestrator/BULLMQ_FINAL_IMPLEMENTATION.md) - BullMQ details
- [CHANGELOG.md](./CHANGELOG.md) - Detailed changes
- [VALIDATION_REPORT.md](./VALIDATION_REPORT.md) - Test results
- [PORT_MANAGEMENT.MD](./PORT_MANAGEMENT.md) - Port configuration

## Workflow

1. **Search**: Scrapes job boards for roles matching your criteria (asynchronous via BullMQ).
2. **Score**: AI ranks jobs (0-100) based on your resume/profile (queued processing with retry).
3. **Tailor**: Generates a custom resume summary & keyword optimization for top matches.
4. **Export**: Uses [RxResume v4](https://v4.rxresu.me) to create tailored PDFs (background job).
5. **Track**: "Smart Router" AI watches your inbox for recruiter replies.

All heavy operations run asynchronously with automatic retry and real-time monitoring.

## Supported Extractors

| Platform | Focus |
| --- | --- |
| **LinkedIn** | Global / General |
| **Indeed** | Global / General |
| **Glassdoor** | Global / General |
| **Adzuna** | Multi-country API source |
| **Hiring Café** | Global / General |
| **Gradcracker** | STEM / Grads (UK) |
| **UK Visa Jobs** | Sponsorship (UK) |

*(More extractors can be added via TypeScript - see [extractors documentation](https://jobops.dakheera47.com/docs/extractors/overview))*

## Post-App Tracking (Killer Feature)

Connect Gmail → AI routes emails to your applied jobs.

* "We'd like to interview you..." → **Status: Interviewing** (Auto-updated)
* "Unfortunately..." → **Status: Rejected** (Auto-updated)

See [post-application tracking docs](https://jobops.dakheera47.com/docs/features/post-application-tracking) for setup.

## Modern Dashboard & UI

JobOps features a completely redesigned interface with professional navigation and real-time monitoring.

### Dashboard (http://localhost:3001/dashboard)

Your command center with real-time metrics and visualizations:

**KPI Cards (4 metrics):**
- **Total Applications**: Counter with month-over-month trend percentage
- **Average Score**: Suitability score with circular gauge (0-100)
- **Response Rate**: Percentage of interviews + offers
- **Pending Jobs**: Jobs ready to apply with counter animation

**Interactive Charts (3 visualizations):**
- **LineChart**: Activity over 30 days with glowing trend line and area gradient
- **DonutChart**: Modern status distribution (Applied, Interview, Rejected, Offer)
- **BarChart**: Top 10 companies by score with high-contrast labels and spacing

**Activity Feed:**
- 10 latest activities with real-time updates
- Job matched, CV tailored, Application sent, Status changed
- Timestamps with relative time (5m ago, 2h ago)
- Direct links to related jobs

**Features:**
- Skeleton loading states for smooth UX
- Counter-up animations (1000ms)
- Auto-refresh on navigation
- Fully responsive design

### Global Search (Cmd+K or ⌘K)

Press Cmd+K anywhere in the app to open instant search:

- **Categorized Results**: Jobs, Applications, Agents
- **Real-time Search**: Debounced 300ms for performance
- **Keyboard Navigation**: Escape to close, Enter to navigate
- **Smart Filters**: Searches across titles, employers, locations
- **Quick Access**: Navigate directly to any entity

### Agents Management (http://localhost:3001/agents)

🆕 **New Feature**: Complete CRUD interface for AI agent orchestration

**4 Pre-built Agents:**

1. **Scraper Agent**: Discovers jobs from configured sources
   - Configurable sources: LinkedIn, Indeed, Glassdoor
   - Max jobs per run, auto-scoring options
   - Rate limiting and retry logic

2. **Scoring Agent**: Evaluates job suitability
   - Minimum score threshold
   - Auto-tailor high-scoring jobs
   - Batch processing configuration

3. **Tailoring Agent**: Generates custom CVs
   - Project selection (max 3)
   - Auto-generation toggle
   - PDF output optimization

4. **Inbox Agent**: Monitors email responses
   - Sync interval (5 minutes default)
   - Auto-classification of responses
   - Interview/rejection detection

**Agent Controls:**
- **Run/Stop**: Manual trigger with visual feedback
- **Enable/Disable**: Toggle without server restart
- **Configuration**: JSON-based config with validation
- **Logs**: Terminal-like view with level filters (info/warn/error/debug)
- **Live Monitoring**: Auto-refresh every 10 seconds

**Metrics per Agent:**
- Total runs with success/failure breakdown
- Jobs processed per hour
- Average duration per run
- Last run timestamp

**API Endpoints:**
- Full RESTful API with 8 endpoints
- Run history (20 latest runs)
- Paginated logs (100 entries)
- Real-time status updates

See [orchestrator/AGENTS_IMPLEMENTATION.md](./orchestrator/AGENTS_IMPLEMENTATION.md) for complete documentation.

### Application Navigation

**Sidebar Structure (4 groups, 13 tabs):**

**CORE** (Primary workflows)
- 📊 Dashboard - Real-time KPIs and analytics
- 🔍 Job Search - Multi-source job discovery
- 📝 Applications - Track application status
- 📧 Inbox Tracker - Email monitoring

**INTELLIGENCE** (AI features)
- 🤖 Agents - Agent orchestration (NEW)
- ✨ Prompt Studio - LLM prompt management (BETA)
- 🧠 AI Insights - Intelligent recommendations (BETA)

**DATA** (Content management)
- 📊 Datasets - Training data management
- 📄 CV Manager - Resume versions
- 🔌 Integrations - Third-party connections

**OPS** (System management)
- 📈 Monitoring - System health (NEW)
- 📋 Logs - Application logs
- ⚙️ Settings - Configuration

**Sidebar Features:**
- Collapsible groups with localStorage persistence
- Active state with red accent (#E94560)
- Icons, labels, and badges (NEW/BETA)
- Tooltips in collapsed mode
- Smooth 300ms animations
- Responsive: Hidden on mobile, toggle via hamburger

**Navbar Features:**
- Logo + version badge (v0.1.31)
- Global search (Cmd+K)
- Notifications badge with count
- Quick actions dropdown (⚡ Nouveau)
- System status indicator (green/orange/red)
- User menu (Profile, Settings, Logout)
- Progress bar on API calls

## Job Queue Monitoring & Management

JobOps includes a powerful asynchronous job processing system with real-time monitoring.

### Bull Board Dashboard

Access the visual queue dashboard at: **http://localhost:3001/admin/queues**

**Features:**
- 📊 Real-time queue statistics (waiting, active, completed, failed)
- 🔍 Job details with progress tracking (0-100%)
- 🔄 Retry failed jobs manually
- 🗑️ Remove stuck or failed jobs
- 📈 Performance metrics and job history

### Queue System

JobOps uses BullMQ with 4 specialized queues:

| Queue | Purpose | Concurrency | Rate Limit |
|-------|---------|-------------|------------|
| **scraping** | Job discovery | 2 concurrent | 10/min |
| **scoring** | AI suitability scoring | 5 concurrent | 50/min |
| **tailoring** | PDF generation | 3 concurrent | 20/min |
| **export** | Data export | 4 concurrent | 30/min |

**Automatic Retry:**
- 3 attempts per job
- Exponential backoff: 2s, 4s, 8s
- Failed jobs kept for debugging

**Monitoring API:**
```bash
# Get all queues status
curl http://localhost:3001/api/queues/status

# Get specific queue details
curl http://localhost:3001/api/queues/scoring/status

# List jobs by status
curl http://localhost:3001/api/queues/scoring/jobs?status=completed
```

See [orchestrator/BULLMQ_FINAL_IMPLEMENTATION.md](./orchestrator/BULLMQ_FINAL_IMPLEMENTATION.md) for complete implementation details.

**Note on Analytics**: The alpha version includes anonymous analytics (Umami) to help debug performance. To opt-out, block `umami.dakheera47.com` in your firewall/DNS.

**Security:** Do not commit `.env`. If the API is exposed (e.g. on a public URL), set `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` in `.env` so that write operations require Basic Auth.

## Testing

### E2E Tests (Playwright)

JobOps includes end-to-end tests using Playwright to ensure app stability.

**Prerequisites:** Start the application before running tests.

**Terminal 1** (start server):
```bash
npm --workspace orchestrator run start
```

**Terminal 2** (run tests):
```bash
# Run all E2E tests
npm --workspace orchestrator run test:e2e

# Or use Playwright UI
npm --workspace orchestrator run test:e2e:ui
```

**Current Test Coverage:**
- ✅ Onboarding flow with skip option
- ✅ Dashboard accessibility
- ✅ Main UI elements visibility

**Results:** All tests passing (6.9s runtime) - See [VALIDATION_REPORT.md](./VALIDATION_REPORT.md) for details.

### Unit Tests (Vitest)

```bash
npm --workspace orchestrator run test
```

## ☁️ Cloud Version (Coming Soon)

Self-hosting not your thing? A hosted version of JobOps is coming.

- No Docker required
- Up and running in 2 minutes
- Managed updates
- Self-hosted will always be free and open source

👉 Join the waitlist at [https://try.jobops.app](https://try.jobops.app?utm_source=github&utm_medium=readme&utm_campaign=waitlist)

## Contributing

Want to contribute code, docs, or extractors? Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md).

That guide includes:
- Development workflow
- Code quality checks (Biome linter, TypeScript)
- E2E testing with Playwright
- PR guidelines

The guide is intentionally link-first so contributor workflow lives in one place while setup and feature docs stay in the canonical docs site.

## Performance & Stability

**Latest Validation (2026-03-11):**
- ✅ Installation: ~2 minutes (1,821 packages)
- ✅ Build time: ~20 seconds
- ✅ Server startup: ~6 seconds
- ✅ Health check response: <10ms
- ✅ E2E tests: 1/1 passing
- ✅ TypeScript: Zero errors

**Package Audits:**
- 35 vulnerabilities detected (dev dependencies and extractors only)
- **Orchestrator in production: Not affected**
- See [VALIDATION_REPORT.md](./VALIDATION_REPORT.md) for security analysis

## Troubleshooting

### Common Issues

**Redis connection errors (ECONNREFUSED):**
```bash
# JobOps uses BullMQ which requires a running Redis instance on port 6379
docker ps  # Check if Redis container is running
# If not, start it:
docker run -d -p 6379:6379 --name redis redis:alpine

# Test connection
redis-cli ping  # Should return "PONG"
```

**Database connection errors:**
```bash
# Check your DATABASE_URL in .env
# For Neon PostgreSQL, it should look like:
# DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

**Port conflicts (3001 already in use):**

The automated scripts (`start.ps1` / `start.sh`) handle this automatically with 3 options:
1. Kill the existing process
2. Find an alternative port (3002, 3003, etc.)
3. Exit

**Manual port management:**
```bash
# Edit .env file
PORT=5000  # Use any available port

# Or manually kill the process
# Windows
netstat -ano | findstr :3001
taskkill /F /PID <PID>

# Linux/macOS
lsof -ti:3001 | xargs kill -9
```

See [Port Management Guide](./PORT_MANAGEMENT.md) for complete documentation.

**Missing client bundle:**
```bash
npm --workspace orchestrator run build:client
```

**Database migration errors:**
```bash
npm --workspace orchestrator run db:migrate
```

**Queue/Worker issues:**
```bash
# Check worker logs
npm --workspace orchestrator run workers

# Check queue status
curl http://localhost:3001/api/queues/status

# Access Bull Board dashboard
open http://localhost:3001/admin/queues
```

For more help, see [Troubleshooting Guide](https://jobops.dakheera47.com/docs/troubleshooting/common-problems).

## Star History

<a href="https://www.star-history.com/#Anderson-Archimede/JobOps&type=date&legend=top-left">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Anderson-Archimede/JobOps&type=date&theme=dark&legend=top-left" />
<source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Anderson-Archimede/JobOps&type=date&legend=top-left" />
<img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Anderson-Archimede/JobOps&type=date&legend=top-left" />
</picture>
</a>

## License

**AGPLv3 + Commons Clause** - You can self-host, use, and modify JobOps, but
you cannot sell the software itself or offer paid hosted/support services whose
value substantially comes from JobOps. See [LICENSE](LICENSE).
