import { InventoryItem } from "@shared/schema";

export const convertToCSV = (data: InventoryItem[]): string => {
  if (data.length === 0) return '';

  const headers = ['IMEI', 'MODEL', 'GB', 'COLOR', 'LOCK STATUS', 'GRADE'];
  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const row = [
      item.imei || '',
      item.model || '',
      item.gb || '',
      item.color || '',
      item.lockStatus || '',
      item.grade || '',
    ].map(field => {
      const escaped = String(field).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

export const downloadCSV = (items: InventoryItem[], filename?: string) => {
  const csv = convertToCSV(items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const defaultFilename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
