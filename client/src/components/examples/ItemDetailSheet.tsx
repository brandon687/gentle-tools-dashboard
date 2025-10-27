import { useState } from "react";
import ItemDetailSheet from "../ItemDetailSheet";
import { Button } from "@/components/ui/button";
import { InventoryItem } from "@shared/schema";

export default function ItemDetailSheetExample() {
  const [open, setOpen] = useState(false);

  const mockItem: InventoryItem = {
    id: "1",
    imei: "356938035643809",
    deviceModel: "iPhone 14 Pro",
    brand: "Apple",
    status: "In Stock",
    location: "Warehouse A",
    condition: "New",
    stockLevel: 15,
    category: "Smartphones",
    serialNumber: "F2LW3456789",
    purchaseDate: "2024-01-15",
    price: 999,
    supplier: "Tech Distributors Inc",
    notes: "Premium device with original packaging",
  };

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Open Detail Sheet</Button>
      <ItemDetailSheet item={mockItem} open={open} onOpenChange={setOpen} />
    </div>
  );
}
