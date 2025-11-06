# Gentle Tools Dashboard - Standard Operating Procedures (SOP)

## Table of Contents
1. [Overview](#overview)
2. [Dashboard Navigation](#dashboard-navigation)
3. [Quick Insights Tab](#quick-insights-tab)
4. [Physical Inventory Tab](#physical-inventory-tab)
5. [Reconciled Inventory Tab](#reconciled-inventory-tab)
6. [Shipped Items Tab](#shipped-items-tab)
7. [INV MATCH Feature](#inv-match-feature)
8. [Export and Data Management](#export-and-data-management)
9. [Common Workflows](#common-workflows)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**Gentle Tools Dashboard** is a real-time inventory management system that connects to Google Sheets to display, filter, analyze, and reconcile iPhone inventory data. The dashboard automatically tracks shipped items and provides comprehensive tools for warehouse operations.

### Key Features
- **Real-time sync** with Google Sheets
- **Multi-tab interface** for different inventory views
- **Quick Insights** for high-level metrics
- **INV MATCH** for remote scanning and reconciliation
- **Export capabilities** (CSV, clipboard)
- **Shipped IMEI tracking** for automatic inventory adjustment
- **Grade-based filtering** and drill-down analysis

---

## Dashboard Navigation

The dashboard consists of four main tabs accessible from the top navigation:

### Tab Structure
```
┌─────────────────────────────────────────────────────────┐
│ Quick Insights │ Physical Inventory │ Reconciled │ Shipped │
└─────────────────────────────────────────────────────────┘
```

**Navigation Tips:**
- The default view opens to **Quick Insights**
- Click any tab to switch views
- The **Shipped Items** tab shows a count badge (e.g., "Shipped Items (45)")
- All tabs maintain their filter states when switching between them

---

## Quick Insights Tab

**Purpose:** High-level analytics and metrics for quick reference without cluttering operational views.

### Physical Inventory Insights
Displays metrics for items currently in the warehouse (excludes shipped items):
- **Total Devices**: Count of all physical inventory
- **Highest Stocked SKU**: Most common model/GB/color combination
- **Top Model**: Model with the most units
- **Top Grade**: Most common grade in inventory
- **Unique Models**: Number of different device models
- **Unlocked Devices**: Count of carrier-unlocked devices

### Reconciled Inventory Insights
Displays metrics for items that have been shipped or ordered:
- Same metric categories as Physical Inventory
- Helps track what was shipped in aggregate

### When to Use
- **Daily briefings**: Quick overview of inventory status
- **Management reports**: High-level numbers for decision-making
- **Capacity planning**: Understanding inventory composition
- **Reference checks**: Verify counts without navigating through detailed views

---

## Physical Inventory Tab

**Purpose:** Active warehouse inventory management and detailed item analysis.

### Features

#### 1. Breakdown by Grade
- **Visual card layout** showing A, AB, B, C, D grades
- **Click to expand** each grade card
- **Drill-down hierarchy**: Grade → Model → Storage → Color
- Shows device counts at each level

**How to Use:**
1. Click any grade card (e.g., "A GRADE")
2. Expand to see all models in that grade
3. Click a model to see storage options (64GB, 128GB, etc.)
4. Click storage to see color options
5. Double-click quantity to view individual IMEIs

#### 2. Detailed View (Pivot Table)
**Location:** Below "Breakdown by Grade"

**Sorting Options:**
- **Release Order** (default): Shows models by iPhone release date (newest first)
- **Quantity**: Shows models sorted by inventory count (highest first)

**Grade Filtering:**
- **All**: Shows all grades
- **A**: Shows only A grade devices
- **AB**: Shows only AB grade devices

**Model Cards:**
Each model displays:
- Model name (e.g., "iPhone 14 Pro Max")
- Total device count
- **Copy IMEIs** button: Copies all IMEIs for that model
- **Download CSV** button: Exports full data for that model

**Drill-Down View:**
1. Click a model card to expand
2. See storage options (GB) with counts
3. Click storage to expand colors
4. Click color to see individual devices with:
   - IMEI number
   - Lock status (UNLOCKED/LOCKED)
   - Grade

**Action Buttons at Each Level:**
- **Copy**: Copies IMEIs to clipboard
- **Download**: Exports data as CSV

#### 3. Filters
Apply multiple filters simultaneously:
- **Grade**: A, AB, B, C, D
- **Model**: All iPhone models
- **Storage (GB)**: 64GB, 128GB, 256GB, 512GB, 1TB
- **Color**: All available colors
- **Lock Status**: UNLOCKED, LOCKED

**Filter Tips:**
- Filters work in combination (AND logic)
- "Clear All" button resets all filters
- Filter results update instantly
- Export buttons respect active filters

#### 4. Export Options
**Download CSV Button:**
- Exports filtered results as CSV file
- Includes: IMEI, Model, GB, Color, Grade, Lock Status, Date, Age

**Copy as CSV Button:**
- Copies filtered results to clipboard in CSV format
- Ready to paste into Excel or Google Sheets

#### 5. INV MATCH Button
Opens the inventory matching tool (see [INV MATCH Feature](#inv-match-feature))

---

## Reconciled Inventory Tab

**Purpose:** View items that have been marked as shipped and are no longer in physical inventory.

### Features

#### 1. IMEI Search Bar
- **Search by IMEI**: Type full or partial IMEI
- **Real-time filtering**: Results update as you type
- **Clear button**: Quickly reset search

**Use Cases:**
- Verify if a specific device was shipped
- Find details about a shipped item
- Track shipped device history

#### 2. Breakdown by Grade
Same as Physical Inventory tab, but shows only shipped items

#### 3. Detailed View
Same pivot table functionality as Physical Inventory:
- Sort by Release Order or Quantity
- Filter by Grade (All/A/AB)
- Drill down: Model → GB → Color → Individual devices
- Export and copy functionality

#### 4. Filters
Same filtering capabilities as Physical Inventory tab

### When to Use
- **Order verification**: Confirm which items were shipped
- **Audit purposes**: Review what left the warehouse
- **Reconciliation**: Match shipped items against purchase orders
- **Historical tracking**: Analyze shipping patterns

---

## Shipped Items Tab

**Purpose:** Manage the list of IMEIs that have been shipped or ordered. These IMEIs are automatically excluded from Physical Inventory and shown in Reconciled Inventory.

### Add Shipped IMEIs

**How to Add:**
1. Navigate to the **Shipped Items** tab
2. Find the "Add Shipped IMEIs" card
3. Paste IMEIs in the text area (one per line)
4. Click **Add IMEIs**

**Input Format:**
```
355555754760571
354155251896506
352803728976318
```

**Tips:**
- Copy from Excel/Sheets: Paste column of IMEIs directly
- Duplicates are automatically ignored
- System validates IMEI format
- Bulk add supported (no limit)

### Shipped IMEIs List

**Features:**
- **Total Count Badge**: Shows number of shipped items
- **Copy Button**: Copies all shipped IMEIs to clipboard
- **Export Button**: Downloads list as CSV file
- **Clear All Button**: Removes all shipped IMEIs (requires confirmation)
- **Individual Remove**: Trash icon next to each IMEI

**List Display:**
- Numbered index (#1, #2, etc.)
- IMEI in monospace font
- Scrollable list (max height 400px)
- Delete button per item

### When to Use
- **After shipping orders**: Mark items as shipped
- **After placing orders**: Track pending fulfillment
- **Reconciliation**: Add IMEIs from packing slips
- **Corrections**: Remove incorrectly marked items

### Important Notes
- Changes take effect **immediately** across all tabs
- Physical Inventory **automatically excludes** these IMEIs
- Reconciled Inventory **shows only** these IMEIs
- Data persists using **PostgreSQL database** (or in-memory if no DB)

---

## INV MATCH Feature

**Purpose:** Remote inventory reconciliation tool for warehouse operations. Compare scanned/dumped IMEIs against expected inventory to find discrepancies.

**Access:** Click **INV MATCH** button in Physical Inventory tab

### Workflow

#### Step 1: Select Filters
Filter the inventory you're expecting to scan:
1. **Grade**: Select grade (e.g., A)
2. **Model**: Select model (e.g., iPhone 14 Pro Max)
3. **Storage**: Select GB (e.g., 256GB)
4. **Color**: Select color (e.g., Space Black)
5. **Lock Status**: Select lock status (e.g., UNLOCKED)

**Result:** Shows "Inventory: X devices" matching your filters

#### Step 2: Paste Scanned IMEIs
In the left panel:
1. Click the **Scanned/Dump IMEIs** text area
2. Paste IMEIs (one per line) from your scanning device or clipboard
3. Watch the **Live Comparison** update automatically

#### Step 3: Review Results

**Status Bar Shows:**
- **Inventory**: Total filtered devices expected
- **Scanned**: Number of IMEIs pasted
- **Matched** (Green): IMEIs found in filtered inventory
- **Wrong Model** (Yellow): IMEIs found in inventory but don't match filters
- **Not Found** (Red): IMEIs not in inventory at all

**Live Comparison Table:**
Displays three types of results with color coding:

**🔴 Not Found (Red Highlight)**
- IMEI is scanned but doesn't exist in any inventory
- **Possible causes**: Already shipped, wrong database, data entry error
- **Action**: Investigate source of IMEI

**🟡 Wrong Model (Yellow Highlight)**
- IMEI exists in inventory but doesn't match your filters
- **Shows**: What the item actually is (Model, GB, Color, Grade, Lock Status)
- **Possible causes**: Mislabeled box, incorrect filter selection, inventory error
- **Action**: Verify physical item or adjust filters

**🟢 Matched (Green Highlight)**
- IMEI found and matches your filter criteria
- **Icon**: Green checkmark
- **Meaning**: Correct item scanned

**⚪ Unscanned (No Highlight)**
- Items in filtered inventory that haven't been scanned yet
- **Icon**: Gray minus sign
- **Meaning**: Still need to be scanned

#### Step 4: Export Results

**Copy Buttons:**
- **Copy Not Found**: Copies red (not found) IMEIs to clipboard
- **Copy Wrong Model**: Copies yellow (wrong model) IMEIs to clipboard
- **Copy Matched**: Copies green (matched) IMEIs to clipboard

**Use Cases:**
- Paste into Google Sheets for investigation
- Share with team for resolution
- Document discrepancies for audit

#### Step 5: Save Worksheet (Optional)
1. Click **Save Worksheet** button (bottom left)
2. Enter **Operator Name** in the dialog
3. Click **Save & Download**

**Worksheet Includes:**
- Timestamp of scan session
- Operator name
- All filter settings used
- Statistics (inventory count, scanned count, match counts)
- Complete list of scanned IMEIs
- Complete list of not found IMEIs
- Complete list of wrong model IMEIs with details
- Complete list of matched items

**File Saved As:** `worksheet_[timestamp]_[operator_name].json`

**Also Saved:** Local browser storage for reference

### Common Use Cases

#### Use Case 1: Box Verification
**Scenario:** Verify that a box labeled "iPhone 14 Pro 128GB Space Black A Grade" contains correct items.

**Steps:**
1. Open INV MATCH
2. Set filters: Grade=A, Model=iPhone 14 Pro, GB=128GB, Color=Space Black
3. Scan/dump all IMEIs from the box
4. Paste into INV MATCH
5. Review:
   - **All green**: Box is correct
   - **Yellow items**: Wrong items in box
   - **Red items**: Items not in inventory
   - **Unscanned items**: Expected items missing from box

#### Use Case 2: Shipment Preparation
**Scenario:** Preparing to ship 50 iPhone 13 Pro Max 256GB devices.

**Steps:**
1. Open INV MATCH
2. Set filters to match order requirements
3. As items are scanned for packing, paste IMEIs
4. Verify all 50 items match (all green)
5. Copy matched IMEIs
6. Navigate to Shipped Items tab
7. Paste and add to shipped list
8. Save worksheet with operator name for record

#### Use Case 3: Cycle Count Audit
**Scenario:** Auditing a section of warehouse containing Grade AB devices.

**Steps:**
1. Open INV MATCH
2. Set filter: Grade=AB
3. Scan all devices in section
4. Paste into INV MATCH
5. Review discrepancies:
   - **Wrong model**: Physical inventory doesn't match records
   - **Not found**: Investigate if devices were shipped
   - **Unscanned**: Missing devices need to be located
6. Save worksheet for audit trail

### Tips for INV MATCH
- **Use specific filters**: More filters = more accurate matching
- **Work in batches**: Break large counts into manageable sections
- **Double-check wrong models**: Often indicates mislabeling
- **Document everything**: Save worksheets for historical records
- **Clear between sessions**: Use "Clear" button to reset for next scan

---

## Export and Data Management

### Export Formats

#### CSV Format
All exports include these fields:
```
IMEI, Model, GB, Color, Grade, Lock Status, Date, Age
```

#### Export Locations
1. **Pivot View**: Export entire model or filtered subset
2. **Detailed View Top Bar**: Export current filtered results
3. **INV MATCH**: Export matched, not found, or wrong model lists
4. **Shipped Items**: Export all shipped IMEIs

### Clipboard Operations

**Copy IMEIs (Plain Text):**
- Format: One IMEI per line
- Use: Quick paste into Sheets, Slack, email

**Copy as CSV:**
- Format: Full CSV with headers
- Use: Paste into Excel for analysis

### Data Persistence

**Real-time Sync:**
- Dashboard pulls from Google Sheets every refresh
- Changes to Google Sheets appear on next refresh or manual refresh button

**Shipped IMEIs Storage:**
- **Production**: PostgreSQL database (persistent)
- **Development**: In-memory (resets on server restart)
- **No data loss**: Always backed up in database

**Worksheet Storage:**
- **Browser localStorage**: Recent worksheets cached locally
- **Downloaded JSON**: Permanent record on disk

---

## Common Workflows

### Workflow 1: Daily Inventory Check

**Goal:** Review current inventory status and identify low stock.

**Steps:**
1. Open dashboard (defaults to **Quick Insights**)
2. Note **Total Devices**, **Top Model**, **Highest Stocked SKU**
3. Switch to **Physical Inventory** tab
4. Set sort to **Quantity** (lowest first)
5. Review models with low counts
6. Click model cards to see which GB/colors are low
7. Export low-stock items using **Download CSV**
8. Share with purchasing team

**Time:** 2-3 minutes

---

### Workflow 2: Prepare Shipment Order

**Goal:** Pull and verify devices for a customer order.

**Order Example:**
- 20x iPhone 14 Pro 256GB Space Black, A Grade, Unlocked

**Steps:**
1. Navigate to **Physical Inventory** tab
2. Click **INV MATCH** button
3. Set filters:
   - Model: iPhone 14 Pro
   - GB: 256GB
   - Color: Space Black
   - Grade: A
   - Lock Status: UNLOCKED
4. Verify "Inventory: 20" (or more) displays
5. Pull devices from warehouse
6. Scan each device as pulled
7. Paste scanned IMEIs into INV MATCH
8. Verify all items show **green (matched)**
9. If any yellow/red items:
   - Replace with correct items
   - Rescan until all green
10. Click **Copy Matched** button
11. Close INV MATCH
12. Navigate to **Shipped Items** tab
13. Paste matched IMEIs
14. Click **Add IMEIs**
15. Return to INV MATCH, click **Save Worksheet**
16. Enter operator name
17. Download worksheet for records

**Time:** 10-15 minutes (depending on order size)

---

### Workflow 3: Receive New Inventory Shipment

**Goal:** Add newly received devices to inventory.

**Steps:**
1. Receive shipment from supplier with packing slip
2. Access **Google Sheets** (Physical Inventory sheet)
3. Add new rows for each device:
   - IMEI
   - Model
   - GB
   - Color
   - Grade
   - Lock Status
   - Date received
4. Save Google Sheets
5. Return to dashboard
6. Click **Refresh** button (top right)
7. Navigate to **Physical Inventory** tab
8. Verify new devices appear in counts
9. Use filters to locate specific new items
10. Click model cards to drill down and verify details

**Time:** 5-10 minutes (after data entry)

---

### Workflow 4: Monthly Reconciliation Audit

**Goal:** Verify physical inventory matches system records.

**Steps:**
1. **Preparation Phase:**
   - Export all **Physical Inventory** using Download CSV
   - Print or load on tablet for reference
   - Organize warehouse sections

2. **Audit Phase (per section):**
   - Open **INV MATCH**
   - Set filters for section being audited
   - Scan all devices in section
   - Paste into INV MATCH
   - Document discrepancies:
     - **Wrong Model**: Tag device and investigate
     - **Not Found**: Search database/shipped items
     - **Unscanned**: Physical search for missing items
   - Save worksheet with operator name and section ID

3. **Resolution Phase:**
   - Collect all saved worksheets
   - Investigate each discrepancy:
     - Update Google Sheets with corrections
     - Relabel physical items if needed
     - Add to shipped list if confirmed shipped
   - Re-audit problem sections

4. **Reporting Phase:**
   - Navigate to **Quick Insights** tab
   - Screenshot before/after metrics
   - Compile discrepancy report from worksheets
   - Update procedures based on findings

**Time:** 4-8 hours (depending on inventory size)

---

### Workflow 5: Remove Shipped Items from Inventory

**Goal:** Mark items as shipped after order fulfillment.

**Steps:**
1. Receive shipping manifest or packing slip with IMEIs
2. Navigate to **Shipped Items** tab
3. Copy IMEIs from manifest
4. Paste into "Add Shipped IMEIs" text area
5. Click **Add IMEIs**
6. Verify count updates
7. Navigate to **Physical Inventory** tab
8. Verify devices no longer appear in counts
9. Navigate to **Reconciled Inventory** tab
10. Verify devices now appear here
11. **Optional**: Export reconciled inventory as record

**Time:** 2-3 minutes

---

### Workflow 6: Undo Incorrectly Marked Shipment

**Goal:** Remove IMEIs from shipped list if marked by mistake.

**Steps:**
1. Navigate to **Shipped Items** tab
2. Scroll through "Shipped IMEIs List"
3. Find incorrect IMEI
4. Click **trash icon** next to IMEI
5. Confirm removal
6. Navigate to **Physical Inventory** tab
7. Verify device reappears in inventory
8. Use filters or INV MATCH to locate device

**Alternative (Bulk Removal):**
1. Navigate to **Shipped Items** tab
2. Click **Export** button
3. Open exported CSV
4. Identify IMEIs to keep
5. Click **Clear All** in dashboard
6. Paste back only correct IMEIs
7. Click **Add IMEIs**

**Time:** 1-2 minutes per item

---

### Workflow 7: Generate Custom Report

**Goal:** Export specific subset of inventory for analysis.

**Steps:**
1. Navigate to **Physical Inventory** tab
2. Apply filters for desired subset:
   - Example: Grade=A, Lock Status=UNLOCKED
3. Note filtered count in "Detailed View" heading
4. Click **Download CSV** button (top right)
5. Open CSV in Excel/Sheets
6. Create pivot tables or charts as needed
7. **Alternative**: Use **Copy as CSV** and paste directly

**Time:** 2-3 minutes

---

## Troubleshooting

### Issue 1: Dashboard Shows "Error Loading Inventory"

**Symptoms:**
- Red error alert appears
- Message: "Failed to load inventory data from Google Sheets"

**Possible Causes:**
1. Google API key is invalid or expired
2. Google Sheets is inaccessible
3. Network connectivity issue
4. Google API quota exceeded

**Solutions:**

**Step 1**: Check Network Connection
- Verify internet connectivity
- Try accessing google.com

**Step 2**: Verify Google Sheets Access
- Open Google Sheets link directly in browser
- Confirm sheet ID matches: `1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw`
- Verify "PHYSICAL INVENTORY" sheet exists

**Step 3**: Check API Key (Admin Only)
- Contact system administrator
- Verify `GOOGLE_API_KEY` environment variable is set in Railway
- Check API key hasn't been revoked in Google Cloud Console

**Step 4**: Retry
- Click **Try Again** button in error message
- Or click **Refresh** button (top right)

**Step 5**: Check API Quota
- Google Sheets API has daily quotas
- Contact admin to check Google Cloud Console quotas
- If exceeded, wait until quota resets (midnight PST)

---

### Issue 2: Refresh Button Not Working

**Symptoms:**
- Click refresh button but data doesn't update
- Spinner appears but no changes

**Solutions:**

**Step 1**: Wait for Completion
- Refresh can take 5-10 seconds for large inventories
- Watch for spinner to disappear

**Step 2**: Hard Refresh
- Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
- This clears browser cache

**Step 3**: Check Console (Developer)
- Open browser developer tools (F12)
- Check Console tab for errors
- Share errors with technical support

---

### Issue 3: Shipped IMEIs Not Persisting

**Symptoms:**
- Add IMEIs to shipped list
- Refresh page or come back later
- IMEIs are gone

**Possible Causes:**
1. Database not configured (using in-memory storage)
2. Database connection issue

**Solutions:**

**Step 1**: Check Database Status
- Look for warning message in server logs
- Message: "Using in-memory storage for shipped IMEIs"

**Step 2**: Contact Administrator
- Database URL needs to be configured in Railway
- Admin should set `DATABASE_URL` environment variable

**Step 3**: Temporary Workaround
- Export shipped IMEIs as CSV regularly
- Keep backup copy
- Re-add after server restarts if needed

---

### Issue 4: INV MATCH Shows Wrong Results

**Symptoms:**
- Scanned IMEI shows as "Not Found" but you know it exists
- Matched count doesn't make sense

**Solutions:**

**Step 1**: Verify IMEI Format
- Check for extra spaces
- Check for special characters
- IMEI should be 15 digits

**Step 2**: Check Filters
- Review all five filters (Grade, Model, GB, Color, Lock Status)
- Try setting all filters to "All" and test again
- Gradually add filters back

**Step 3**: Verify Item in Inventory
- Navigate to **Physical Inventory** tab
- Use search or filters to locate IMEI
- Check if item was marked as shipped

**Step 4**: Check for Duplicates
- Some IMEIs might exist multiple times in Google Sheets
- Verify in source data

---

### Issue 5: Export CSV is Empty or Incomplete

**Symptoms:**
- Download CSV but file is empty
- CSV missing expected rows

**Solutions:**

**Step 1**: Check Filters
- Active filters apply to exports
- Clear all filters and try again
- Verify filtered count matches expectation

**Step 2**: Verify Browser Permissions
- Some browsers block downloads
- Check for blocked download notification
- Allow downloads from site

**Step 3**: Try Copy Instead
- Use **Copy as CSV** button
- Paste into Excel/Sheets manually
- Save from there

---

### Issue 6: Dashboard is Slow or Freezing

**Symptoms:**
- Clicks take a long time to respond
- Page freezes
- Browser becomes unresponsive

**Solutions:**

**Step 1**: Check Inventory Size
- Large inventories (10,000+ items) can be slow
- This is expected behavior

**Step 2**: Use Filters
- Apply filters to reduce data displayed
- Work with smaller subsets

**Step 3**: Close Other Tabs
- Browser may be using too much memory
- Close unused tabs and windows

**Step 4**: Clear Browser Cache
- Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)

**Step 5**: Try Different Browser
- Chrome is recommended
- Safari and Firefox also supported

---

### Issue 7: Can't Copy to Clipboard

**Symptoms:**
- Click "Copy" button
- Nothing happens or error message

**Solutions:**

**Step 1**: Check Browser Permissions
- Browser may block clipboard access
- Look for permission prompt in address bar
- Click and allow clipboard access

**Step 2**: Use Keyboard Shortcut
- Select text manually
- Press `Cmd + C` (Mac) or `Ctrl + C` (Windows)

**Step 3**: Try Different Browser
- Clipboard API support varies
- Chrome has best support

---

### Issue 8: Grades Not Showing Correctly

**Symptoms:**
- Grade filter shows devices as different grade than expected
- Grade counts seem wrong

**Possible Causes:**
- Inconsistent grade formatting in Google Sheets (e.g., "A", "A GRADE", "A-GRADE")

**Solutions:**

**Step 1**: Verify Source Data
- Open Google Sheets
- Check "Grade" column
- Look for variations: "A", "A GRADE", "AB", "AB GRADE", etc.

**Step 2**: Standardize Format (Admin Task)
- Use Find & Replace in Google Sheets
- Standardize to: "A", "AB", "B", "C", "D" (no "GRADE" suffix)
- Refresh dashboard

**Step 3**: Use INV MATCH
- INV MATCH shows actual grade values
- Use to identify specific problem items

---

### Issue 9: New Inventory Not Appearing

**Symptoms:**
- Added devices to Google Sheets
- Dashboard doesn't show them after refresh

**Solutions:**

**Step 1**: Verify Sheet Name
- Devices must be in "PHYSICAL INVENTORY" sheet
- Check spelling and capitalization exactly

**Step 2**: Verify Column Headers
- Row 2 should have headers
- Required headers: IMEI, Model, GB, Color, Grade, LOCK_STATUS

**Step 3**: Check Row Format
- Data starts from Row 3 (Row 1 is banner, Row 2 is headers)
- Verify no blank rows between data

**Step 4**: Hard Refresh Dashboard
- `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)

**Step 5**: Check IMEI Column
- Dashboard filters out rows with blank IMEIs
- Verify IMEI column is populated

---

### Issue 10: Wrong Device Count in Quick Insights

**Symptoms:**
- Quick Insights shows different count than Physical Inventory
- Numbers don't match

**Explanation:**
- **Physical Inventory Insights**: Excludes shipped items (active inventory)
- **Physical Inventory Tab**: May show different count based on filters
- **Reconciled Inventory Insights**: Only shipped items

**Solutions:**

**Step 1**: Understand the Views
- Quick Insights "Physical" = Warehouse stock only
- Quick Insights "Reconciled" = Shipped stock only
- Physical Inventory Tab = Warehouse stock (can be filtered)

**Step 2**: Clear Filters
- Navigate to Physical Inventory tab
- Click "Clear All" filters
- Count should match Quick Insights

**Step 3**: Verify Shipped Items
- Navigate to Shipped Items tab
- Check count badge
- Total = Physical Insights + Reconciled Insights

---

## Best Practices

### Data Entry in Google Sheets
1. **Always fill IMEI column** - Dashboard filters out blank IMEIs
2. **Use consistent formatting** - Standardize grades, models, colors
3. **No blank rows** - Keep data contiguous starting from Row 3
4. **Lock Status format** - Use "UNLOCKED" or "LOCKED" (all caps)
5. **Date format** - Use consistent date format (YYYY-MM-DD recommended)

### Using INV MATCH Effectively
1. **Be specific with filters** - More filters = more accurate results
2. **Work in batches** - Break large counts into 50-100 device sections
3. **Save worksheets** - Always save for audit trail
4. **Document discrepancies** - Note physical locations and issues
5. **Double-check wrong models** - Often human error in labeling

### Shipped Items Management
1. **Add immediately after shipping** - Don't delay marking items shipped
2. **Export regularly** - Keep backup of shipped IMEIs list
3. **Verify before adding** - Double-check IMEIs from packing slips
4. **Don't bulk clear** - Remove individual items if corrections needed
5. **Document bulk changes** - Note why bulk operations were performed

### Performance Optimization
1. **Use filters** - Work with smaller subsets of data
2. **Close expanded cards** - Collapse drill-downs when done
3. **Export large datasets** - Work in Excel for complex analysis
4. **Refresh periodically** - Don't keep dashboard open for days

### Security and Access
1. **Don't share Google API key** - Admin only
2. **Use HTTPS** - Always access via secure connection
3. **Log out when done** - Close browser if on shared computer
4. **Limit shipped items access** - Only authorized personnel
5. **Regular audits** - Verify inventory accuracy monthly

---

## Getting Help

### Support Resources

**Technical Issues:**
- Check this SOP first
- Review troubleshooting section
- Contact system administrator

**Operational Questions:**
- Consult warehouse manager
- Review common workflows section
- Check with experienced users

**Feature Requests:**
- Document use case
- Explain business need
- Submit to development team

**Data Issues:**
- Verify Google Sheets format
- Check with data entry team
- Contact inventory manager

---

## Appendix: Keyboard Shortcuts

| Action | Mac | Windows |
|--------|-----|---------|
| Hard Refresh | Cmd + Shift + R | Ctrl + Shift + R |
| Copy | Cmd + C | Ctrl + C |
| Paste | Cmd + V | Ctrl + V |
| Select All | Cmd + A | Ctrl + A |
| Find | Cmd + F | Ctrl + F |
| Close Dialog | Esc | Esc |

---

## Appendix: API Rate Limits

**Google Sheets API Limits:**
- 100 requests per 100 seconds per user
- Dashboard uses ~1 request per manual refresh
- Automatic refresh disabled to conserve quota

**Best Practices:**
- Avoid rapid-fire refreshing
- Use cached data when possible
- Coordinate with team if multiple users

---

## Document Version

**Version:** 1.0
**Last Updated:** 2025-11-05
**Maintained By:** Development Team
**Review Cycle:** Quarterly or after major updates

---

*This SOP should be reviewed and updated regularly to reflect new features and process improvements.*
