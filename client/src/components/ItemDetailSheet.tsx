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

  const getStatusBadgeVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'in stock':
      case 'available':
        return 'default';
      case 'low stock':
        return 'secondary';
      case 'out of stock':
        return 'destructive';
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
          {label === 'Status' && typeof value === 'string' ? (
            <Badge variant={getStatusBadgeVariant(value)}>{value}</Badge>
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
            {item.deviceModel || 'Device Details'}
          </SheetTitle>
          <SheetDescription>
            View complete information for this inventory item
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-1">
          <DetailRow label="IMEI" value={item.imei} />
          <Separator />
          <DetailRow label="Device Model" value={item.deviceModel} />
          <Separator />
          <DetailRow label="Brand" value={item.brand} />
          <Separator />
          <DetailRow label="Status" value={item.status} />
          <Separator />
          <DetailRow label="Location" value={item.location} />
          <Separator />
          <DetailRow label="Condition" value={item.condition} />
          <Separator />
          <DetailRow label="Stock Level" value={item.stockLevel} />
          <Separator />
          <DetailRow label="Category" value={item.category} />
          <Separator />
          <DetailRow label="Serial Number" value={item.serialNumber} />
          <Separator />
          <DetailRow label="Purchase Date" value={item.purchaseDate} />
          <Separator />
          <DetailRow label="Price" value={item.price ? `$${item.price}` : undefined} />
          <Separator />
          <DetailRow label="Supplier" value={item.supplier} />
          <Separator />
          <DetailRow label="Notes" value={item.notes} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
