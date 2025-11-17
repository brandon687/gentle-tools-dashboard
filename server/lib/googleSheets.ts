import { google } from 'googleapis';

const SPREADSHEET_ID = '1CbvbPLJGllfGsb4LWR1RWFktzFGLr8nNanxCz2KrCvw';
const PHYSICAL_INVENTORY_SHEET = 'PHYSICAL INVENTORY';
const GRADED_TO_FALLOUT_SHEET = 'GRADED TO FALLOUT';
const OUTBOUND_IMEIS_SHEET = 'outbound IMEIs';

// Raw inventory from new Google Sheet
const RAW_INVENTORY_SPREADSHEET_ID = '1P7mchy-AJTYZoWggQhRJiPqNkIU2l_eOxmMhlvGzn5A';
const RAW_INVENTORY_SHEET = 'Dump';

export interface SheetRow {
  _row?: string;
  _fivetran_synced?: string;
  date?: string;
  price?: string;
  color?: string;
  grade?: string;
  imei?: string;
  model?: string;
  gb?: string;
  lockStatus?: string;
  age?: string;
}

export interface OutboundSheetRow {
  imei?: string;
  model?: string;
  capacity?: string;
  color?: string;
  lockStatus?: string;
  graded?: string;
  price?: string;
  updatedAt?: string;
  invno?: string;
  invtype?: string;
}

export interface RawInventoryRow {
  label?: string;
  imei?: string;
  model?: string;
  gb?: string;
  color?: string;
  lockStatus?: string;
  date?: string;
}

export interface InventoryDataResponse {
  physicalInventory: SheetRow[];
  gradedToFallout: SheetRow[];
  rawInventory?: RawInventoryRow[];
  outboundImeis?: OutboundSheetRow[];
}

async function fetchSheetData(sheetName: string, apiKey: string): Promise<SheetRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:K`,
    });

    const rows = response.data.values;

    if (!rows || rows.length < 3) {
      console.log(`[${sheetName}] Not enough rows, returning empty`);
      return [];
    }

    // Row 1 is Coefficient banner, Row 2 (index 1) has headers, data starts from row 3 (index 2)
    const headers = rows[1];
    const dataRows = rows.slice(2);

    console.log(`[${sheetName}] Headers:`, headers);
    console.log(`[${sheetName}] Processing ${dataRows.length} data rows`);

    const headerMap = new Map<string, number>();
    headers.forEach((header, index) => {
      const normalizedHeader = header.toString().trim().toUpperCase();
      headerMap.set(normalizedHeader, index);
    });

    const getColumnValue = (row: any[], columnName: string): string | undefined => {
      const index = headerMap.get(columnName);
      if (index === undefined) return undefined;
      const value = row[index];
      return value ? value.toString().trim() : undefined;
    };

    const inventoryItems: SheetRow[] = dataRows.map((row) => ({
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
      age: getColumnValue(row, 'AGE'),
    }));

    return inventoryItems.filter(item => item.imei);
  } catch (error: any) {
    console.error(`Error fetching ${sheetName} sheet data:`, error);
    throw new Error(`Failed to fetch ${sheetName} data: ${error.message}`);
  }
}

async function fetchOutboundSheetData(sheetName: string, apiKey: string): Promise<OutboundSheetRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  try {
    // Limit to first 100000 rows to capture last 3 weeks of data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:J100000`,
    });

    const rows = response.data.values;

    console.log(`[${sheetName}] Fetched ${rows?.length || 0} total rows from sheet`);

    if (!rows || rows.length < 3) {
      console.log(`[${sheetName}] Not enough rows, returning empty`);
      return [];
    }

    // Row 1 is Coefficient banner, Row 2 (index 1) has headers, data starts from row 3 (index 2)
    const headers = rows[1];
    const dataRows = rows.slice(2);

    console.log(`[${sheetName}] Headers:`, headers);
    console.log(`[${sheetName}] Processing ${dataRows.length} data rows`);

    const headerMap = new Map<string, number>();
    headers.forEach((header, index) => {
      const normalizedHeader = header.toString().trim().toLowerCase();
      headerMap.set(normalizedHeader, index);
    });

    const getColumnValue = (row: any[], columnName: string): string | undefined => {
      const index = headerMap.get(columnName);
      if (index === undefined) return undefined;
      const value = row[index];
      return value ? value.toString().trim() : undefined;
    };

    // Process in chunks to avoid stack overflow with large datasets
    const outboundItems: OutboundSheetRow[] = [];
    const CHUNK_SIZE = 1000;

    for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
      const chunk = dataRows.slice(i, i + CHUNK_SIZE);
      const processedChunk = chunk.map((row) => ({
        imei: getColumnValue(row, 'imei'),
        model: getColumnValue(row, 'model'),
        capacity: getColumnValue(row, 'capacity'),
        color: getColumnValue(row, 'color'),
        lockStatus: getColumnValue(row, 'lock_status'),
        graded: getColumnValue(row, 'graded'),
        price: getColumnValue(row, 'price'),
        updatedAt: getColumnValue(row, 'updated_at'),
        invno: getColumnValue(row, 'invno'),
        invtype: getColumnValue(row, 'invtype'),
      })).filter(item => item.imei);

      outboundItems.push(...processedChunk);

      if (i % 5000 === 0 && i > 0) {
        console.log(`[${sheetName}] Processed ${i} rows so far...`);
      }
    }

    console.log(`[${sheetName}] Final count: ${outboundItems.length} items with valid IMEIs`);
    return outboundItems;
  } catch (error: any) {
    console.error(`Error fetching ${sheetName} sheet data:`, error);
    throw new Error(`Failed to fetch ${sheetName} data: ${error.message}`);
  }
}

async function fetchRawInventoryData(apiKey: string): Promise<RawInventoryRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: RAW_INVENTORY_SPREADSHEET_ID,
      range: `${RAW_INVENTORY_SHEET}!A:G`,
    });

    const rows = response.data.values;

    console.log(`[${RAW_INVENTORY_SHEET}] Fetched ${rows?.length || 0} total rows from sheet`);

    if (!rows || rows.length < 3) {
      console.log(`[${RAW_INVENTORY_SHEET}] Not enough rows, returning empty`);
      return [];
    }

    // Row 1 is count statement (ignore), Row 2 (index 1) has headers, data starts from row 3 (index 2)
    const headers = rows[1];
    const dataRows = rows.slice(2);

    console.log(`[${RAW_INVENTORY_SHEET}] Headers:`, headers);
    console.log(`[${RAW_INVENTORY_SHEET}] Processing ${dataRows.length} data rows`);

    const headerMap = new Map<string, number>();
    headers.forEach((header, index) => {
      const normalizedHeader = header.toString().trim().toUpperCase();
      headerMap.set(normalizedHeader, index);
    });

    const getColumnValue = (row: any[], columnName: string): string | undefined => {
      const index = headerMap.get(columnName);
      if (index === undefined) return undefined;
      const value = row[index];
      return value ? value.toString().trim() : undefined;
    };

    const rawInventoryItems: RawInventoryRow[] = dataRows.map((row) => ({
      label: getColumnValue(row, 'LABEL'),
      imei: getColumnValue(row, 'IMEI'),
      model: getColumnValue(row, 'MODEL'),
      gb: getColumnValue(row, 'GB'),
      color: getColumnValue(row, 'COLOR'),
      lockStatus: getColumnValue(row, 'LOCK STATUS'),
      date: getColumnValue(row, 'DATE'),
    }));

    // Filter out items without IMEIs
    const validItems = rawInventoryItems.filter(item => item.imei);
    console.log(`[${RAW_INVENTORY_SHEET}] Final count: ${validItems.length} items with valid IMEIs`);

    return validItems;
  } catch (error: any) {
    console.error(`Error fetching ${RAW_INVENTORY_SHEET} sheet data:`, error);
    throw new Error(`Failed to fetch ${RAW_INVENTORY_SHEET} data: ${error.message}`);
  }
}

export async function fetchInventoryData(): Promise<InventoryDataResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  const [physicalInventory, rawInventory] = await Promise.all([
    fetchSheetData(PHYSICAL_INVENTORY_SHEET, apiKey),
    fetchRawInventoryData(apiKey),
  ]);

  return {
    physicalInventory,
    gradedToFallout: [], // Not using this sheet for now
    rawInventory,
  };
}

export async function fetchOutboundData(): Promise<OutboundSheetRow[]> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  return await fetchOutboundSheetData(OUTBOUND_IMEIS_SHEET, apiKey);
}
