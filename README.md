# TalentFlow

TalentFlow is a full-stack recruitment and CV management platform. It connects recruiters, candidates, and administrators through a unified interface for managing job positions, candidate profiles, attributes, and real-time discussions.

## Live Deployment

- **Frontend:** https://final-lemon-six-63.vercel.app/
- **Backend API:** https://final-dhkq.onrender.com
- **Repository:** https://github.com/Phoenix2816/final.git

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
git clone https://github.com/Phoenix2816/final.git
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
# The backend supports JWT Bearer Flow and Client Credentials Flow.
# For JWT: set SF_JWT_ISSUER, SF_JWT_SUBJECT, and SF_JWT_CERT (private key).
# For Client Credentials: set SF_CLIENT_ID and SF_CLIENT_SECRET.
SF_LOGIN_URL=https://login.salesforce.com

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

## Deployment

### Frontend (Vercel)

1. Push this repository to GitHub: https://github.com/Phoenix2816/final.git
2. Import the repository in Vercel
3. Set the framework preset to **React**
4. Add environment variable:
   - `REACT_APP_API_URL=https://final-dhkq.onrender.com`
5. Deploy

### Backend (Render)

1. Create a new **Web Service** in Render
2. Connect the GitHub repository `Phoenix2816/final`
3. Set the root directory to `server`
4. Set the build command to `npm install`
5. Set the start command to `node server.js`
6. Add environment variables from `server/.env`:
   - Database credentials
   - OAuth credentials
   - Salesforce CRM credentials (optional)
   - EmailJS credentials (optional)
7. Deploy

## Project Structure

```
testing/
├── src/                            # Frontend (React)
│   ├── api/
│   │   └── client.js               # Axios instance with auth interceptor, token refresh, and error handling
│   ├── components/
│   │   ├── common/                 # Reusable UI components
│   │   │   ├── AttributeFields.js  # Dynamic form fields for attributes
│   │   │   ├── ConfirmDialog.js    # Generic confirmation modal
│   │   │   ├── DataTable.js        # Reusable data table
│   │   │   ├── EmptyState.js       # Empty state placeholder
│   │   │   ├── HeartLike.js        # Like/heart button
│   │   │   ├── LoadingSkeleton.js  # Skeleton loading placeholder
│   │   │   ├── ProjectCard.js      # Editable project card
│   │   │   ├── SaveIndicator.js    # Auto-save status indicator
│   │   │   ├── TechTag.js          # Colored technology tag/badge
│   │   │   └── TechTagInput.js     # Searchable multi-select input
│   │   └── discussions/
│   │       └── DiscussionPanel.js  # Real-time discussion/chat panel
│   ├── components/layout/
│   │   └── AppNavbar.js            # Main navigation bar
│   ├── contexts/
│   │   ├── AuthContext.js           # Authentication state
│   │   └── PreferencesContext.js   # Theme and language preferences
│   ├── hooks/
│   │   └── useAutoSave.js          # Debounced auto-save hook
│   ├── i18n/
│   │   ├── index.js                 # i18next initialization
│   │   ├── en.json                  # English translations
│   │   └── ru.json                  # Russian translations
│   ├── pages/
│   │   ├── HomePage.js             # Dashboard with stats
│   │   ├── PositionsPage.js        # Position list with search/filter
│   │   ├── PositionDetailPage.js   # Position details + discussion
│   │   ├── PositionEditPage.js     # Create/edit position
│   │   ├── UsersPage.js            # Admin user management
│   │   ├── CVPage.js               # Candidate CV view
│   │   ├── ProfilePage.js          # User profile editor + CRM sync
│   │   ├── AttributesPage.js       # Attribute library CRUD
│   │   ├── LoginPage.js            # Email/password + OAuth login
│   │   ├── RegisterPage.js         # Registration with email confirmation
│   │   ├── OAuthCallbackPage.js    # OAuth callback handler
│   │   └── SearchResultsPage.js    # Global search results
│   ├── App.css                     # Global component styles
│   ├── App.js                      # Route definitions and layout
│   ├── index.css                   # CSS custom properties and base styles
│   └── index.js                    # React entry point
├── server/                          # Backend (Express + Sequelize)
│   ├── config/
│   │   └── database.js              # Sequelize configuration
│   ├── middleware/
│   │   └── auth.js                  # JWT verification and RBAC
│   ├── models/                      # Sequelize ORM models
│   ├── routes/                      # Express route handlers
│   ├── services/                    # Business logic helpers
│   ├── socket.js                    # Socket.io setup
│   ├── server.js                    # Express app entry point
│   ├── seed.js                      # Database seeding script
│   └── .env                         # Server environment variables
├── .env.example                      # Example environment configuration
├── .gitignore                        # Git ignore rules
├── package.json                      # Root package.json
├── README.md                         # Project documentation
└── server/
    └── package.json                  # Server dependencies
```

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| **admin** | Full access: manage users, positions, attributes, view all CVs, edit any profile/CV |
| **recruiter** | Manage positions, view CVs, like CVs, create/edit own profile |
| **candidate** | Manage own profile, create and publish CVs |

## Salesforce CRM Sync

The `/profile` page includes a CRM Sync feature that creates Account and Contact records in Salesforce via the REST API.

**Current status:** The backend supports JWT Bearer Flow and Client Credentials Flow. In some restricted Salesforce orgs (e.g., OrgFarm), server-to-server OAuth flows may be blocked by org policy. The app gracefully handles this by showing a clear error message instead of failing silently.

To enable CRM sync:
1. Create a Connected App in your Salesforce org
2. Enable OAuth with `api` and `refresh_token` scopes
3. Enable JWT Bearer Flow or Client Credentials Flow
4. Configure the corresponding environment variables in your deployment

## License

ISC
