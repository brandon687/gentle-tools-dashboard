# Technical Architecture Documentation

## System Overview

Gentle Tools Dashboard is a full-stack TypeScript application providing real-time inventory management with Google Sheets integration. The system follows a client-server architecture with PostgreSQL for persistent data storage.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React SPA (Vite)                                     │  │
│  │  - TanStack Query (state management)                  │  │
│  │  - shadcn/ui (components)                            │  │
│  │  - Tailwind CSS (styling)                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express.js API                                       │  │
│  │  - TypeScript                                         │  │
│  │  - REST endpoints                                     │  │
│  │  - Google Sheets API client                          │  │
│  │  - Drizzle ORM                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
        │                                    │
        │ Google Sheets API                  │ PostgreSQL
        ▼                                    ▼
┌──────────────────┐              ┌──────────────────┐
│  Google Sheets   │              │   PostgreSQL     │
│  (Inventory Data)│              │ (Shipped IMEIs)  │
└──────────────────┘              └──────────────────┘
```

---

## Architecture Layers

### 1. Frontend Layer (Client)

#### Technology Stack
- **React 18.3** - UI framework
- **TypeScript 5.6** - Type safety
- **Vite 5.4** - Build tool and dev server
- **TanStack Query 5.56** - Server state management
- **Wouter 3.3** - Lightweight routing
- **Tailwind CSS 3.4** - Utility-first CSS
- **shadcn/ui** - Component library
- **Lucide React** - Icon library

#### Component Architecture

```
App
├── Router
│   └── Dashboard (Page)
│       ├── Header
│       ├── Tabs
│       │   ├── Quick Insights Tab
│       │   │   └── DashboardStats (2x)
│       │   ├── Physical Inventory Tab
│       │   │   ├── ExpandableGradeSection
│       │   │   ├── InventoryFilters
│       │   │   ├── ExportButtons
│       │   │   └── PivotView
│       │   ├── Reconciled Inventory Tab
│       │   │   ├── IMEI Search Bar
│       │   │   ├── ExpandableGradeSection
│       │   │   ├── InventoryFilters
│       │   │   └── PivotView
│       │   └── Shipped Items Tab
│       │       └── ShippedIMEIsManager
│       ├── ItemDetailSheet (Modal)
│       └── InvMatchDialog (Modal)
└── Toaster (Global)
```

#### Key Components

##### Dashboard (`client/src/pages/Dashboard.tsx`)
**Responsibility:** Main application container, orchestrates all tabs and state management

**State Management:**
```typescript
const [activeDataset, setActiveDataset] = useState<'insights' | 'physical' | 'reconciled' | 'shipped'>('insights');
const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
const [isSheetOpen, setIsSheetOpen] = useState(false);
const [isInvMatchOpen, setIsInvMatchOpen] = useState(false);
const [filterGrade, setFilterGrade] = useState("");
const [filterModel, setFilterModel] = useState("");
const [filterGB, setFilterGB] = useState("");
const [filterColor, setFilterColor] = useState("");
const [filterLockStatus, setFilterLockStatus] = useState("");
const [searchIMEI, setSearchIMEI] = useState("");
```

**Data Queries:**
```typescript
const { data: shippedIMEIs } = useQuery<string[]>({
  queryKey: ['/api/shipped-imeis'],
  refetchOnWindowFocus: true,
  staleTime: 0
});

const { data: inventoryData } = useQuery<InventoryDataResponse>({
  queryKey: ['/api/inventory'],
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000
});
```

**Computed Data:**
```typescript
const currentItems = useMemo(() => {
  if (activeDataset === 'physical') {
    return inventoryData.physicalInventory.filter(
      item => !shippedSet.has(item.imei)
    );
  }
  if (activeDataset === 'reconciled') {
    return inventoryData.physicalInventory.filter(
      item => shippedSet.has(item.imei)
    );
  }
  return [];
}, [inventoryData, activeDataset, shippedIMEIs]);

const filteredItems = useMemo(() => {
  // Apply all filters (grade, model, gb, color, lockStatus, searchIMEI)
  return currentItems.filter(/* filter logic */);
}, [currentItems, filters]);
```

##### DashboardStats (`client/src/components/DashboardStats.tsx`)
**Responsibility:** Compute and display high-level inventory metrics

**Computed Metrics:**
```typescript
{
  totalDevices: number;
  topGrade: [string, number];        // [grade, count]
  topModel: [string, number];        // [model, count]
  topSKU: [string, { count, model, gb, color }];
  unlockedCount: number;
  uniqueModels: number;
}
```

**Performance Optimization:**
- Memoized with `React.memo`
- Uses `useMemo` for expensive calculations
- Processes data in single pass

##### PivotView (`client/src/components/PivotView.tsx`)
**Responsibility:** Hierarchical drill-down view of inventory

**Data Structure:**
```typescript
interface ModelData {
  model: string;
  totalDevices: number;
  items: InventoryItem[];
  gbGroups: { [gb: string]: GBData };
}

interface GBData {
  gb: string;
  totalDevices: number;
  items: InventoryItem[];
  colorGroups: { [color: string]: ColorData };
}

interface ColorData {
  color: string;
  totalDevices: number;
  items: InventoryItem[];
}
```

**Sorting Logic:**
- **Release Order**: Custom hierarchy based on iPhone release dates
- **Quantity**: Sorted by device count (descending)

**Grade Filtering:**
- Normalizes grade strings (handles "A", "A GRADE", variations)
- Filters at data level before grouping

**Expansion State:**
```typescript
const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
const [expandedGB, setExpandedGB] = useState<Set<string>>(new Set());
const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
```

**Performance:**
- Memoized grouping (rebuilds only when items change)
- Separate memoized sorting (cheap operation)
- Lock status sorting within groups (UNLOCKED first)

##### InvMatchDialog (`client/src/components/InvMatchDialog.tsx`)
**Responsibility:** Remote scanning and inventory reconciliation

**State Management:**
```typescript
const [selectedGrade, setSelectedGrade] = useState<string>("");
const [selectedModel, setSelectedModel] = useState<string>("");
const [selectedGB, setSelectedGB] = useState<string>("");
const [selectedColor, setSelectedColor] = useState<string>("");
const [selectedLockStatus, setSelectedLockStatus] = useState<string>("");
const [pastedIMEIs, setPastedIMEIs] = useState("");
const [copiedSection, setCopiedSection] = useState<string | null>(null);
const [showSaveDialog, setShowSaveDialog] = useState(false);
const [operatorName, setOperatorName] = useState("");
```

**Reconciliation Algorithm:**
```typescript
// 1. Parse scanned IMEIs
const parsedIMEIs = pastedIMEIs.split('\n').map(trim).filter(Boolean);

// 2. Create filtered inventory set
const filteredIMEISet = new Set(
  filteredInventory.map(item => item.imei?.trim()).filter(Boolean)
);

// 3. Create master inventory map
const masterInventoryMap = new Map<string, InventoryItem>();
items.forEach(item => {
  if (item.imei) masterInventoryMap.set(item.imei.trim(), item);
});

// 4. Categorize each scanned IMEI
parsedIMEIs.forEach(imei => {
  if (filteredIMEISet.has(imei)) {
    // MATCHED: In filtered inventory
    matched++;
  } else {
    const masterItem = masterInventoryMap.get(imei);
    if (masterItem) {
      // WRONG MODEL: In inventory but doesn't match filters
      wrongModel.push({ imei, item: masterItem });
    } else {
      // NOT FOUND: Not in inventory at all
      notFound.push(imei);
    }
  }
});
```

**Worksheet Export:**
```typescript
{
  timestamp: string;
  operator: string;
  filters: { grade, model, gb, color, lockStatus };
  stats: { inventoryCount, scannedCount, matchedCount, wrongModelCount, notFoundCount };
  scannedIMEIs: string[];
  notFoundIMEIs: string[];
  wrongModelIMEIs: Array<{ imei, actualModel, actualGB, actualColor, actualGrade, actualLockStatus }>;
  matchedItems: InventoryItem[];
}
```

##### ShippedIMEIsManager (`client/src/components/ShippedIMEIsManager.tsx`)
**Responsibility:** CRUD operations for shipped IMEIs

**Mutations:**
```typescript
const addIMEIsMutation = useMutation({
  mutationFn: async (imeis: string[]) => {
    const res = await fetch('/api/shipped-imeis', {
      method: 'POST',
      body: JSON.stringify({ imeis })
    });
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/shipped-imeis'] });
  }
});

const clearAllMutation = useMutation({
  mutationFn: async () => {
    const res = await fetch('/api/shipped-imeis', { method: 'DELETE' });
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/shipped-imeis'] });
  }
});

const deleteIMEIMutation = useMutation({
  mutationFn: async (imei: string) => {
    const res = await fetch(`/api/shipped-imeis/${encodeURIComponent(imei)}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/shipped-imeis'] });
  }
});
```

#### State Management Strategy

**TanStack Query (React Query):**
- **Queries**: For GET requests (inventory, shipped IMEIs)
- **Mutations**: For POST/DELETE requests (shipped IMEIs management)
- **Cache invalidation**: Automatic refetch after mutations
- **Stale time**: 5 minutes for inventory, 0 for shipped IMEIs
- **Garbage collection time**: 10 minutes

**Local State:**
- **Filter states**: Managed in Dashboard component
- **UI states**: Modal open/close, expansion states
- **Transient states**: Copy feedback, loading indicators

**Derived State:**
- **Memoized computations**: filteredItems, groupedModels, stats
- **Prevents unnecessary re-renders**
- **Computed on-demand from queries**

---

### 2. Backend Layer (Server)

#### Technology Stack
- **Node.js 24** - Runtime
- **Express.js 4.21** - Web framework
- **TypeScript 5.6** - Type safety
- **Drizzle ORM 0.36** - Database ORM
- **Google APIs** - Google Sheets integration
- **tsx** - TypeScript execution

#### API Routes (`server/routes.ts`)

##### GET `/api/inventory`
**Purpose:** Fetch inventory data from Google Sheets

**Flow:**
```typescript
1. Receive request
2. Call fetchInventoryData() from googleSheets.ts
3. Google Sheets API call with API key
4. Parse response (skip row 1, headers in row 2, data from row 3)
5. Map columns to InventoryItem schema
6. Filter out items without IMEI
7. Return { physicalInventory, gradedToFallout }
```

**Error Handling:**
```typescript
try {
  const data = await fetchInventoryData();
  res.json(data);
} catch (error: any) {
  console.error('Error in /api/inventory:', error);
  res.status(500).json({
    error: 'Failed to fetch inventory data',
    message: error.message
  });
}
```

##### GET `/api/shipped-imeis`
**Purpose:** Retrieve list of shipped IMEIs

**Flow:**
```typescript
1. Check storage mode (database vs in-memory)
2. If in-memory: return inMemoryShippedIMEIs array
3. If database: SELECT * FROM shipped_imeis
4. Map database rows to string array
5. Return array of IMEIs
```

##### POST `/api/shipped-imeis`
**Purpose:** Add multiple IMEIs to shipped list

**Request Body:**
```typescript
{ imeis: string[] }
```

**Flow:**
```typescript
1. Validate request body (array of strings)
2. Trim all IMEIs
3. If in-memory:
   - Add to inMemoryShippedIMEIs array
   - Use Set to prevent duplicates
4. If database:
   - Start transaction
   - INSERT INTO shipped_imeis (imei) VALUES (...)
   - ON CONFLICT DO NOTHING (handles duplicates)
   - Commit transaction
5. Return updated list of all shipped IMEIs
```

**Database Transaction:**
```typescript
await db.transaction(async (tx) => {
  for (const value of values) {
    await tx.insert(shippedImeis)
      .values(value)
      .onConflictDoNothing();
  }
});
```

##### DELETE `/api/shipped-imeis`
**Purpose:** Clear all shipped IMEIs

**Flow:**
```typescript
1. Confirm operation (client-side confirmation required)
2. If in-memory: inMemoryShippedIMEIs = []
3. If database: DELETE FROM shipped_imeis
4. Return { success: true }
```

##### DELETE `/api/shipped-imeis/:imei`
**Purpose:** Remove specific IMEI from shipped list

**Flow:**
```typescript
1. Extract IMEI from URL parameter
2. If in-memory: filter out IMEI from array
3. If database: DELETE FROM shipped_imeis WHERE imei = ?
4. Return { success: true }
```

#### Google Sheets Integration (`server/lib/googleSheets.ts`)

**Configuration:**
```typescript
const SPREADSHEET_ID = '1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw';
const PHYSICAL_INVENTORY_SHEET = 'PHYSICAL INVENTORY';
const GRADED_TO_FALLOUT_SHEET = 'GRADED TO FALLOUT';
```

**Sheet Structure Assumptions:**
- Row 1: Banner/metadata (ignored)
- Row 2: Column headers
- Row 3+: Data rows
- Range: A:K (columns A through K)

**Data Fetching:**
```typescript
async function fetchSheetData(sheetName: string, apiKey: string) {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:K`
  });

  const rows = response.data.values;
  const headers = rows[1];
  const dataRows = rows.slice(2);

  // Create header map (case-insensitive)
  const headerMap = new Map<string, number>();
  headers.forEach((header, index) => {
    const normalized = header.toString().trim().toUpperCase();
    headerMap.set(normalized, index);
  });

  // Map rows to InventoryItem objects
  const items = dataRows.map(row => ({
    _row: getColumnValue(row, '_ROW'),
    _fivetran_synced: getColumnValue(row, '_FIVETRAN_SYNCED'),
    date: getColumnValue(row, 'DATE'),
    price: getColumnValue(row, 'PRICE'),
    color: getColumnValue(row, 'COLOR'),
    grade: getColumnValue(row, 'GRADE'),
    imei: getColumnValue(row, 'IMEI'),
    model: getColumnValue(row, 'MODEL'),
    gb: getColumnValue(row, 'GB'),
    lockStatus: getColumnValue(row, 'LOCK_STATUS'),
    age: getColumnValue(row, 'AGE')
  }));

  // Filter out items without IMEI
  return items.filter(item => item.imei);
}
```

**Error Handling:**
```typescript
try {
  return await fetchSheetData(sheetName, apiKey);
} catch (error: any) {
  console.error(`Error fetching ${sheetName}:`, error);
  throw new Error(`Failed to fetch ${sheetName}: ${error.message}`);
}
```

#### Database Layer (`server/db.ts`, `server/db/schema.ts`)

**Schema Definition:**
```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const shippedImeis = pgTable('shipped_imeis', {
  id: uuid('id').primaryKey().defaultRandom(),
  imei: text('imei').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

**Connection Management:**
```typescript
export let db: PostgresJsDatabase<typeof schema> | null = null;

if (process.env.DATABASE_URL) {
  const queryClient = postgres(process.env.DATABASE_URL);
  db = drizzle(queryClient, { schema });
} else {
  console.warn('⚠️  DATABASE_URL not set. Using in-memory storage.');
}
```

**Table Initialization:**
```typescript
async function ensureTableExists() {
  if (!db) {
    console.log('📦 Using in-memory storage (no database)');
    useInMemory = true;
    return;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shipped_imeis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        imei TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ shipped_imeis table ready');
  } catch (error) {
    console.warn('⚠️  Database table creation failed:', error);
    useInMemory = true;
  }
}
```

**In-Memory Fallback:**
```typescript
let inMemoryShippedIMEIs: string[] = [];
let useInMemory = false;

// All routes check useInMemory flag
if (useInMemory) {
  // Use inMemoryShippedIMEIs array
} else {
  // Use database queries
}
```

---

### 3. Data Layer

#### Google Sheets as Data Source

**Advantages:**
- ✅ Familiar interface for non-technical users
- ✅ Easy data entry and bulk updates
- ✅ Built-in collaboration features
- ✅ Version history and audit trail
- ✅ No database migration needed for inventory
- ✅ Accessible from anywhere

**Limitations:**
- ❌ Read-only access from dashboard
- ❌ API quota limits (100 requests/100 seconds)
- ❌ No real-time updates (requires refresh)
- ❌ Dependent on Google API availability

**Data Flow:**
```
Google Sheets
    ↓ (Google Sheets API)
Server API
    ↓ (REST)
TanStack Query Cache
    ↓
React Components
```

#### PostgreSQL for Shipped IMEIs

**Advantages:**
- ✅ Persistent storage (survives server restarts)
- ✅ ACID transactions
- ✅ Unique constraint on IMEI
- ✅ Fast queries with indexes
- ✅ Concurrent access support

**Schema Design:**
```sql
CREATE TABLE shipped_imeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imei TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index on IMEI (via UNIQUE constraint)
-- Index on created_at for time-based queries (future)
```

**Why Separate Database:**
- Shipped status is operational data (frequent updates)
- Needs persistence and transactional integrity
- Decouples from Google Sheets inventory source
- Enables audit trail with timestamps

---

## Data Flow Patterns

### 1. Initial Page Load

```
User opens dashboard
    ↓
React app loads
    ↓
TanStack Query triggers queries:
    - GET /api/inventory
    - GET /api/shipped-imeis
    ↓
Server fetches data:
    - Google Sheets API call
    - PostgreSQL query
    ↓
Data cached in TanStack Query
    ↓
Components render with data
    ↓
Default tab: Quick Insights
```

### 2. Filtering Workflow

```
User selects filter (e.g., Grade=A)
    ↓
setState updates filter value
    ↓
useMemo recomputes filteredItems
    ↓
PivotView receives new filtered data
    ↓
Component re-renders with filtered results
(No API call - operates on cached data)
```

### 3. Adding Shipped IMEIs

```
User pastes IMEIs in Shipped Items tab
    ↓
User clicks "Add IMEIs"
    ↓
addIMEIsMutation.mutate(imeis)
    ↓
POST /api/shipped-imeis with body { imeis }
    ↓
Server processes:
    - Trim IMEIs
    - Insert into database (or add to in-memory array)
    ↓
Response: Updated list of all shipped IMEIs
    ↓
queryClient.invalidateQueries(['/api/shipped-imeis'])
    ↓
TanStack Query refetches shipped IMEIs
    ↓
Dashboard recomputes currentItems (excludes shipped IMEIs)
    ↓
All tabs update automatically:
    - Physical Inventory: Count decreases
    - Reconciled Inventory: Count increases
    - Quick Insights: Metrics update
```

### 4. INV MATCH Reconciliation

```
User opens INV MATCH dialog
    ↓
User sets filters (Model, GB, Color, etc.)
    ↓
filteredInventory computed via useMemo
    ↓
User pastes scanned IMEIs
    ↓
parsedIMEIs computed via useMemo
    ↓
Reconciliation algorithm runs via useMemo:
    - Categorize each IMEI (matched/wrong model/not found)
    ↓
displayRows computed via useMemo
    ↓
Table updates with color-coded results
(All client-side - no API calls)
```

### 5. Export Operations

```
User clicks "Download CSV"
    ↓
convertToCSV(filteredItems)
    ↓
Generate CSV string from data
    ↓
Create Blob with type 'text/csv'
    ↓
Create download link
    ↓
Trigger download
(All client-side - no API calls)
```

---

## Performance Optimizations

### Frontend Optimizations

#### 1. Memoization Strategy

**Component Memoization:**
```typescript
export default memo(PivotView);
export default memo(DashboardStats);
```
- Prevents re-renders when props haven't changed
- Critical for large inventory views

**Value Memoization:**
```typescript
const filteredItems = useMemo(() => {
  return currentItems.filter(/* filters */);
}, [currentItems, filterGrade, filterModel, filterGB, filterColor, filterLockStatus]);
```
- Recomputes only when dependencies change
- Avoids expensive filtering on every render

**Separate Grouping and Sorting:**
```typescript
// Heavy operation - only when items change
const groupedModels = useMemo(() => {
  // Build data structures
}, [filteredItems]);

// Light operation - can change frequently
const sortedModels = useMemo(() => {
  return [...groupedModels].sort(sortFn);
}, [groupedModels, sortMode]);
```

#### 2. Query Optimization

**Stale Time Configuration:**
```typescript
useQuery({
  queryKey: ['/api/inventory'],
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 10 * 60 * 1000,          // 10 minutes
  refetchOnWindowFocus: false      // Don't refetch on focus
});
```
- Reduces API calls to Google Sheets
- Balances freshness with performance

**Selective Refetching:**
```typescript
useQuery({
  queryKey: ['/api/shipped-imeis'],
  staleTime: 0,                     // Always fetch fresh
  refetchOnWindowFocus: true        // Refetch on tab focus
});
```
- Shipped IMEIs are operational data that changes frequently
- Always get latest state

#### 3. Expansion State Management

**Using Sets for O(1) Lookup:**
```typescript
const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

const isExpanded = expandedModels.has(modelKey);  // O(1)
```
- Fast lookups for expanded state
- Efficient add/remove operations

#### 4. Lock Status Sorting

**Presorting Data:**
```typescript
function sortByLockStatus(items: InventoryItem[]) {
  return items.sort((a, b) => {
    if (a.lockStatus === 'UNLOCKED' && b.lockStatus !== 'UNLOCKED') return -1;
    if (a.lockStatus !== 'UNLOCKED' && b.lockStatus === 'UNLOCKED') return 1;
    return 0;
  });
}
```
- UNLOCKED devices appear first (higher value)
- Applied at grouping level (model, GB, color)

### Backend Optimizations

#### 1. Database Indexing

```sql
-- Unique constraint creates index automatically
CREATE UNIQUE INDEX idx_shipped_imeis_imei ON shipped_imeis(imei);
```
- Fast lookups when checking duplicates
- Fast deletes by IMEI

#### 2. Transaction Batching

```typescript
await db.transaction(async (tx) => {
  for (const value of values) {
    await tx.insert(shippedImeis)
      .values(value)
      .onConflictDoNothing();
  }
});
```
- All inserts in single transaction
- Atomic operation (all or nothing)
- Handles duplicates gracefully

#### 3. In-Memory Fallback

```typescript
if (useInMemory) {
  inMemoryShippedIMEIs = [...new Set([...inMemoryShippedIMEIs, ...newImeis])];
  res.json(inMemoryShippedIMEIs);
}
```
- Development mode without database
- Fast array operations
- Uses Set for deduplication

#### 4. Google Sheets Caching

**Client-side caching via TanStack Query:**
- 5-minute stale time reduces API calls
- Background refetches when stale
- Manual refresh available

**Server-side caching (future enhancement):**
- Could add Redis for server-level caching
- Would reduce Google API quota usage
- Trade-off: Increased complexity

---

## Security Architecture

### 1. API Key Management

**Google API Key:**
- Stored in environment variable (`GOOGLE_API_KEY`)
- Never exposed to client
- Server-side only
- Recommended: Restrict in Google Cloud Console to:
  - Specific APIs (Google Sheets API only)
  - Specific IPs (production server only)
  - HTTP referrers (production domain only)

### 2. Database Security

**Connection String:**
```typescript
DATABASE_URL=postgresql://user:password@host:port/database
```
- Stored in environment variable
- SSL connection in production
- Strong password requirements
- Limited user permissions (CRUD on shipped_imeis only)

### 3. Input Validation

**Zod Schemas:**
```typescript
export const inventoryItemSchema = z.object({
  imei: z.string().optional(),
  grade: z.string().optional(),
  // ... other fields
});
```
- Type safety at runtime
- Validates API responses
- Prevents invalid data propagation

**Request Validation:**
```typescript
if (!Array.isArray(imeis) || imeis.length === 0) {
  return res.status(400).json({ error: 'Invalid imeis array' });
}
```
- Validates request body structure
- Returns 400 for invalid requests

### 4. SQL Injection Prevention

**Parameterized Queries (Drizzle ORM):**
```typescript
await db.delete(shippedImeis).where(eq(shippedImeis.imei, imei));
```
- ORM handles parameterization
- No raw SQL with string concatenation
- Prevents SQL injection attacks

### 5. CORS Configuration

```typescript
// Express CORS middleware (should be added)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
```
- Restrict origins to known domains
- Prevent unauthorized API access

### 6. HTTPS Enforcement

**Railway Configuration:**
- Automatic HTTPS in production
- HTTP requests redirected to HTTPS
- TLS certificates managed by Railway

---

## Deployment Architecture

### Railway Platform

**Components:**
```
┌─────────────────────────────────────────────┐
│              Railway Project                 │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  Gentle Tools Dashboard (Service)    │  │
│  │  - Nixpacks build                    │  │
│  │  - Environment variables             │  │
│  │  - Auto-deploy on git push           │  │
│  └──────────────────────────────────────┘  │
│                    │                         │
│  ┌──────────────────────────────────────┐  │
│  │  PostgreSQL (Plugin)                 │  │
│  │  - Managed database                   │  │
│  │  - Automatic backups                  │  │
│  │  - Connection via DATABASE_URL        │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Build Process

**Nixpacks Configuration (`nixpacks.toml`):**
```toml
[phases.setup]
nixPkgs = ['nodejs_24']

[phases.install]
cmds = ['npm install']

[start]
cmd = 'npm run start'
```

**Build Steps:**
1. Detect Node.js 24 environment
2. Install dependencies (`npm install`)
3. Build frontend and backend (`npm run build`)
4. Start server (`npm run start`)

**Railway Configuration (`railway.json`):**
```json
{
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

### Environment Variables (Production)

```bash
# Required
GOOGLE_API_KEY=AIza...           # Google Sheets API key
DATABASE_URL=postgresql://...    # PostgreSQL connection string

# Optional
NODE_ENV=production             # Environment mode
PORT=3000                       # Server port (Railway provides)
```

### Deployment Workflow

```
Developer pushes to main branch
    ↓
GitHub webhook triggers Railway
    ↓
Railway pulls latest code
    ↓
Nixpacks detects Node.js project
    ↓
Install phase: npm install
    ↓
Build phase: npm run build
    ├── Vite builds client (dist/public)
    └── tsc builds server (dist)
    ↓
Start phase: npm run start
    ├── Express serves API on /api/*
    └── Express serves static files from dist/public
    ↓
Health check passes
    ↓
Traffic routed to new deployment
    ↓
Old deployment terminated
```

### Zero-Downtime Deployment

Railway provides:
- Blue-green deployments
- Health checks before traffic routing
- Automatic rollback on failure
- Configurable restart policy (ON_FAILURE, max 10 retries)

---

## Monitoring and Observability

### Logging

**Server Logs:**
```typescript
console.log('[Sheet] Processing', dataRows.length, 'rows');
console.error('Error fetching inventory:', error);
console.warn('⚠️  DATABASE_URL not set. Using in-memory storage.');
```

**Log Levels:**
- `console.log` - Informational (startup, operations)
- `console.warn` - Warnings (fallback modes, degraded functionality)
- `console.error` - Errors (API failures, database errors)

**Railway Logs:**
- Accessible via Railway dashboard
- Real-time log streaming
- Searchable and filterable
- Retention based on plan

### Error Handling

**Frontend Error Boundaries:**
```typescript
if (error) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Loading Inventory</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
```

**Backend Error Responses:**
```typescript
try {
  // Operation
} catch (error: any) {
  console.error('Error in endpoint:', error);
  res.status(500).json({
    error: 'Failed to perform operation',
    message: error.message
  });
}
```

### Health Checks

**Endpoint (to be added):**
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: db ? 'connected' : 'in-memory',
    timestamp: new Date().toISOString()
  });
});
```

### Metrics (Future Enhancement)

**Potential Metrics:**
- API response times
- Google Sheets API quota usage
- Database query performance
- User session counts
- Most-used features
- Error rates

**Recommended Tools:**
- Railway Observability (built-in)
- Google Cloud Console (Sheets API metrics)
- PostgreSQL query statistics
- Custom logging with structured data

---

## Testing Strategy

### Unit Tests

**Not currently implemented** - Recommended additions:
- Utility function tests (`exportUtils.ts`, `modelSorting.ts`)
- Schema validation tests
- Component logic tests (non-UI)

### Integration Tests

**Not currently implemented** - Recommended additions:
- API endpoint tests
- Database integration tests
- Google Sheets API mocks

### End-to-End Tests

**Playwright Tests (`tests/dashboard.spec.ts`):**

**Test Categories:**
1. **Basic Functionality:**
   - Dashboard loads
   - All tabs accessible
   - Data fetching

2. **Physical Inventory Tab:**
   - Grade breakdown expansion
   - Model card drill-down
   - Filtering
   - Sorting (release order, quantity)
   - Export buttons

3. **Reconciled Inventory Tab:**
   - IMEI search
   - Filtering
   - Export

4. **Shipped Items Tab:**
   - Add IMEIs
   - Remove IMEIs
   - Clear all

5. **INV MATCH Feature:**
   - Dialog opens
   - Filter selection
   - IMEI pasting
   - Results categorization
   - Copy buttons
   - Save worksheet

**Running Tests:**
```bash
npm run test              # Run all tests
npx playwright test --ui  # UI mode
npx playwright test --debug  # Debug mode
```

---

## Scalability Considerations

### Current Limitations

**Frontend:**
- Single-page app (no code splitting yet)
- All data loaded in memory
- Performance degrades with 20,000+ items
- No pagination or virtualization

**Backend:**
- Single server instance
- Synchronous Google Sheets API calls
- No caching layer (Redis)
- No rate limiting

**Database:**
- Simple schema (one table)
- No partitioning
- No read replicas

### Scalability Improvements (Future)

**Frontend:**
- **Virtual scrolling**: Only render visible items in PivotView
- **Code splitting**: Lazy load tabs and modals
- **Pagination**: Limit items per page
- **Service Worker**: Offline support, background sync

**Backend:**
- **Redis caching**: Cache Google Sheets responses
- **Rate limiting**: Prevent abuse
- **Horizontal scaling**: Multiple server instances
- **Background jobs**: Async inventory sync
- **WebSockets**: Real-time updates

**Database:**
- **Read replicas**: Distribute read load
- **Connection pooling**: Optimize connections
- **Indexing**: Add indexes for common queries
- **Archiving**: Move old data to separate table

**Data Architecture:**
- **PostgreSQL for inventory**: Move away from Google Sheets
- **Event sourcing**: Track all inventory changes
- **CQRS pattern**: Separate read/write models
- **Time-series data**: Track inventory over time

---

## Future Enhancements

### Planned Features

1. **User Authentication:**
   - Login/logout
   - Role-based access control (admin, operator, viewer)
   - Audit trail of who added/removed shipped IMEIs

2. **Advanced Analytics:**
   - Inventory turnover rates
   - Historical trend charts
   - Predictive analytics (low stock alerts)
   - Demand forecasting

3. **Bulk Operations:**
   - Bulk edit in PivotView
   - Bulk export with templates
   - Import from CSV

4. **Notifications:**
   - Low stock alerts
   - Shipment confirmations
   - Reconciliation reminders

5. **Mobile App:**
   - Native iOS/Android apps
   - Barcode scanning integration
   - Offline support

6. **Reporting:**
   - Custom report builder
   - Scheduled email reports
   - PDF export with branding

7. **Integration:**
   - ERP system integration
   - Shipping platform integration (FedEx, UPS)
   - Accounting system sync

8. **Multi-Warehouse:**
   - Multiple location support
   - Transfer between warehouses
   - Location-specific views

---

## Development Guidelines

### Code Style

**TypeScript:**
- Strict mode enabled
- Explicit return types for functions
- Avoid `any` type (use `unknown` if needed)
- Use interfaces for objects, types for unions

**React:**
- Functional components only
- Custom hooks for reusable logic
- Memoization for expensive computations
- Avoid prop drilling (use context if needed)

**CSS:**
- Tailwind utility classes
- Avoid custom CSS unless necessary
- Use shadcn/ui components
- Responsive design (mobile-first)

### File Organization

**Components:**
- One component per file
- Co-locate related components
- Separate UI components (`/ui`) from feature components

**Utilities:**
- Group by functionality (`exportUtils.ts`, `modelSorting.ts`)
- Export named functions
- Include JSDoc comments

**Types:**
- Shared types in `/shared/schema.ts`
- Component-specific types in component file
- Use Zod for runtime validation

### Git Workflow

**Branches:**
- `main` - Production code
- `develop` - Development branch (optional)
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

**Commit Messages:**
```
type(scope): subject

body

footer
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Types are properly defined
- [ ] Error handling is implemented
- [ ] Tests are added/updated (if applicable)
- [ ] Documentation is updated
- [ ] No console.log statements (use proper logging)
- [ ] Performance considerations addressed
- [ ] Security implications reviewed

---

## Troubleshooting for Developers

### Common Development Issues

**Issue: Vite dev server won't start**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Check port 5173 isn't in use
lsof -ti:5173 | xargs kill -9
```

**Issue: TypeScript errors after update**
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npx tsc --build --clean

# Rebuild
npm run build
```

**Issue: Database connection failing**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Check server logs for specific error
```

**Issue: Google Sheets API quota exceeded**
```bash
# Check Google Cloud Console quotas
# Wait for quota reset (midnight PST)
# Increase staleTime in query config
```

### Debugging Tips

**Frontend:**
```typescript
// React DevTools browser extension
// TanStack Query DevTools (included in dev mode)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Backend:**
```typescript
// Add debug logging
console.log('Request body:', req.body);
console.log('Query result:', result);

// Use tsx watch mode
npm run dev  // Auto-restarts on file changes
```

**Database:**
```sql
-- Check shipped IMEIs table
SELECT * FROM shipped_imeis LIMIT 10;

-- Check duplicates
SELECT imei, COUNT(*) FROM shipped_imeis GROUP BY imei HAVING COUNT(*) > 1;

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('shipped_imeis'));
```

---

## Appendix: Technology Decision Rationale

### Why React?
- Industry standard for SPAs
- Large ecosystem and community
- Excellent TypeScript support
- Component reusability

### Why Vite?
- Fast development server (HMR)
- Modern build tool
- Better than Create React App
- Excellent TypeScript support

### Why TanStack Query?
- Best-in-class server state management
- Automatic caching and refetching
- Optimistic updates
- Devtools for debugging

### Why Express?
- Simple and unopinionated
- Large ecosystem
- Well-documented
- Easy to integrate with existing code

### Why PostgreSQL?
- ACID compliance
- JSON support (future enhancement)
- Mature and stable
- Free and open-source

### Why Google Sheets?
- Familiar to non-technical users
- No database migration needed
- Built-in collaboration
- Easy data entry

### Why Drizzle ORM?
- TypeScript-first
- Type-safe queries
- Lightweight
- Good PostgreSQL support

### Why shadcn/ui?
- Copy-paste components (no package dependency)
- Customizable
- Built on Radix UI (accessibility)
- Tailwind CSS integration

### Why Railway?
- Simple deployment
- Automatic HTTPS
- Integrated database
- Fair pricing

---

**Document Version:** 1.0
**Last Updated:** 2025-11-05
**Maintained By:** Development Team

