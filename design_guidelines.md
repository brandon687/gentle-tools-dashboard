# Design Guidelines: Inventory Management System

## Design Approach
**Selected Approach**: Design System-Based (Utility-Focused)
**Reference Systems**: Linear's data-dense interface patterns + Notion's clean information hierarchy
**Rationale**: This is a productivity tool where efficiency, data clarity, and learnability are paramount. Users need to quickly scan inventory, search for devices, and access detailed specifications.

## Core Design Principles
1. **Information Hierarchy**: Data should be scannable at a glance with clear visual separation between data types
2. **Functional Clarity**: Every UI element serves a clear purpose; no decorative elements
3. **Density Control**: Balance between information density and breathing room
4. **Instant Action**: Search, filter, and navigation should be immediately accessible

## Typography System

**Font Family**: Inter (via Google Fonts CDN)
- Primary: Inter for all UI elements
- Fallback: system-ui, -apple-system, sans-serif

**Type Scale**:
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Card Titles/Labels: text-sm font-medium uppercase tracking-wide
- Body Text: text-base font-normal
- Table Headers: text-xs font-medium uppercase tracking-wider
- Table Data: text-sm font-normal
- Metadata/Secondary: text-xs font-normal
- Numbers/Stats: text-2xl font-bold (for dashboard metrics)

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-4 or p-6
- Section spacing: space-y-6 or space-y-8
- Card margins: m-4
- Table cell padding: px-4 py-3
- Button padding: px-4 py-2
- Input padding: px-3 py-2

**Grid System**:
- Main container: max-w-7xl mx-auto px-4
- Dashboard cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Two-column layouts: grid grid-cols-1 lg:grid-cols-3 gap-6 (2:1 ratio using col-span-2)

**Layout Structure**:
- Fixed header/navigation (h-16)
- Sidebar navigation (w-64) - optional left sidebar for filtering
- Main content area with dynamic scrolling
- Responsive: Single column mobile, multi-column desktop

## Component Library

### Navigation
- **Top Bar**: Fixed header with logo, search bar (prominent, centered), and user actions
- **Search Input**: Large, prominent with icon (Heroicons magnifying-glass)
- Layout: flex items-center justify-between px-6 h-16

### Dashboard Cards
- **Stat Cards**: Display key metrics (Total Devices, In Stock, Low Stock, Categories)
- Structure: Rounded corners (rounded-lg), subtle border, stat number prominent, label below
- Layout: p-6 space-y-2

### Data Table
- **Primary Component**: Inventory list view
- Structure: Full-width table with sticky header
- Columns: IMEI, Device Model, Status, Location, Condition, Stock Level, Actions
- Row hover state (subtle)
- Alternating row treatment optional for readability
- Sortable column headers with sort icons
- Pagination controls at bottom

### Filter Panel (Sidebar or Dropdown)
- **Filter Groups**: Category, Status, Location, Condition
- Checkbox groups with counts
- "Clear All" action
- Collapsible sections with disclosure triangles

### Item Detail View
- **Layout**: Modal or slide-over panel (slide-over from right preferred)
- **Structure**: 
  - Header with device name and close button
  - Specs grid: 2-column layout (label: value pairs)
  - Status badges
  - Action buttons at bottom (Edit, Delete)
- Width: max-w-2xl

### Cards (for Grid View Option)
- **Device Cards**: Alternative to table view
- Structure: Image placeholder, device name, key specs, status badge
- Layout: rounded-lg border p-4 space-y-3
- Hover: Subtle lift effect (shadow change)

### Buttons
- **Primary Action**: solid background, rounded-md px-4 py-2 text-sm font-medium
- **Secondary Action**: outline style, same sizing
- **Icon Buttons**: Square (w-10 h-10), centered icon
- States: No custom hover states specified

### Form Inputs (for Add/Edit)
- **Text Inputs**: border rounded-md px-3 py-2 w-full
- **Labels**: text-sm font-medium mb-1
- **Helper Text**: text-xs below input
- Layout: space-y-4 for form fields

### Badges/Status Indicators
- **Status Badges**: Pill-shaped, text-xs font-medium px-2.5 py-0.5 rounded-full
- Types: In Stock, Low Stock, Out of Stock, Active, Inactive
- Position: Inline with device name or in status column

### Empty States
- **No Results/Data**: Centered icon, message, and optional action button
- Layout: flex flex-col items-center justify-center py-12 space-y-4

## Icons
**Library**: Heroicons (via CDN)
**Usage**:
- Navigation: Cube (inventory), MagnifyingGlass (search), Funnel (filter)
- Actions: PencilSquare (edit), Trash (delete), Plus (add), XMark (close)
- Status: CheckCircle (in stock), ExclamationTriangle (low stock)
- Sorting: ChevronUp/Down
- Size: w-5 h-5 for general use, w-4 h-4 for inline text

## Responsive Behavior
- **Mobile (< 768px)**: Single column, collapsible filters, simplified table (card view)
- **Tablet (768px - 1024px)**: Two-column dashboard, visible table with horizontal scroll
- **Desktop (> 1024px)**: Full layout with sidebar filters, multi-column grids

## Accessibility
- Focus states: visible focus rings on all interactive elements
- ARIA labels for icon-only buttons
- Table headers with proper scope
- Keyboard navigation for modals and dropdowns
- Sufficient color contrast for all text
- Form labels associated with inputs

## Animation Guidelines
**Minimal Animation Approach**:
- Modal/Slide-over: Slide-in transition (300ms ease-out)
- Dropdown menus: Fade-in (200ms)
- Hover states: Instant (no transition)
- Loading states: Subtle spinner only
- **No**: Scroll animations, complex transitions, decorative motion

## Images
**No Hero Section**: This is a productivity tool, not a marketing page
**Device Placeholders**: Use placeholder boxes or generic device icons in cards/detail views
**No Background Images**: Keep interface clean and functional