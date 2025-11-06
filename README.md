# Gentle Tools Dashboard

A real-time inventory management system for iPhone inventory, integrated with Google Sheets, featuring advanced reconciliation tools and multi-user shipped IMEI tracking.

![Dashboard Preview](./attached_assets/dashboard-preview.png)

## Features

- **Real-time Google Sheets Integration** - Live sync with inventory data
- **Multi-Tab Interface** - Quick Insights, Physical Inventory, Reconciled Inventory, Shipped Items
- **INV MATCH Tool** - Remote scanning and reconciliation with live comparison
- **Advanced Filtering** - Filter by grade, model, storage, color, lock status
- **Drill-Down Analysis** - Hierarchical view: Model → GB → Color → Individual Devices
- **Export Capabilities** - CSV download and clipboard copy at any level
- **Shipped IMEI Tracking** - Persistent storage with automatic inventory adjustment
- **Grade-Based Analytics** - Quick insights and breakdown by device grade
- **Responsive Design** - Works on desktop, tablet, and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **TanStack Query** for server state management
- **Wouter** for routing
- **shadcn/ui** component library
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Google Sheets API** for inventory data
- **PostgreSQL** with Drizzle ORM for shipped IMEIs
- **In-memory fallback** for development without database

### Infrastructure
- **Railway** for hosting and deployment
- **Nixpacks** for build configuration
- **Environment-based configuration**

## Project Structure

```
gentle-tools-dashboard/
├── client/                      # Frontend React application
│   └── src/
│       ├── components/          # React components
│       │   ├── ui/             # shadcn/ui components
│       │   ├── Dashboard.tsx   # Main dashboard component
│       │   ├── DashboardStats.tsx
│       │   ├── ExpandableGradeSection.tsx
│       │   ├── PivotView.tsx
│       │   ├── InvMatchDialog.tsx
│       │   ├── ShippedIMEIsManager.tsx
│       │   ├── ExportButtons.tsx
│       │   ├── InventoryFilters.tsx
│       │   └── ...
│       ├── lib/                # Utility functions
│       │   ├── exportUtils.ts
│       │   ├── modelSorting.ts
│       │   └── queryClient.ts
│       ├── pages/              # Page components
│       │   └── Dashboard.tsx
│       ├── App.tsx
│       └── main.tsx
├── server/                      # Backend Express application
│   ├── db/                     # Database schema
│   │   └── schema.ts
│   ├── lib/                    # Server utilities
│   │   └── googleSheets.ts
│   ├── routes.ts               # API routes
│   ├── storage.ts              # Data storage utilities
│   ├── index.ts                # Server entry point
│   └── db.ts                   # Database connection
├── shared/                      # Shared types and schemas
│   └── schema.ts
├── tests/                       # Playwright E2E tests
├── SOP-USER-GUIDE.md           # User guide and SOPs
├── TECHNICAL-ARCHITECTURE.md   # Technical documentation
├── railway.json                # Railway deployment config
├── nixpacks.toml              # Nixpacks build config
└── package.json

```

## Installation

### Prerequisites

- **Node.js** 18+
- **npm** or **pnpm**
- **Google Cloud Project** with Sheets API enabled
- **PostgreSQL database** (optional for shipped IMEIs persistence)

### Setup

1. **Clone the repository:**
```bash
git clone git@github.com:brandon687/gentle-tools-dashboard.git
cd gentle-tools-dashboard
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Configure environment variables in `.env`:**
```env
# Required
GOOGLE_API_KEY=your_google_api_key_here

# Optional (for persistent shipped IMEIs storage)
DATABASE_URL=postgresql://user:password@host:port/database

# Development
NODE_ENV=development
```

### Getting a Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Restrict the key to **Google Sheets API** only (recommended)
6. Copy the API key to your `.env` file

### Configure Google Sheets

The dashboard expects a specific Google Sheets structure:

**Sheet ID:** `1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw`
**Sheet Name:** `PHYSICAL INVENTORY`

**Expected Format:**
```
Row 1: Banner (ignored)
Row 2: Headers
  _ROW | _FIVETRAN_SYNCED | DATE | PRICE | COLOR | GRADE | IMEI | MODEL | GB | LOCK_STATUS | AGE
Row 3+: Data rows
```

**Required Columns:**
- `IMEI` - Device IMEI (15 digits)
- `MODEL` - iPhone model (e.g., "iPhone 14 Pro Max")
- `GB` - Storage capacity (e.g., "256GB")
- `COLOR` - Device color (e.g., "Space Black")
- `GRADE` - Device grade (e.g., "A", "AB", "B")
- `LOCK_STATUS` - "UNLOCKED" or "LOCKED"

## Development

### Run development server:
```bash
npm run dev
```

This starts:
- Frontend dev server on `http://localhost:5173`
- Backend API server on `http://localhost:3000`

### Build for production:
```bash
npm run build
```

### Run production build locally:
```bash
npm run start
```

### Run tests:
```bash
npm run test
```

## API Endpoints

### GET `/api/inventory`
Fetches inventory data from Google Sheets.

**Response:**
```json
{
  "physicalInventory": [
    {
      "imei": "355555754760571",
      "model": "iPhone 14 Pro Max",
      "gb": "256GB",
      "color": "Space Black",
      "grade": "A",
      "lockStatus": "UNLOCKED",
      "date": "2024-01-15",
      "age": "90 days"
    }
  ],
  "gradedToFallout": []
}
```

### GET `/api/shipped-imeis`
Gets list of all shipped IMEIs.

**Response:**
```json
[
  "355555754760571",
  "354155251896506",
  "352803728976318"
]
```

### POST `/api/shipped-imeis`
Adds IMEIs to the shipped list (bulk operation).

**Request Body:**
```json
{
  "imeis": [
    "355555754760571",
    "354155251896506"
  ]
}
```

**Response:**
```json
[
  "355555754760571",
  "354155251896506",
  "352803728976318"
]
```

### DELETE `/api/shipped-imeis`
Clears all shipped IMEIs.

**Response:**
```json
{
  "success": true
}
```

### DELETE `/api/shipped-imeis/:imei`
Removes a specific IMEI from shipped list.

**Response:**
```json
{
  "success": true
}
```

## Database Schema

### `shipped_imeis` Table

```sql
CREATE TABLE shipped_imeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imei TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Indexes:**
- Primary key on `id`
- Unique constraint on `imei`

## Deployment

### Deploy to Railway

1. **Connect GitHub repository:**
   - Go to [Railway](https://railway.app)
   - Create new project
   - Connect to GitHub repository

2. **Configure environment variables:**
   ```
   GOOGLE_API_KEY=your_api_key
   DATABASE_URL=postgresql://...
   NODE_ENV=production
   ```

3. **Configure build settings:**
   Railway automatically detects `railway.json` and `nixpacks.toml`

4. **Deploy:**
   - Push to `main` branch
   - Railway auto-deploys on push

### Manual Deployment

1. **Build:**
```bash
npm run build
```

2. **Set environment variables:**
```bash
export GOOGLE_API_KEY=your_api_key
export DATABASE_URL=your_database_url
export NODE_ENV=production
```

3. **Start server:**
```bash
npm run start
```

Server runs on port specified by `PORT` environment variable (default: 3000)

## Configuration Files

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ['nodejs_24']

[phases.install]
cmds = ['npm install']

[start]
cmd = 'npm run start'
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes | - | Google Sheets API key |
| `DATABASE_URL` | No | - | PostgreSQL connection string |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |

## Testing

### Run all tests:
```bash
npm run test
```

### Run specific test:
```bash
npx playwright test tests/dashboard.spec.ts
```

### Run tests in UI mode:
```bash
npx playwright test --ui
```

### Test coverage includes:
- Dashboard loading and rendering
- Tab navigation
- Filtering functionality
- Export operations
- INV MATCH tool
- Shipped IMEIs management
- Grade breakdown expansion
- Model sorting
- IMEI search

## Performance Considerations

### Frontend Optimization
- **React.memo** for expensive components
- **useMemo** for computed values
- **Lazy loading** for modals and dialogs
- **Virtual scrolling** for large lists (future enhancement)

### Backend Optimization
- **Query caching** with TanStack Query (5 min stale time)
- **Database indexing** on IMEI field
- **Bulk operations** for shipped IMEIs
- **In-memory fallback** for development

### Data Size Limits
- Tested with **10,000+ inventory items**
- Performance degrades with **20,000+ items**
- Recommended to archive old data in Google Sheets

## Troubleshooting

### Common Issues

#### "Error Loading Inventory"
**Cause:** Google API key invalid or quota exceeded
**Solution:**
1. Verify `GOOGLE_API_KEY` in environment variables
2. Check Google Cloud Console for API errors
3. Verify Sheets API is enabled
4. Check API quota limits

#### Shipped IMEIs Not Persisting
**Cause:** No database configured, using in-memory storage
**Solution:**
1. Set `DATABASE_URL` environment variable
2. Ensure PostgreSQL is accessible
3. Restart server to initialize database

#### Dashboard is Slow
**Cause:** Large inventory size
**Solution:**
1. Use filters to reduce displayed data
2. Archive old inventory data
3. Close expanded model cards when done
4. Consider pagination (future enhancement)

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |
| Mobile Safari | iOS 14+ | ✅ Fully Supported |
| Mobile Chrome | Android 10+ | ✅ Fully Supported |

## Security

### Best Practices Implemented
- ✅ Environment variables for sensitive data
- ✅ HTTPS only in production
- ✅ API key restrictions (Google Cloud)
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configuration
- ✅ Input validation with Zod schemas
- ✅ No sensitive data in logs

### Recommended Security Measures
- 🔒 Use strong database passwords
- 🔒 Restrict Google API key to specific IPs (production)
- 🔒 Enable 2FA for Google Cloud account
- 🔒 Regular security audits
- 🔒 Keep dependencies updated

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Run tests: `npm run test`
4. Push and create pull request
5. Wait for CI/CD checks
6. Request review from team
7. Merge after approval

### Commit Message Format
```
type(scope): subject

body

footer
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example:**
```
feat(inventory): Add grade filtering to pivot view

- Add grade filter tabs (All/A/AB)
- Update pivot view to respect grade filter
- Add tests for grade filtering

Closes #123
```

## License

This project is proprietary and confidential.

## Support

For questions, issues, or feature requests:
- **Technical Issues:** Create GitHub issue
- **Operational Questions:** See [SOP-USER-GUIDE.md](./SOP-USER-GUIDE.md)
- **Architecture Details:** See [TECHNICAL-ARCHITECTURE.md](./TECHNICAL-ARCHITECTURE.md)

## Changelog

### Version 1.1.0 (2025-11-05)
- ✨ Added dedicated Quick Insights tab
- ✨ Separated Physical and Reconciled insights
- 🎨 Improved UX by reducing information density in operational views
- 📝 Updated documentation

### Version 1.0.0 (2024-10-28)
- 🎉 Initial release
- ✅ Google Sheets integration
- ✅ Multi-tab dashboard
- ✅ INV MATCH tool
- ✅ Shipped IMEI tracking
- ✅ Export functionality
- ✅ Grade breakdown
- ✅ Responsive design

---

**Built with ❤️ for efficient inventory management**
