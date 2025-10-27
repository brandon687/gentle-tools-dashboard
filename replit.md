# Inventory Management System

## Overview

This is a real-time inventory management system designed for tracking device inventory with live Google Sheets integration. The application provides a data-dense, productivity-focused interface for managing phones and electronic devices, including IMEI tracking, grade classification, model information, storage capacity, color variants, and carrier lock status.

The system follows a design-system approach inspired by Linear's data-dense patterns and Notion's clean information hierarchy, prioritizing scannable data presentation and efficient user workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool and development server.

**UI Component Library**: Shadcn/ui (Radix UI primitives) styled with Tailwind CSS using the "New York" design system variant. The component system emphasizes:
- Utility-first CSS with Tailwind
- Radix UI primitives for accessibility and behavior
- Custom theming with CSS variables for light/dark mode support
- Modular, composable components

**State Management**: 
- TanStack Query (React Query) for server state management and data fetching
- Local React state (useState) for UI state
- No global state management library (Redux, Zustand, etc.)

**Routing**: Wouter for lightweight client-side routing

**Design System**:
- Typography: Inter font family from Google Fonts
- Spacing: Tailwind's standard spacing scale (2, 4, 6, 8, 12, 16, 20)
- Color scheme: HSL-based custom color system with CSS variables
- Responsive grid: Mobile-first with breakpoints at md (768px) and lg (1024px)

**Key UI Patterns**:
- Dashboard with stat cards showing aggregate metrics
- Expandable/collapsible sections for hierarchical data (Grade → Model → GB → Color)
- Table view with sorting capabilities
- Pivot/grouping view for data analysis
- Detail sheets (side panels) for individual item inspection
- Search and filter functionality
- Toast notifications for user feedback

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript

**API Design**: RESTful endpoints using Express routes
- `/api/inventory` - Primary endpoint for fetching inventory data

**Development Server**: Custom Vite middleware integration for hot module replacement (HMR) during development

**Type Safety**: Shared TypeScript types between client and server using a `/shared` directory
- Schema definitions with Zod for runtime validation
- Type inference from Zod schemas for compile-time safety

**Build Process**:
- Frontend: Vite builds to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- ESM modules throughout (type: "module" in package.json)

### Data Storage Solutions

**Primary Data Source**: Google Sheets API integration
- Read-only access to external Google Sheets spreadsheet
- Two primary sheets: "PHYSICAL INVENTORY" and "GRADED TO FALLOUT"
- API authentication via Google API key (server-side only)
- Sheet ID: `1zTL8bsHN5PCJpOXFuN18sZMun3yEZoA8XlZJKg6IRhM`

**Data Model**:
```typescript
{
  imei: string (unique device identifier)
  grade: string (A1, A, AB, etc.)
  model: string (device model name)
  gb: string (storage capacity)
  color: string
  lockStatus: string (carrier lock status)
  date: string
  concat: string (combined SKU-like identifier)
  age: string (calculated age)
}
```

**Database Configuration**: 
- Drizzle ORM configured with PostgreSQL dialect
- Connection via Neon serverless driver
- Schema defined in `/shared/schema.ts`
- Migrations output to `/migrations` directory
- Note: Currently using Google Sheets as primary data source; PostgreSQL integration is configured but not actively used for inventory data

**In-Memory Storage**: Simple in-memory storage implementation for user data (MemStorage class) - used for potential authentication/session management

### Authentication and Authorization

**Current State**: No authentication system implemented. The application appears to be configured for potential session-based authentication (connect-pg-simple for session storage), but it's not currently active.

**Session Infrastructure**: 
- Express session middleware configured
- PostgreSQL session store (connect-pg-simple) available but not in use
- User schema defined in shared types but not actively used

**Security Consideration**: API key for Google Sheets is server-side only, not exposed to client

### External Dependencies

**Third-Party Services**:
- **Google Sheets API**: Primary data source for inventory information
  - googleapis npm package for API access
  - Read-only operations on remote spreadsheet
  - Polling/refresh pattern (client initiates refresh via query refetch)

**Key External Libraries**:
- **@neondatabase/serverless**: PostgreSQL database driver (configured but not actively used for inventory)
- **@tanstack/react-query**: Server state management and caching
- **@tanstack/react-table**: Table rendering and sorting functionality
- **drizzle-orm**: Database ORM layer
- **date-fns**: Date manipulation and formatting
- **zod**: Schema validation and type inference
- **react-hook-form** with **@hookform/resolvers**: Form handling
- **class-variance-authority** and **clsx**: Utility for managing CSS classes
- **lucide-react**: Icon library
- **cmdk**: Command palette component (likely for search)
- **nanoid**: Unique ID generation

**Development Tools**:
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast JavaScript bundler for production builds
- **drizzle-kit**: Database migration tool
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer** and **@replit/vite-plugin-dev-banner**: Replit-specific development tools

**Data Flow**:
1. Client initiates data fetch via React Query
2. Request goes to `/api/inventory` endpoint
3. Server fetches data from Google Sheets API
4. Data is validated against Zod schemas
5. Response sent to client as JSON
6. React Query caches and manages the data
7. Components consume data through query hooks