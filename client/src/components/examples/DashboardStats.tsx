import DashboardStats from "../DashboardStats";
import { InventoryStats } from "@shared/schema";

export default function DashboardStatsExample() {
  const mockStats: InventoryStats = {
    totalDevices: 250,
    inStock: 198,
    lowStock: 32,
    outOfStock: 20,
    categories: [],
  };

  return (
    <div className="p-6">
      <DashboardStats stats={mockStats} />
    </div>
  );
}
