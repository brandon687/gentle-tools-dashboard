import { google } from 'googleapis';

const SPREADSHEET_ID = '1zTL8bsHN5PCJpOXFuN18sZMun3yEZoA8XlZJKg6IRhM';
const PHYSICAL_INVENTORY_SHEET = 'PHYSICAL INVENTORY';
const GRADED_TO_FALLOUT_SHEET = 'GRADED TO FALLOUT';

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

export interface InventoryDataResponse {
  physicalInventory: SheetRow[];
  gradedToFallout: SheetRow[];
}

async function fetchSheetData(sheetName: string, apiKey: string): Promise<SheetRow[]> {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:K`,
    });

    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return [];
    }

    // Headers are in row 1 (index 0), data starts from row 2 (index 1)
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
      date: getColumnValue(row, 'DATE'),
      price: getColumnValue(row, 'PRICE'),
      color: getColumnValue(row, 'COLOR'),
      grade: getColumnValue(row, 'GRADE'),
      imei: getColumnValue(row, 'IMEI'),
      model: getColumnValue(row, 'MODEL'),
      gb: getColumnValue(row, 'GB'),
      lockStatus: getColumnValue(row, 'LOCK STATUS'),
      age: getColumnValue(row, 'AGE'),
    }));

    return inventoryItems.filter(item => item.imei);
  } catch (error: any) {
    console.error(`Error fetching ${sheetName} sheet data:`, error);
    throw new Error(`Failed to fetch ${sheetName} data: ${error.message}`);
  }
}

export async function fetchInventoryData(): Promise<InventoryDataResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  const [physicalInventory, gradedToFallout] = await Promise.all([
    fetchSheetData(PHYSICAL_INVENTORY_SHEET, apiKey),
    fetchSheetData(GRADED_TO_FALLOUT_SHEET, apiKey),
  ]);

  return {
    physicalInventory,
    gradedToFallout,
  };
}
