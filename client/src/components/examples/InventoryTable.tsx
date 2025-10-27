import InventoryTable from "../InventoryTable";
import { InventoryItem } from "@shared/schema";

export default function InventoryTableExample() {
  const mockItems: InventoryItem[] = [
    {
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
    },
    {
      id: "2",
      imei: "356938035643810",
      grade: "B+",
      model: "iPhone 13",
      gb: "128GB",
      color: "Blue",
      lockStatus: "T-Mobile",
      date: "2024-02-20",
      concat: "iPhone 13 128GB Blue",
      age: "10 days",
    },
    {
      id: "3",
      imei: "356938035643811",
      grade: "A+",
      model: "Galaxy S23",
      gb: "512GB",
      color: "Phantom Black",
      lockStatus: "Unlocked",
      date: "2024-01-10",
      concat: "Galaxy S23 512GB Phantom Black",
      age: "50 days",
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
