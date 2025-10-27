import { google } from 'googleapis';

const SPREADSHEET_ID = '1zTL8bsHN5PCJpOXFuN18sZMun3yEZoA8XlZJKg6IRhM';
const PHYSICAL_INVENTORY_SHEET = 'PHYSICAL INVENTORY';
const GRADED_TO_FALLOUT_SHEET = 'GRADED TO FALLOUT';

const FALLOUT_SPREADSHEET_ID = '11semAVf9ig-03kd5iDtqtcWA5Je0qkvUbpeDArMu93Y';
const FALLOUT_SHEET = 'DUMP';

export interface SheetRow {
  imei?: string;
  grade?: string;
  model?: string;
  gb?: string;
  color?: string;
  lockStatus?: string;
  date?: string;
  concat?: string;
  age?: string;
}

export interface InventoryDataResponse {
  physicalInventory: SheetRow[];
  gradedToFallout: SheetRow[];
  fallout: SheetRow[];
}

async function fetchSheetData(sheetName: string, apiKey: string): Promise<SheetRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:I`,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

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
      imei: getColumnValue(row, 'IMEI'),
      grade: getColumnValue(row, 'GRADE'),
      model: getColumnValue(row, 'MODEL'),
      gb: getColumnValue(row, 'GB'),
      color: getColumnValue(row, 'COLOR'),
      lockStatus: getColumnValue(row, 'LOCK STATUS'),
      date: getColumnValue(row, 'DATE'),
      concat: getColumnValue(row, 'CONCAT'),
      age: getColumnValue(row, 'AGE'),
    }));

    return inventoryItems.filter(item => item.imei);
  } catch (error: any) {
    console.error(`Error fetching ${sheetName} sheet data:`, error);
    throw new Error(`Failed to fetch ${sheetName} data: ${error.message}`);
  }
}

async function fetchFalloutData(apiKey: string): Promise<SheetRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: FALLOUT_SPREADSHEET_ID,
      range: `${FALLOUT_SHEET}!P3:X`,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return [];
    }

    // P3:X means columns P through X starting at row 3
    // Column indices (0-based within P:X range):
    // P=0, Q=1, R=2, S=3, T=4, U=5, V=6, W=7, X=8
    // Q (index 1) = grade (they call it "issue")
    // R (index 2) = model
    // We need to map the remaining columns based on the standard format

    const inventoryItems: SheetRow[] = rows.map((row) => {
      if (!row || row.length === 0) return null;
      
      // Extract values by column position in P:X range
      const imei = row[0] ? row[0].toString().trim() : undefined; // P
      const grade = row[1] ? row[1].toString().trim() : undefined; // Q (issue → grade)
      const model = row[2] ? row[2].toString().trim() : undefined; // R (model)
      const gb = row[3] ? row[3].toString().trim() : undefined; // S
      const color = row[4] ? row[4].toString().trim() : undefined; // T
      const lockStatus = row[5] ? row[5].toString().trim() : undefined; // U
      const date = row[6] ? row[6].toString().trim() : undefined; // V
      const concat = row[7] ? row[7].toString().trim() : undefined; // W
      const age = row[8] ? row[8].toString().trim() : undefined; // X

      return {
        imei,
        grade,
        model,
        gb,
        color,
        lockStatus,
        date,
        concat,
        age,
      };
    }).filter(item => item && item.imei) as SheetRow[];

    return inventoryItems;
  } catch (error: any) {
    console.error(`Error fetching Fallout sheet data:`, error);
    throw new Error(`Failed to fetch Fallout data: ${error.message}`);
  }
}

export async function fetchInventoryData(): Promise<InventoryDataResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  const [physicalInventory, gradedToFallout, fallout] = await Promise.all([
    fetchSheetData(PHYSICAL_INVENTORY_SHEET, apiKey),
    fetchSheetData(GRADED_TO_FALLOUT_SHEET, apiKey),
    fetchFalloutData(apiKey),
  ]);

  return {
    physicalInventory,
    gradedToFallout,
    fallout,
  };
}
