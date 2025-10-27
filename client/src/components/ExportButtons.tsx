import { InventoryItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { convertToCSV, downloadCSV as downloadCSVUtil } from "@/lib/exportUtils";

interface ExportButtonsProps {
  items: InventoryItem[];
}

export default function ExportButtons({ items }: ExportButtonsProps) {
  const { toast } = useToast();
  const [copiedState, setCopiedState] = useState(false);

  const downloadCSV = () => {
    downloadCSVUtil(items);
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
            Copy as CSV
          </>
        )}
      </Button>
    </div>
  );
}
