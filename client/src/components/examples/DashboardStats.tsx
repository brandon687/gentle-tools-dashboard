import DashboardStats from "../DashboardStats";
import { InventoryStats } from "@shared/schema";

export default function DashboardStatsExample() {
  const mockStats: InventoryStats = {
    totalDevices: 250,
    byGrade: [
      { grade: "A", count: 120 },
      { grade: "B+", count: 80 },
      { grade: "A+", count: 50 },
    ],
    byModel: [
      { model: "iPhone 14 Pro", count: 85 },
      { model: "Galaxy S23", count: 65 },
    ],
    byLockStatus: [
      { status: "Unlocked", count: 180 },
      { status: "T-Mobile", count: 45 },
    ],
  };

  return (
    <div className="p-6">
      <DashboardStats stats={mockStats} />
    </div>
  );
}
