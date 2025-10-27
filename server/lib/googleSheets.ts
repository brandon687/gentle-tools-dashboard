import { google } from 'googleapis';

const SPREADSHEET_ID = '1zTL8bsHN5PCJpOXFuN18sZMun3yEZoA8XlZJKg6IRhM';
const SHEET_NAME = 'PHYSICAL INVENTORY';

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

export async function fetchInventoryData(): Promise<SheetRow[]> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_SHEETS_API_KEY is not configured');
  }

  const sheets = google.sheets({ version: 'v4', auth: apiKey });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:I`,
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
    console.error('Error fetching Google Sheets data:', error);
    throw new Error(`Failed to fetch inventory data: ${error.message}`);
  }
}
