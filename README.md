# Intraflow — Enterprise Operations & Project Management Web Client 🚀

> **Intraflow** is a modern, responsive, Jira-inspired enterprise workflow and project management web application built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS v4**. It interfaces with the high-performance Intraflow NestJS REST API, supporting strict 5-state Kanban lifecycle management, directed acyclic graph (DAG) task dependencies, role-based access control (RBAC), and persistent cookie-based session security.

---

## 📑 Table of Contents

- [Core Technologies](#-core-technologies)
- [Key Features & Capabilities](#-key-features--capabilities)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Environment Separation & Configuration](#-environment-separation--configuration)
- [Getting Started](#-getting-started)
- [Development & Production Scripts](#-development--production-scripts)
- [Architecture & Directory Structure](#-architecture--directory-structure)
- [Backend Integration Documentation](#-backend-integration-documentation)

---

## 🛠 Core Technologies

- **UI Library**: React 19 + TypeScript (ES2022 target)
- **Bundler & Dev Server**: Vite 7 with Fast Refresh and Hot Module Replacement (HMR)
- **Styling**: Tailwind CSS v4 with Jira-inspired neutral-cool slate surfaces and primary blue accents
- **Server State & Caching**: TanStack React Query v5 (automatic cache invalidation and pessimistic locking synchronization)
- **HTTP Client**: Axios with interceptors, global error parsing, and credentials management (`withCredentials: true`)
- **UI Components & Primitives**: Radix UI dialogs, dropdowns, and accessible component primitives
- **Notifications**: Sonner stacked toast notifications
- **Icons**: Lucide React

---

## ✨ Key Features & Capabilities

### 1. Robust Cookie-Based Session Authentication
- **Secure Authentication**: Uses signed, HTTP-only session cookies via `POST /auth/signin` and `POST /auth/signout`. Zero sensitive tokens stored in `localStorage` or `sessionStorage`.
- **Session Hydration**: Automated session recovery on initial page load via `GET /users/me`, restoring identity and team membership across page refreshes.
- **Onboarding & Recovery Flows**:
  - Invitation acceptance with token verification (`/signup?token=...`).
  - Forgot password requests and secure token-based password reset (`/reset-password?token=...`).
  - Two-step email change verification (`/confirm-email?token=...`).
- **Route Guards**: `<ProtectedRoute />` protects authenticated areas; `<AdminRoute />` enforces global administrator privileges.

### 2. Upgraded Kanban Board & Workflow Engine
- **5-State Finite State Machine**:
  $$\text{UNASSIGNED} \longleftrightarrow \text{PENDING} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{IN\_REVIEW} \longrightarrow \text{COMPLETED}$$
- **Authentic HTML5 Drag-and-Drop**:
  - Drag cards with immediate visual elevation and opacity feedback.
  - Active drop target column highlighting (`ring-2 ring-primary/25 bg-primary/5`).
  - **Drop Transition Rules & RBAC Enforcement**:
    - `UNASSIGNED → PENDING`: Moderator/Admin only; triggers Assignment Dialog.
    - `PENDING → UNASSIGNED`: Moderator/Admin only; dispatches unassign mutation.
    - `PENDING → IN_PROGRESS`: Assigned developer only; verifies unblocked prerequisites (`isBlocked: false`); dispatches start mutation.
    - `IN_PROGRESS → IN_REVIEW`: Assigned developer only; dispatches submit mutation.
    - `IN_REVIEW → COMPLETED`: Moderator/Admin only; dispatches validation mutation.
    - `IN_REVIEW → IN_PROGRESS`: Moderator/Admin only; backward drag triggers `RejectTaskModal` requiring mandatory feedback reason (10–500 chars).
    - **Illegal Transitions**: Attempting invalid state jumps (e.g., `UNASSIGNED → COMPLETED`) is intercepted client-side with descriptive explanatory toasts, preventing invalid backend requests.
- **Responsive Horizontal Scrolling Canvas**:
  - Eliminates card crushing by utilizing fixed-width columns (`w-[290px] sm:w-[310px] shrink-0`) in a horizontal scroll container (`overflow-x: auto scrollbar-thin`).
  - Task cards utilize `line-clamp-2 break-words` to ensure clean, multiline text wrapping without clipping.

### 3. Directed Acyclic Graph (DAG) Task Dependencies
- Tasks support explicit prerequisite dependencies (`dependsOn`).
- Derived `isBlocked` flag computed by the backend; blocked tasks cannot be started until all prerequisite tasks reach `COMPLETED` status.
- Dependency cycle detection handled with friendly conflict notifications (`409 Conflict`).

### 4. Collaboration: Comments & File Attachments
- **Task Comments**: Threaded discussions displaying author avatars, timestamps, and edit/delete capabilities for comment authors.
- **Rejection Feedback**: Rejection reasons are stored as ordinary user comments authored by the reviewing moderator (`isSystem: false`), documenting required fixes in the activity feed.
- **File Attachments**: Drag-and-drop file upload zone (up to 10MB limit with binary validation), file listing, deletion, and authenticated blob download streaming.

### 5. Teams & Project Management
- **Team Roster Management**: Admin team creation/deletion; role assignments (`MODERATOR` vs `MEMBER`); safe removal with cascading task unassignment.
- **Project Tracking**: Multi-project portfolios, completion rate progress bars, status badges (`ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`), and overdue deliverable alerts.

---

## 👥 Role-Based Access Control (RBAC)

The application enforces a dual-tier authorization model synchronized with the NestJS backend:

### Global Roles
| Global Role | Scope | Key Permissions |
| :--- | :--- | :--- |
| **`ADMIN`** | Organization-wide | Create/edit/delete any project or team; invite users; view all users; assign/validate/reject any task. |
| **`EMPLOYEE`** | Team-scoped | Restricted to assigned projects and team tasks; cannot access `/users` or `/teams` administrative views. |

### Team Membership Roles
| Team Role | Scope | Key Permissions |
| :--- | :--- | :--- |
| **`MODERATOR`** | Owning Team | Create tasks in owned projects; assign tasks to team members; validate and reject tasks in review; update project status to `COMPLETED`. |
| **`MEMBER`** | Assigned Tasks | Start and submit assigned tasks; participate in discussions; read team roster. Cannot assign or validate tasks. |

---

## 🌐 Environment Separation & Configuration

The application cleanly distinguishes between **development**, **staging**, and **production** environments using Vite environment files.

### Configuration Template (`.env.example`)

Copy `.env.example` to `.env` (or `.env.local` for local overrides):

```bash
cp .env.example .env
```

```ini
# Base URL for the NestJS Backend API
VITE_API_URL=http://localhost:3000

# Client origin for email link alignment
VITE_APP_URL=http://localhost:5173
```

### Environment Comparison Matrix

| Parameter | Development | Staging / Production |
| :--- | :--- | :--- |
| **Frontend URL** | `http://localhost:5173` | `https://app.yourdomain.com` |
| **Backend API URL** | `http://localhost:3000` | `https://api.yourdomain.com` |
| **Session Cookies** | `SameSite=Lax; HttpOnly` | `SameSite=None; Secure; HttpOnly` (over HTTPS) |
| **Backend CORS Origin** | `http://localhost:5173` | `https://app.yourdomain.com` |
| **Email Testing Inbox** | Mailpit (`http://localhost:8025`) | Production SMTP (SES, SendGrid, etc.) |

> [!IMPORTANT]
> **Session Cookie Requirements**:
> Because the client utilizes signed HTTP-only cookies (`withCredentials: true`), the backend CORS configuration (`CORS_ORIGIN`) **must** match the exact protocol, domain, and port of the frontend client. In production, HTTPS is required for cross-domain cookie transmission (`SameSite=None; Secure`).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20+ or v22+
- **pnpm**: v9+ or v10+ (recommended package manager)
- **Backend API**: Running Intraflow NestJS backend on `http://localhost:3000`
- **Mailpit**: Running for local email testing on `http://localhost:8025`

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/intraflow.git
cd intraflow

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
```

### Starting the Development Server

```bash
pnpm run dev
```

The application will be accessible at [http://localhost:5173](http://localhost:5173).

---

## 📦 Development & Production Scripts

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Starts the Vite development server with Hot Module Replacement on port 5173. |
| `pnpm run build` | Runs TypeScript compilation check (`tsc -b`) and produces optimized production assets in `dist/`. |
| `pnpm run lint` | Runs ESLint across all TypeScript and React source files with 0 allowable errors. |
| `pnpm run preview` | Locally serves the production build from `dist/` to verify production behavior. |

---

## 📂 Architecture & Directory Structure

```
intraflow/
├── docs/                                # Comprehensive integration and audit reports
│   └── frontend-audit/
│       ├── API_INTEGRATION_MATRIX.md
│       ├── FINAL_INTEGRATION_CHECKLIST.md
│       ├── FINAL_UI_AND_KANBAN_REFINEMENT_REPORT.md
│       ├── FRONTEND_IMPLEMENTATION_ROADMAP.md
│       ├── FULL_IMPLEMENTATION_REPORT.md
│       ├── INTRAFLOW_FRONTEND_CURRENT_STATE_AUDIT.md
│       └── MANUAL_ACCEPTANCE_REPORT.md
├── src/
│   ├── components/
│   │   ├── route-guards/                # AdminRoute and ProtectedRoute guards
│   │   ├── tasks/                       # TaskCard, TaskDetailModal, RejectModal, CreateModal
│   │   ├── teams/                       # TeamRoster table and management actions
│   │   ├── ui/                          # Radix & CVA primitives (Badge, Dialog, Button, etc.)
│   │   ├── header.tsx                   # Jira-inspired 3-section proportional navigation bar
│   │   ├── sidebar.tsx                  # Draggable, resizable, collapsible navigation sidebar
│   │   └── search-bar.tsx               # Global search input with instant routing
│   ├── contexts/
│   │   ├── AuthContext.tsx              # Session bootstrap, identity store & auth actions
│   │   └── SidebarContext.tsx           # Sidebar toggle, drag-resize state & persistence
│   ├── lib/
│   │   ├── api-client.ts                # Axios instance with credentials & error translation
│   │   └── utils.ts                     # Tailwind class merge utility (cn)
│   ├── pages/
│   │   ├── dashboard/                   # Dashboard pages (Overview, Projects, Teams, Users)
│   │   │   ├── project-view/            # Project sub-routes (Kanban Board, Tasks, Stats, Calendar)
│   │   │   └── dashboard-layout.tsx     # Responsive dashboard shell & navigation container
│   │   ├── login.tsx                    # Cookie-based signin page
│   │   ├── signup.tsx                   # Invitation onboarding flow
│   │   ├── forgot-password.tsx          # Password recovery request page
│   │   ├── reset-password.tsx           # Password reset execution page
│   │   └── confirm-email.tsx            # Two-step email change confirmation
│   ├── types/
│   │   └── index.ts                     # Strict TypeScript domain interfaces matching backend DTOs
│   ├── App.tsx                          # Application router configuration
│   └── main.tsx                         # QueryClient provider & root entry point
├── .env.example                         # Environment configuration template
├── package.json                         # Project dependencies and npm scripts
└── vite.config.ts                       # Vite configuration with path aliases (@ -> src)
```

---

## 📚 Backend Integration Documentation

For complete technical specifications, contract mappings, and audit histories, consult the documentation directory:

- [FINAL_UI_AND_KANBAN_REFINEMENT_REPORT.md](file:///c:/Users/Mohammed/Desktop/Github/intraflow/docs/frontend-audit/FINAL_UI_AND_KANBAN_REFINEMENT_REPORT.md) — Final quality, visual restoration, and Kanban drag-and-drop verification report.
- [FULL_IMPLEMENTATION_REPORT.md](file:///c:/Users/Mohammed/Desktop/Github/intraflow/docs/frontend-audit/FULL_IMPLEMENTATION_REPORT.md) — Comprehensive technical implementation report covering all phases.
- [MANUAL_ACCEPTANCE_REPORT.md](file:///c:/Users/Mohammed/Desktop/Github/intraflow/docs/frontend-audit/MANUAL_ACCEPTANCE_REPORT.md) — Manual browser acceptance testing evidence across all scenarios.
- [API_INTEGRATION_MATRIX.md](file:///c:/Users/Mohammed/Desktop/Github/intraflow/docs/frontend-audit/API_INTEGRATION_MATRIX.md) — Complete endpoint contract mapping between frontend and backend.
- [FINAL_INTEGRATION_CHECKLIST.md](file:///c:/Users/Mohammed/Desktop/Github/intraflow/docs/frontend-audit/FINAL_INTEGRATION_CHECKLIST.md) — Exhaustive checklist verifying contract conformance.
