import { InventoryStats } from "@shared/schema";
import StatsCard from "./StatsCard";
import { Package, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface DashboardStatsProps {
  stats: InventoryStats;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Total Devices"
        value={stats.totalDevices}
        icon={Package}
        description="All inventory items"
      />
      <StatsCard
        title="In Stock"
        value={stats.inStock}
        icon={CheckCircle}
        description="Available devices"
      />
      <StatsCard
        title="Low Stock"
        value={stats.lowStock}
        icon={AlertTriangle}
        description="Needs restocking"
      />
      <StatsCard
        title="Out of Stock"
        value={stats.outOfStock}
        icon={XCircle}
        description="Currently unavailable"
      />
    </div>
  );
}
