import { useState } from "react";
import ItemDetailSheet from "../ItemDetailSheet";
import { Button } from "@/components/ui/button";
import { InventoryItem } from "@shared/schema";

export default function ItemDetailSheetExample() {
  const [open, setOpen] = useState(false);

  const mockItem: InventoryItem = {
    id: "1",
    imei: "356938035643809",
    grade: "A",
    model: "iPhone 14 Pro",
    gb: "256GB",
    color: "Space Black",
    lockStatus: "Unlocked",
    date: "2024-01-15",
    concat: "iPhone 14 Pro 256GB Space Black",
    age: "45 days",
  };

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Open Detail Sheet</Button>
      <ItemDetailSheet item={mockItem} open={open} onOpenChange={setOpen} />
    </div>
  );
}
