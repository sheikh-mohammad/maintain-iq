
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/MaintainIQ-10b981?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMnYyME0xNyA1SDkuNWEzLjUgMy41IDAgMCAwIDAgN2g1YTMuNSAzLjUgMCAwIDEgMCA3SDYiLz48L3N2Zz4=">
    <img src="https://img.shields.io/badge/MaintainIQ-10b981?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMnYyME0xNyA1SDkuNWEzLjUgMy41IDAgMCAwIDAgN2g1YTMuNSAzLjUgMCAwIDEgMCA3SDYiLz48L3N2Zz4=" alt="MaintainIQ">
  </picture>
</p>

<h1 align="center">MaintainIQ</h1>

<p align="center">
  <strong>QR-Powered Maintenance &amp; Asset History Platform</strong><br>
  Scan &bull; Report &bull; Diagnose &bull; Maintain
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=fff" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=fff" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000" alt="JavaScript">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff" alt="Supabase">
  <img src="https://img.shields.io/badge/Chart.js-FF6384?logo=chart.js&logoColor=fff" alt="Chart.js">
</p>

<p align="center">
  <a href="#overview">Overview</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#project-structure">Structure</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#database-schema">Database Schema</a> &bull;
  <a href="#scripts-overview">Scripts</a>
</p>

---

## Overview

**MaintainIQ** is a full-stack, role-based facility maintenance management platform — built entirely with **vanilla HTML, CSS, and JavaScript (ES Modules)** and powered by **Supabase** for authentication, database, and file storage.

It transforms how organisations track physical assets, report faults, and manage repair workflows — replacing spreadsheets, phone trees, and lost paper trails with QR codes, structured pipelines, and an immutable audit trail.

Every asset gets a unique QR code. Anyone in the facility can scan it, land on a dedicated page, and submit an issue report — no training or account required. Administrators triage and assign technicians. Technicians diagnose, log work, upload evidence photos, and mark issues resolved. Every action is automatically recorded in an append-only history log.

---

## Features

### 🔐 Role-Based Access

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access — manage assets, issues, technicians, and maintenance records; view analytics dashboards with interactive charts; close/reopen issues; assign technicians; view the immutable history timeline |
| **Technician** | View only assigned issues; perform maintenance (diagnosis notes, work log, cost tracking, evidence photo upload); transition issue and asset statuses through the repair pipeline |
| **Public / Reporter** | Browse all registered assets; scan QR codes to land on a specific asset's detail page; sign in to report issues on any asset |

**How authentication works:**
- **Admin** — identified by the email `admin@admin.com` after signing in via Supabase Auth
- **Technicians** — stored in a dedicated `technicians` table; login checks this table first (email + password) before falling back to Supabase Auth, creating a local session (`maintainiq-tech-session`) in localStorage
- **Regular users** — sign up via Supabase Auth and land on the home page after login

### 📦 Asset Management

- Register assets with name, category (AV Equipment, HVAC, Electrical, Plumbing, Furniture, Other), and location
- Each asset receives a unique 6-digit auto-generated code
- Initial status is always **Operational**
- **Status state machine:** `Operational` ↔ `Issue Reported` ↔ `Under Inspection` ↔ `Under Maintenance` ↔ `Out of Service` ↔ `Retired`
- Admins can transition asset status via an inline table dropdown — every change is logged to history
- **Retired** assets display a notice and cannot accept new issues

### 📱 QR Code Generation

- Every asset registers with a downloadable QR code linking to `pages/public/assets.html#<assetCode>`
- The public assets page reads `window.location.hash` — scanning a QR code auto-scrolls to and highlights the target asset
- Generated client-side using [QRCode.js](https://github.com/davidshimjs/qrcodejs)
- Downloadable as PNG from the admin panel

### 📋 Issue Reporting & Triage

**Reporting (public — signed in users):**
- Modal form on any asset card or detail view
- Fields: title, description, priority (Low / Medium / High / **Critical**), reporter email (auto-filled from session)
- **Critical priority** auto-sets asset status to `Out of Service`; all others set to `Issue Reported`

**Triage (admin):**
- Full issues table with per-row action buttons tied to status:
  - **Reported** → `Assign` (opens technician assignment modal)
  - **Resolved** → `Close` or `Reopen`
  - **Closed** → `Reopen` (increments `reopened_count`, resets to `Assigned`)
  - Intermediate statuses → read-only badge
- All destructive actions pass through a custom confirmation modal
- Critical-priority rows have a distinct red treatment with pulse alert icon

### 🔧 Technician Maintenance Workflow

- Technicians see **only their assigned issues** (filtered by email match)
- **Maintenance form** includes:
  - Issue selector (auto-populated from assigned open issues)
  - Inspection notes and work performed (work required when resolving)
  - Cost tracking with non-negative validation
  - Status transition: `Inspection Started` → `Maintenance In Progress` → `Waiting for Parts` → `Resolved`
  - Next service date (cannot be before today when resolving)
  - **Evidence photo upload** to Supabase Storage (`maintenance-evidence` bucket)

**When maintenance is saved:**
1. Evidence image uploaded to Supabase Storage (if provided)
2. `maintenance_records` record inserted with all details
3. Issue status and `resolved_at` timestamp updated
4. **Asset status auto-syncs:**
   - `Inspection Started` → asset becomes `Under Inspection`
   - `Maintenance In Progress` / `Waiting for Parts` → asset becomes `Under Maintenance` (or `Out of Service` for critical issues)
   - `Resolved` → asset returns to `Operational`
5. Action logged to the history log

### 📊 Analytics Dashboard (Admin)

Four interactive charts built with [Chart.js 4](https://www.chartjs.org/):

| Chart | Type | Insights |
|-------|------|----------|
| **Assets by Category** | Doughnut | Distribution across AV Equipment, HVAC, Electrical, etc. |
| **Issue Status Overview** | Doughnut | Share of Reported, Assigned, In Progress, Resolved, Closed |
| **Issues Over Time** | Bar | Monthly volume over the last 6 months |
| **Issue Priority Breakdown** | Bar | Count of Critical, High, Medium, Low |

Charts are responsive, respect the active colour theme, show loading skeletons and empty states, and re-render when data changes.

### 📜 Immutable History Log

Every system event is automatically captured in the `history_log` table:

| Event Type | Trigger |
|-----------|---------|
| `Asset Created` | Admin creates a new asset |
| `Status Changed` | Admin changes asset status |
| `Issue Reported` | User reports an issue via the public page |
| `Issue Assigned` | Admin assigns a technician |
| `Issue Resolved` | Technician completes maintenance |
| `Issue Closed / Reopened` | Admin closes or reopens an issue |
| `Maintenance Updated` | Technician saves in-progress maintenance |

The admin **History** page displays a chronologically sorted, colour-coded timeline with enriched asset names and issue titles. Old → new status transitions are visually highlighted.

### 🔍 Search & Filters

- **Admin:** Every data table (Assets, Issues, Technicians, Maintenance Records) has a real-time search input plus column-specific dropdown filters (status, category, location, priority, technician, specialty). Combined search + multi-filter + "no results" messaging.
- **Public Assets:** Search by keyword, filter by status and category.
- **Technician Issues:** Search by keyword, filter by status and priority.

### 🎨 Dark / Light Mode

- Full theme system driven by CSS custom properties
- Detects system preference (`prefers-color-scheme`) on first visit
- Persists user choice in `localStorage` under the key `maintainiq-theme`
- Smooth 0.3s CSS transitions on theme swap
- Toggle available on every page — navbar, mobile drawer, sidebar footers, and auth pages

### 📱 Responsive Design

- Mobile sidebar drawers with backdrop overlay on admin and technician dashboards
- Desktop sidebars collapse to icon-only mode
- Touch-friendly target sizes and tap interactions throughout
- Landing page adapts layout, typography, and grid columns across breakpoints

---

## Project Structure

```
maintain-iq/
├── index.html                          # Landing / marketing homepage
├── pages/
│   ├── auth/
│   │   ├── login.html                  # Sign-in page
│   │   └── signup.html                 # Account creation page
│   ├── private/
│   │   ├── admin/
│   │   │   └── index.html              # Administrator dashboard
│   │   └── technician/
│   │       └── index.html              # Technician dashboard
│   └── public/
│       └── assets.html                 # Public asset browser (QR scan destination)
├── css/
│   ├── style.css                       # Global styles, theme variables, navbar, drawer, footer
│   ├── index.css                       # Landing page styles (hero, features, workflow, showcase)
│   ├── auth/
│   │   └── index.css                   # Auth page card & form styles
│   ├── private/
│   │   ├── admin/
│   │   │   └── index.css               # Admin dashboard layout, sidebar, tables, analytics
│   │   └── technician/
│   │       └── index.css               # Technician dashboard layout & forms
│   └── public/
│       └── index.css                   # Public asset grid, detail view, search/filter
├── js/
│   ├── app.js                          # Landing page interactivity + theme toggle
│   ├── index.js                        # Landing page secondary initialisations
│   ├── config/
│   │   ├── config.js                   # Supabase project URL & anon key
│   │   └── example.config.js           # Example config template
│   ├── auth/
│   │   ├── auth.js                     # Core module: Supabase client, session, toasts,
│   │   │                               #   route guards, navbar/drawer user menu, history helper
│   │   ├── index.js                    # Auth pages shared init
│   │   ├── login.js                    # Login handler (tech lookup + Supabase Auth)
│   │   └── signup.js                   # Signup handler (Supabase Auth)
│   ├── private/
│   │   ├── admin/
│   │   │   └── index.js                # Full admin dashboard logic (~1,580 lines)
│   │   └── technician/
│   │       └── index.js                # Technician dashboard logic
│   └── public/
│       └── index.js                    # Public asset browsing, QR detection, issue reporting
└── assets/
    └── fonts/                          # Custom font files
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3 (Custom Properties, Flexbox, Grid, Transitions), JavaScript (ES Modules) |
| **Backend & Database** | [Supabase](https://supabase.com/) — Postgres database, Auth (email/password), Storage |
| **Charts** | [Chart.js 4](https://www.chartjs.org/) |
| **QR Codes** | [QRCode.js](https://github.com/davidshimjs/qrcodejs) |
| **Deployment** | Static host — all pages are plain `.html` files with client-side Supabase interaction |

---

## Getting Started

### 1. Clone and navigate

```bash
git clone https://github.com/your-username/maintain-iq.git
cd maintain-iq
```

### 2. Configure Supabase

You need your own Supabase project for the backend:

1. Create a project at [supabase.com](https://supabase.com)
2. Set up the database tables listed in the [Database Schema](#database-schema) section below
3. Create a public storage bucket named `maintenance-evidence`
4. Copy `js/config/example.config.js` to `js/config/config.js` and fill in your credentials:

```js
const PROJECT_URL = "https://your-project-id.supabase.co";
const PUBLISH_KEY = "your-supabase-anon-key";

export { PROJECT_URL, PUBLISH_KEY };
```

### 3. Seed an admin account

In your Supabase dashboard, under **Authentication > Users**, create a user with:
- **Email:** `admin@admin.com`
- **Password:** (your chosen password)

The app identifies administrators by this exact email address.

### 4. Serve the site

Since this project uses ES modules (`type="module"`), it **must** be served via an HTTP server — opening `index.html` from the filesystem (`file://`) will fail with CORS errors.

```bash
# Python
python -m http.server 5500

# VS Code — install the Live Server extension and click "Go Live"

# Node.js
npx serve .
```

### 5. Access the app

| Page | URL |
|------|-----|
| Landing page | `http://localhost:5500` |
| Sign In | `http://localhost:5500/pages/auth/login.html` |
| Sign Up | `http://localhost:5500/pages/auth/signup.html` |
| Admin Dashboard | Sign in as `admin@admin.com` — redirects automatically |
| Public Assets | `http://localhost:5500/pages/public/assets.html` |
| QR Scan Link | `http://localhost:5500/pages/public/assets.html#<assetCode>` |

---

## Database Schema

### `assets`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `int8` (PK, generated) | Auto-incrementing ID |
| `assetCode` | `int8` (unique) | 6-digit unique asset code |
| `name` | `text` | Display name |
| `category` | `text` | AV Equipment, HVAC, Electrical, Plumbing, Furniture, Other |
| `location` | `text` | Physical location |
| `status` | `text` | Operational, Issue Reported, Under Inspection, Under Maintenance, Out of Service, Retired |
| `condition` | `text` | Optional — asset condition description |
| `assignedTechnician` | `text` | Optional — assigned tech email |
| `created_at` | `timestamptz` | Auto-generated |

### `issues`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `int8` (PK, generated) | Auto-incrementing ID |
| `assetId` | `int8` | FK to `assets.assetCode` |
| `title` | `text` | Issue title |
| `description` | `text` | Issue description |
| `priority` | `text` | Low, Medium, High, Critical |
| `status` | `text` | Reported, Assigned, Inspection Started, Maintenance In Progress, Waiting for Parts, Resolved, Closed |
| `technician_email` | `text` | Assigned technician's email |
| `reporterEmail` | `text` | Reporter's email |
| `reopened_count` | `int4` | Number of times reopened |
| `created_at` | `timestamptz` | Auto-generated |
| `resolved_at` | `timestamptz` | When resolved |
| `closed_at` | `timestamptz` | When closed |
| `reopened_at` | `timestamptz` | Last reopened timestamp |

### `technicians`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `int8` (PK, generated) | Auto-incrementing ID |
| `email` | `text` (unique) | Login identifier |
| `full_name` | `text` | Display name |
| `specialty` | `text` | Electrical, Plumbing, HVAC, AV Equipment, General |
| `password` | `text` | Plain-text login password |
| `created_at` | `timestamptz` | Auto-generated |

### `maintenance_records`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `int8` (PK, generated) | Auto-incrementing ID |
| `issue_id` | `int8` | FK to `issues.id` |
| `asset_id` | `text` | FK to `assets.assetCode` |
| `technician_email` | `text` | Who performed the work |
| `diagnosis` | `text` | Inspection notes |
| `actions_taken` | `text` | Description of repairs |
| `cost` | `numeric` | Maintenance cost |
| `parts_used` | `text` | Parts replaced (optional) |
| `evidence_url` | `text` | Uploaded photo URL |
| `next_service_date` | `date` | Scheduled next service |
| `status` | `text` | In Progress, Completed, Cancelled |
| `created_at` | `timestamptz` | Auto-generated |
| `completed_at` | `timestamptz` | When completed |

### `history_log`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `int8` (PK, generated) | Auto-incrementing ID |
| `asset_code` | `text` | Associated asset code |
| `asset_name` | `text` | Denormalised asset name at time of event |
| `action` | `text` | Asset Created, Status Changed, Issue Reported, Issue Assigned, Issue Resolved, Issue Closed, Issue Reopened, Maintenance Updated |
| `actor` | `text` | Email or name of the person |
| `detail` | `text` | Human-readable change description |
| `issue_id` | `int8` | Associated issue ID (optional) |
| `created_at` | `timestamptz` | Auto-generated |

### Storage Bucket

| Bucket | Visibility | Purpose |
|--------|-----------|---------|
| `maintenance-evidence` | Public | Stores technician-uploaded repair photos |

---

## Issue Status Lifecycle

```
  Reported ──► Assigned ──► Inspection Started ──► Maintenance In Progress ──► Resolved ──► Closed
                                                          │                        │
                                                     Waiting for Parts           Reopened
                                                          │                        │
                                                          └────────────────────────┘
```

### Asset Status Sync Rules

| Event | New Asset Status |
|-------|-----------------|
| Issue reported (Critical priority) | `Out of Service` |
| Issue reported (Medium / High / Low) | `Issue Reported` |
| Technician starts inspection | `Under Inspection` |
| Technician starts repair (critical issue) | `Out of Service` |
| Technician starts repair (non-critical) | `Under Maintenance` |
| Technician resolves issue | `Operational` |

---

## Scripts Deep Dive

### `js/app.js` — Landing Page Engine

Handles all landing page interactivity:
- **Sticky navbar** — adds a `scrolled` class when past 40px scroll, triggering backdrop-blur styling
- **Mobile drawer** — opens/closes with overlay backdrop, Escape key support, body scroll lock
- **Hero 3D tilt** — mouse-following perspective rotation on the hero preview card
- **Dashboard mockup tabs** — cycles three tab views (Assets, Active Issues, Analytics) with sidebar sync
- **Animated stats counter** — scroll-triggered, outQuad-eased count-up animation using `requestAnimationFrame`
- **Pricing toggle** — monthly / annual tier switcher with scale-fade animation
- **Smooth scroll** — intercepts hash links, offsets for sticky header, highlights active nav section
- **Theme toggle** — detects system preference, persists to localStorage, applies 0.3s transitions

### `js/auth/auth.js` — Shared Core Module

Loaded on every page. Responsibilities:
- Initialises the Supabase client from config
- Fetches the session on `DOMContentLoaded` and updates the navbar, mobile drawer, admin topbar, and assets page button
- **Three session sources:** Supabase Auth session → `maintainiq-user` cache → `maintainiq-tech-session` (technician)
- Provides `signOutUser()` — clears all localStorage keys matching `sb-*`, the user cache, and the tech session
- Provides `showToast()` — creates animated toast notifications that slide in and auto-dismiss
- Provides `redirectAfterAuth()` — routes to admin dashboard / technician dashboard / home based on role
- Provides `requireAdmin()` and `protectRoute()` — page-level guards that redirect unauthenticated users
- Provides `createHistoryLog()` — inserts an event into the `history_log` table
- **Builds the user menu** — avatar with initials, name, dropdown with Dashboard link (admin only) and Sign Out

### `js/private/admin/index.js` — Admin Dashboard (~1,580 lines)

Six page sections managed by sidebar navigation:

| Section | Key Logic |
|---------|-----------|
| **Dashboard** | Fetches asset/issue/technician counts from Supabase; manages empty state |
| **Analytics** | Four Chart.js charts with loading skeletons, empty states, and theme-aware colours |
| **Assets** | Renders table with inline status dropdown (6 states), QR preview with download, location filter population |
| **Issues** | Renders table with critical-row highlighting; Assign / Close / Reopen action buttons; confirmation modals; technician dropdown |
| **Technicians** | Renders table; Add Technician modal with duplicate-email detection |
| **Maintenance Records** | Renders table with linked issue titles; dynamic detail modal showing evidence image, cost, diagnosis, parts |
| **History** | Timeline from `history_log` + `maintenance_records`; deduplication; colour-coded event dots; old→new transition highlighting |

**Shared systems:** Sidebar navigation (mobile overlay + desktop collapse), modal manager (open/close with body scroll lock), unified search/filter across all four data tables.

### `js/private/technician/index.js` — Technician Dashboard

- Validates technician session on load (redirects to login if missing)
- Renders issues table filtered by `technician_email` match
- "Perform Maintenance" button auto-selects the issue in the maintenance form and navigates to the tab
- Full maintenance form with validation:
  - Work description required when resolving
  - Cost must be non-negative
  - Next service date cannot be before today
- Evidence upload to Supabase Storage with public URL retrieval
- State machine sync: updates issue status, asset status (`Under Inspection` / `Under Maintenance` / `Out of Service` / `Operational`), and inserts history log entry
- Search and filter for the issues table

### `js/public/index.js` — Public Assets Page

- Loads all assets from Supabase as interactive cards
- Each card displays: name, code, category, location, condition, status badge, service dates (from latest maintenance record), issue activity count, live QR code
- **QR scan detection:** reads `window.location.hash`, optionally scrolls to and highlights the matching card, or loads a full detail view for that asset
- **Detail view:** full metadata, dynamic QR code, activity timeline from joined issues + maintenance records
- **Report Issue modal:** auto-fills reporter email from session, validates asset not retired, inserts issue + updates asset status + logs history
- Search, status filter, and category filter across all cards

---

## Landing Page Sections

| # | Section | Description |
|---|---------|-------------|
| 1 | **Hero** | Gradient headline, tag banner, CTA buttons, interactive 3D hover card preview |
| 2 | **Trusted By** | Logo strip with SVG brand icons of fictional organisations |
| 3 | **Features Grid** | 9 premium feature cards with icons and descriptions |
| 4 | **Workflow Timeline** | 8-step animated progress pipeline from Register to History |
| 5 | **Dashboard Showcase** | Interactive browser mockup with 3 tabbed views (Assets, Issues, Analytics) |
| 6 | **Stats Counter** | Scroll-triggered animated count-up metrics |
| 7 | **Why MaintainIQ** | Split comparison (spreadsheets vs. MaintainIQ) plus benefit cards |
| 8 | **Testimonials** | 3 customer quotes with star ratings and gradient avatars |
| 9 | **CTA** | Final call-to-action with Get Started / Book Demo buttons |
| 10 | **Footer** | Multi-column footer with social links, feature links, and company info |

---

## Key Design Decisions

- **Zero build step** — pure HTML / CSS / JS with ES modules. No bundlers, transpilers, or framework tooling. Works with any static HTTP server.
- **Technician auth bypasses Supabase Auth** — technicians log in via the `technicians` table (email + plain-text password) to avoid per-user Auth costs. Admin and regular users use standard Supabase Auth.
- **Status state machine is client-enforced** — business logic for allowed transitions and side effects lives in JavaScript; the database stores state without constraint rules.
- **Denormalised `history_log.asset_name`** — asset name is stored at event time so historical accuracy is preserved even if the asset is later renamed.
- **CSS Custom Properties for theming** — every colour is driven by CSS variables swapped via `data-theme="light"` on `<html>`. Dark/light mode is a single attribute toggle with zero JS re-rendering.
- **ES Modules throughout** — `import`/`export` syntax for clean dependency management without a bundler.

---

## Future Roadmap

- [ ] **Real-time subscriptions** — use Supabase Realtime for live dashboard updates on new issues and assignments
- [ ] **Email notifications** — notify technicians on assignment via Supabase Edge Functions or Resend
- [ ] **Role-based tech stats** — count of assigned / in-progress / resolved issues in the technician dashboard
- [ ] **Supabase Auth for technicians** — replace the plain-text password table with proper Auth user invites
- [ ] **Table pagination** — server-side pagination for large data sets (50+ records)
- [ ] **Batch QR printing** — generate and download QR codes as a printable label sheet
- [ ] **Public issue tracking** — allow anonymous users to view the status of their reported issue via a tracking link

---

## Project Origin

Built as the capstone project for **Batch 18 — Track B** (HTML, CSS, JS + Supabase). This is a fully functional maintenance management platform with role-based dashboards, QR code integration, analytics visualisation, and an append-only audit trail — all implemented with vanilla frontend technologies and Supabase as the backend.

---

<p align="center">
  Built with ❤️ for hackathon and portfolio.
</p>
