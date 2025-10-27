import { InventoryItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ExportButtonsProps {
  items: InventoryItem[];
}

export default function ExportButtons({ items }: ExportButtonsProps) {
  const { toast } = useToast();
  const [copiedState, setCopiedState] = useState(false);

  const convertToCSV = (data: InventoryItem[]): string => {
    if (data.length === 0) return '';

    const headers = ['IMEI', 'Grade', 'Model', 'GB', 'Color', 'Lock Status', 'Date', 'Concat', 'Age'];
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const row = [
        item.imei || '',
        item.grade || '',
        item.model || '',
        item.gb || '',
        item.color || '',
        item.lockStatus || '',
        item.date || '',
        item.concat || '',
        item.age || '',
      ].map(field => `"${field}"`);
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const downloadCSV = () => {
    const csv = convertToCSV(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV Downloaded",
      description: `${items.length} items exported successfully.`,
    });
  };

  const copyToClipboard = async () => {
    const csv = convertToCSV(items);
    try {
      await navigator.clipboard.writeText(csv);
      setCopiedState(true);
      toast({
        title: "Copied!",
        description: `${items.length} items copied as CSV to clipboard.`,
      });
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={downloadCSV}
        disabled={items.length === 0}
        data-testid="button-export-csv"
      >
        <Download className="w-4 h-4 mr-2" />
        Download CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={copyToClipboard}
        disabled={items.length === 0}
        data-testid="button-copy-csv"
      >
        {copiedState ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Copy CSV
          </>
        )}
      </Button>
    </div>
  );
}
