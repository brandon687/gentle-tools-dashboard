import InventoryTable from "../InventoryTable";
import { InventoryItem } from "@shared/schema";

export default function InventoryTableExample() {
  const mockItems: InventoryItem[] = [
    {
      id: "1",
      imei: "356938035643809",
      deviceModel: "iPhone 14 Pro",
      brand: "Apple",
      status: "In Stock",
      location: "Warehouse A",
      condition: "New",
      stockLevel: 15,
    },
    {
      id: "2",
      imei: "356938035643810",
      deviceModel: "Galaxy S23",
      brand: "Samsung",
      status: "Low Stock",
      location: "Warehouse B",
      condition: "New",
      stockLevel: 3,
    },
  ];

  const handleViewDetails = (item: InventoryItem) => {
    console.log("View details for:", item);
  };

  return (
    <div className="p-6">
      <InventoryTable items={mockItems} onViewDetails={handleViewDetails} />
    </div>
  );
}
