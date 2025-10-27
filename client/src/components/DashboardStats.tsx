import { InventoryStats } from "@shared/schema";
import StatsCard from "./StatsCard";
import { Package, Star, Smartphone, Lock } from "lucide-react";

interface DashboardStatsProps {
  stats: InventoryStats;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const topGrade = stats.byGrade[0];
  const topModel = stats.byModel[0];
  const unlockedCount = stats.byLockStatus.find(s => s.status.toLowerCase() === 'unlocked')?.count || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard
        title="Total Devices"
        value={stats.totalDevices}
        icon={Package}
        description="All inventory items"
      />
      <StatsCard
        title="Top Grade"
        value={topGrade ? `${topGrade.grade} (${topGrade.count})` : 'N/A'}
        icon={Star}
        description="Most common grade"
      />
      <StatsCard
        title="Top Model"
        value={topModel ? topModel.model : 'N/A'}
        icon={Smartphone}
        description={topModel ? `${topModel.count} units` : 'No data'}
      />
      <StatsCard
        title="Unlocked Devices"
        value={unlockedCount}
        icon={Lock}
        description="Ready for any carrier"
      />
    </div>
  );
}
