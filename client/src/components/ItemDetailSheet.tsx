import { InventoryItem } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ItemDetailSheetProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ItemDetailSheet({ item, open, onOpenChange }: ItemDetailSheetProps) {
  if (!item) return null;

  const getGradeBadgeVariant = (grade?: string) => {
    switch (grade?.toUpperCase()) {
      case 'A':
      case 'A+':
        return 'default';
      case 'B':
      case 'B+':
        return 'secondary';
      case 'C':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === undefined || value === null || value === '') return null;
    
    return (
      <div className="grid grid-cols-3 gap-4 py-3">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="col-span-2 text-sm" data-testid={`text-detail-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {label === 'Grade' && typeof value === 'string' ? (
            <Badge variant={getGradeBadgeVariant(value)}>{value}</Badge>
          ) : (
            value.toString()
          )}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto" data-testid="sheet-item-details">
        <SheetHeader>
          <SheetTitle data-testid="text-detail-title">
            {item.model || 'Device Details'}
          </SheetTitle>
          <SheetDescription>
            View complete information for this inventory item
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-1">
          <DetailRow label="IMEI" value={item.imei} />
          <Separator />
          <DetailRow label="Grade" value={item.grade} />
          <Separator />
          <DetailRow label="Model" value={item.model} />
          <Separator />
          <DetailRow label="Storage (GB)" value={item.gb} />
          <Separator />
          <DetailRow label="Color" value={item.color} />
          <Separator />
          <DetailRow label="Lock Status" value={item.lockStatus} />
          <Separator />
          <DetailRow label="Date" value={item.date} />
          <Separator />
          <DetailRow label="Concatenated Info" value={item.concat} />
          <Separator />
          <DetailRow label="Age" value={item.age} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
