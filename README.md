# TalentFlow

TalentFlow is a full-stack recruitment and CV management platform. It connects recruiters, candidates, and administrators through a unified interface for managing job positions, candidate profiles, attributes, and real-time discussions.

## Features

- **Authentication & Authorization**
  - Email / password login and registration
  - Social login via Google and GitHub (OAuth 2.0)
  - Role-based access control: `admin`, `recruiter`, `candidate`
  - JWT-based session management with auto-refresh

- **Position Management**
  - Create, edit, duplicate, and publish job positions
  - Filter and sort by level, visibility, and text search
  - Visibility controls: public, private, hidden, archived, blocked
  - Attach required attributes/skills to positions

- **CV / Résumé Management**
  - Candidates build and publish CVs with markdown support
  - Recruiters and admins can view, search, and like CVs
  - Real-time discussion threads on positions and CVs
  - PDF export and QR code generation
  - Portfolio/project timeline with markdown descriptions

- **Attribute Library**
  - Centralized catalog of technologies, skills, and professional attributes
  - Category-based organization (frontend, backend, databases, DevOps, etc.)
  - Attribute usage tracking across positions and CVs

- **User Management (Admin)**
  - User list with role assignment and status management
  - Block / unblock users
  - Last-login tracking and profile oversight

- **Search & Discovery**
  - Global search across positions and CVs
  - Technology tag cloud on the home dashboard
  - Debounced search with URL-based routing

- **Real-Time Features**
  - Socket.io-powered discussion panels
  - Live messaging on positions and CVs

- **UI / UX**
  - Responsive layout with collapsible mobile navigation
  - Dark and light theme toggle
  - Internationalization: English and Russian
  - Skeleton loading states and toast notifications
  - Accessible focus styles and keyboard navigation

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| React Router 7 | Client-side routing |
| React Bootstrap 2 | Component library |
| Bootstrap 5 | Layout and styling |
| i18next / react-i18next | Internationalization |
| Axios | HTTP client |
| Socket.io Client | Real-time communication |
| React Markdown | Rich text rendering |
| React Select | Advanced select inputs |
| React Hot Toast | Notifications |
| date-fns | Date formatting |
| jspdf / qrcode | PDF and QR generation |

### Backend
| Technology | Purpose |
|------------|---------|
| Express 5 | REST API server |
| Sequelize 6 | ORM |
| SQLite / MySQL | Database (SQLite for local dev, MySQL for production) |
| Socket.io | WebSocket server |
| Passport.js | OAuth authentication |
| JWT | Token-based auth |
| Multer + Cloudinary | Image uploads |
| bcrypt | Password hashing |
| express-session | Session management |
| EmailJS | Email verification |

## Prerequisites

- Node.js >= 18
- npm >= 9
- MySQL (optional; falls back to SQLite for local development)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd testing

# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

## Configuration

Create a `.env` file in the root and a `server/.env` file. See `.env.example` for all available variables.

### Root `.env`
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_CLIENT_URL=http://localhost:3000
```

### `server/.env`
```env
PORT=5000
JWT_SECRET=your-jwt-secret
CLIENT_URL=http://localhost:3000

# Database (optional for local dev)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=cvdb

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://final-dhkq.onrender.comauth/google/callback
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://final-dhkq.onrender.comauth/github/callback

# Salesforce CRM integration (optional)
# Create a Connected App in a Salesforce Developer Org with OAuth scope "api" and
# enable the Username-Password OAuth flow. Use https://login.salesforce.com for
# production orgs, or https://test.salesforce.com for sandboxes.
#
# IMPORTANT: SF_PASSWORD_SECURITY_TOKEN must be the user's actual password
# concatenated with their Salesforce security token (e.g. MyPasswordMySecurityToken).
# If you do not have a security token, reset it from Salesforce Setup → My Personal
# Information → Reset My Security Token.
SF_CLIENT_ID=
SF_CLIENT_SECRET=
SF_USERNAME=
SF_PASSWORD_SECURITY_TOKEN=
SF_LOGIN_URL=https://login.salesforce.com

# Salesforce JWT Bearer Flow (recommended)
# Generate an RSA key pair locally, upload the public key to Salesforce, and paste the private key below.
# 
# Windows (PowerShell):
#   openssl genrsa -out private.pem 2048
#   openssl rsa -in private.pem -pubout -out public.pem
#
# Then in Salesforce Setup → Certificate and Key Management → Create Self-Signed Certificate,
# upload public.pem as the certificate. Paste the contents of private.pem into SF_JWT_CERT.
SF_JWT_ISSUER=
SF_JWT_SUBJECT=
SF_JWT_CERT=

# Email (optional)
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=
```

> **Note:** If no database credentials are provided, the server automatically falls back to an in-memory SQLite database, which is ideal for local development and testing.

## Running the Application

```bash
# Start the backend server (from the root)
npm run server

# In a separate terminal, start the frontend dev server
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start React dev server (port 3000) |
| `npm run server` | Start Express server (port 5000) |
| `npm run server:dev` | Start Express server with nodemon |
| `npm run server:seed` | Seed the database with demo data |
| `npm run build` | Build the frontend for production |
| `npm test` | Run tests |

## Project Structure

```
testing/
├── src/                            # Frontend (React)
│   ├── api/
│   │   └── client.js               # Axios instance with auth interceptor, token refresh, and error handling
│   ├── components/
│   │   ├── common/                 # Reusable UI components
│   │   │   ├── AttributeFields.js  # Dynamic form fields for attributes (text, number, select, etc.)
│   │   │   ├── ConfirmDialog.js    # Generic confirmation modal for destructive actions
│   │   │   ├── DataTable.js        # Reusable data table with sorting, pagination, search, and selection
│   │   │   ├── EmptyState.js       # Empty state placeholder with icon, title, and hint
│   │   │   ├── HeartLike.js        # Like/heart button component with count
│   │   │   ├── LoadingSkeleton.js  # Skeleton loading placeholder
│   │   │   ├── ProjectCard.js      # Editable project card with drag-and-drop reordering
│   │   │   ├── SaveIndicator.js    # Auto-save status indicator (saving/saved/conflict)
│   │   │   ├── TechTag.js          # Colored technology tag/badge
│   │   │   └── TechTagInput.js     # Searchable multi-select input for technologies
│   │   └── discussions/
│   │       └── DiscussionPanel.js  # Real-time discussion/chat panel using Socket.io
│   ├── components/layout/
│   │   └── AppNavbar.js            # Main navigation bar with search, theme toggle, language switch, and mobile menu
│   ├── contexts/
│   │   ├── AuthContext.js           # Authentication state: login, register, logout, token refresh, role checks
│   │   └── PreferencesContext.js   # Theme (dark/light) and language (en/ru) preferences with persistence
│   ├── hooks/
│   │   └── useAutoSave.js          # Debounced auto-save hook with conflict detection and status tracking
│   ├── i18n/
│   │   ├── index.js                 # i18next initialization and language detection
│   │   ├── en.json                  # English translations
│   │   └── ru.json                  # Russian translations
│   ├── pages/
│   │   ├── HomePage.js             # Dashboard with stats cards, recent activity, and technology tag cloud
│   │   ├── PositionsPage.js        # Position list with search, filters (level, visibility), sort, and pagination
│   │   ├── PositionDetailPage.js   # Position details, requirements, and real-time discussion
│   │   ├── PositionEditPage.js     # Create/edit position with attributes and required technologies
│   │   ├── UsersPage.js            # Admin user management: list, search, filter, role assignment, block/unblock
│   │   ├── CVPage.js               # Candidate CV view with markdown, projects, likes, and discussion
│   │   ├── ProfilePage.js          # User profile editor: personal info, attributes, skills, projects, CVs, password change
│   │   ├── AttributesPage.js       # Attribute library with search, filters, usage stats, and CRUD
│   │   ├── LoginPage.js            # Email/password login with social OAuth buttons and email confirmation alerts
│   │   ├── RegisterPage.js         # Registration form with email confirmation flow
│   │   ├── OAuthCallbackPage.js    # OAuth callback handler for Google/GitHub login redirects
│   │   └── SearchResultsPage.js    # Global search results across positions, CVs, and users
│   ├── App.css                     # Global component styles, responsive breakpoints, theme variables
│   ├── App.js                      # Route definitions, layout wrapper, theme provider, i18n setup
│   ├── index.css                   # CSS custom properties (design tokens), base/reset styles
│   └── index.js                    # React entry point, renders App into DOM
├── server/                          # Backend (Express + Sequelize)
│   ├── config/
│   │   └── database.js              # Sequelize configuration: dialect, connection pool, SSL options, model sync
│   ├── middleware/
│   │   └── auth.js                  # JWT verification middleware, role-based access control, token signing
│   ├── models/                      # Sequelize ORM models
│   │   ├── index.js                 # Model registry, associations between models
│   │   ├── User.js                  # User entity: email, password, roles, preferences, skills, timestamps
│   │   ├── Position.js              # Job position entity: title, company, level, visibility, requirements
│   │   ├── CV.js                    # Curriculum Vitae entity: status, content, summary, relation to user/position
│   │   ├── CVLike.js                # Like entity linking a recruiter to a CV
│   │   ├── DiscussionMessage.js     # Discussion message entity for positions and CVs
│   │   ├── Attribute.js             # Attribute catalog entity: name, category, type, options
│   │   ├── UserAttribute.js         # Junction table linking users to attributes with values
│   │   ├── Project.js               # Project entity for candidate portfolios
│   │   ├── RecentAttribute.js       # Tracks recently used attributes per user
│   │   └── PasswordReset.js         # Password reset token entity with expiry and usage tracking
│   ├── routes/                      # Express route handlers
│   │   ├── auth.js                  # Registration, login, OAuth (Google/GitHub), email confirmation, password change
│   │   ├── users.js                 # User CRUD, profile updates, role management, bulk block/unblock
│   │   ├── positions.js             # Position CRUD, filtering, sorting, attribute assignment
│   │   ├── cvs.js                   # CV CRUD, publish/unpublish, bulk operations
│   │   ├── attributes.js            # Attribute library CRUD, categories, technologies, usage stats
│   │   ├── projects.js              # Project CRUD and reordering
│   │   ├── stats.js                 # Dashboard statistics: counts, recent activity, likes
│   │   └── upload.js                # Image upload endpoint (handles multipart/form-data)
│   ├── services/                    # Business logic helpers
│   │   ├── accessRules.js           # Query filtering and access control logic for positions/CVs
│   │   ├── cvGenerator.js           # Generates CV data structure from user profile and attributes
│   │   ├── queryHelpers.js          # Sequelize query utilities: full-text search, sorting, pagination
│   │   └── email.js                 # EmailJS integration for sending confirmation emails
│   ├── socket.js                    # Socket.io setup: connection handling, real-time discussion events
│   ├── server.js                    # Express app entry: middleware, CORS, routes, database sync, server startup
│   ├── seed.js                      # Database seeding script (creates demo users, positions, attributes)
│   ├── seedMock.js                  # Extended seeding with mock data (extra users, positions, projects)
│   ├── reset-passwords.js           # Dev utility to bulk reset passwords for all users
│   ├── uploads/                     # Local image upload storage
│   ├── data/                        # Local SQLite database file (dev only)
│   └── .env                         # Server environment variables (gitignored)
├── .env.example                      # Example environment configuration
├── .gitignore                        # Git ignore rules
├── .npmrc                            # npm config (legacy-peer-deps for Vercel builds)
├── package.json                      # Root package.json with frontend scripts
├── README.md                         # Project documentation
└── server/
    └── package.json                  # Server dependencies and scripts
```

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **admin** | Full access: manage users, positions, attributes, view all CVs, edit any profile/CV |
| **recruiter** | Manage positions, view CVs, like CVs, create/edit own profile |
| **candidate** | Manage own profile, create and publish CVs |

## License

ISC

---

# Odoo Integration

This project includes an **Odoo 18 module** (`odoo_position_integration`) that acts as a read-only viewer for position aggregated results. Odoo uses its own PostgreSQL database (separate from this project's MySQL).

## Architecture

```
┌─────────────────────────────┐       HTTP API (Bearer token)       ┌────────────────────┐
│  CV Management System        │  ←→  GET /api/external/aggregations  │  Odoo 18            │
│  (React + Express + MySQL)   │        ?token=XXXX                    │  (Docker+PostgreSQL)│
│                              │                                        │                    │
│  • MySQL database (Aiven)    │                                        │  • Imports data    │
│  • Positions/CVs/Attributes  │                                        │  • Read-only views │
│  • API tokens (per position) │                                        │  • List/Form views │
│  • JWT auth                  │                                        │                    │
└─────────────────────────────┘                                        └────────────────────┘
```

## Prerequisites

- Docker installed locally
- External API deployed to `https://final-dhkq.onrender.com` (or self-host at localhost:5000)
- Position created in the CV Management System with candidate applications

## Quick Start

1. Start your backend (MySQL) server on `localhost:5000` or use the deployed version
2. Start Odoo:
   ```bash
   docker-compose up -d
   ```
3. Wait 30-60 seconds for first initialization (modules auto-install)
4. Access Odoo at `http://localhost:8069/web/login` (admin / admin)

## Integration Flow

### Step 1: Generate API Token
1. Log into the CV Management System as recruiter/admin
2. Open a position page (e.g., `https://final-lemon-six-63.vercel.app/positions/1`)
3. Click **"Get API token"** button
4. Copy the token from the modal

### Step 2: Import into Odoo
1. Open Odoo: `http://localhost:8069`
2. Navigate to **Position Integration** → **Import from API**
3. Enter:
   - **API URL:** `https://final-dhkq.onrender.com/api/external/aggregations` (or localhost URL)
   - **API Token:** (paste the token from Step 1)
4. Click **Import**

### Step 3: View Imported Data
- **Positions** menu: List of all imported positions with stats
- **Attributes** menu: All attributes across positions
- **Aggregated Results** menu: Individual metric rows
- Open any position record to see its attributes inline

### Step 4: Re-import
1. Open a position record in Odoo
2. Click **"Re-import"** button in the header
3. The wizard opens with the API token pre-filled
4. Click **Import** to update data (old attributes/results are replaced)

## Odoo Module Structure

```
odoo_addons/odoo_position_integration/
├── __manifest__.py         # Module metadata
├── __init__.py
├── models/
│   ├── position.py          # Position model (title, external_id, stats)
│   ├── attribute.py         # Attribute model (title, type, aggregation)
│   └── aggregated_result.py # Result model (metric, value, count)
├── wizard/
│   └── import_wizard.py     # Import from external API by token
├── views/                   # List/form/search views
├── security/                # Access control rules
└── __pycache__/
```

## API Endpoints

### Generate API Token (JWT auth required)
```
POST /api/tokens
Authorization: Bearer <jwt>
Body: { "positionId": 1, "name": "Odoo Import" }
Response: { "token": "a1b2c3...", "id": 1, "positionId": 1 }
```

### Fetch Aggregated Results (API token only, no JWT)
```
GET /api/external/aggregations?token=XXXX
or
GET /api/external/aggregations
Authorization: Bearer <api_token>
```

Response format:
```json
{
  "position": {
    "id": 1,
    "title": "Frontend Developer",
    "company": "...",
    "level": "senior",
    "visibility": "public",
    "shortDescription": "..."
  },
  "stats": {
    "candidateCount": 3,
    "cvCount": 5,
    "totalLikes": 12
  },
  "attributes": [
    {
      "attributeId": 2,
      "title": "Experience",
      "type": "number",
      "category": "Technical",
      "aggregation": {
        "avg": 3.7,
        "min": 1,
        "max": 8,
        "popular": [{"value": 5, "count": 2}]
      }
    }
  ],
  "generatedAt": "2026-08-05T10:00:00.000Z"
}
```

## Deployment Without Docker

**Important:** Odoo requires PostgreSQL — it cannot use MySQL.

1. Install PostgreSQL 16 locally
2. Install Python 3.12 and Odoo dependencies
3. Clone Odoo 18 source and configure `odoo.conf`
4. See `ODOO_DEPLOYMENT.md` for full instructions

See `ODOO_DEPLOYMENT.md` for detailed non-Docker deployment steps.

## Security Model

- API tokens are generated via `crypto.randomBytes(32)` (64 hex chars)
- Tokens are SHA-256 hashed before storage (raw token never stored)
- Each token is tied to a specific position — no cross-position access
- OAuth module (admin/recruiter roles required to generate tokens)
- Tokens can be revoked via DELETE `/api/tokens/:id`
- Odoo access control: read/create/update for authenticated users, no delete

