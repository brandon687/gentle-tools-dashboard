import { useMemo, memo } from "react";
import { InventoryItem } from "@shared/schema";
import StatsCard from "./StatsCard";
import { Package, Star, Smartphone, Lock, Box, Layers } from "lucide-react";

interface DashboardStatsProps {
  items: InventoryItem[];
}

const DashboardStats = memo(({ items }: DashboardStatsProps) => {
  const stats = useMemo(() => {
    const gradeMap = new Map<string, number>();
    const modelMap = new Map<string, number>();
    const lockStatusMap = new Map<string, number>();
    const skuMap = new Map<string, { count: number; model: string; gb: string; color: string }>();

    items.forEach(item => {
      if (item.grade) {
        gradeMap.set(item.grade, (gradeMap.get(item.grade) || 0) + 1);
      }
      if (item.model) {
        modelMap.set(item.model, (modelMap.get(item.model) || 0) + 1);
      }
      if (item.lockStatus) {
        lockStatusMap.set(item.lockStatus, (lockStatusMap.get(item.lockStatus) || 0) + 1);
      }
      
      const sku = `${item.model || 'Unknown'} ${item.gb || ''} ${item.color || ''}`.trim();
      if (sku && item.model && item.gb && item.color) {
        const existing = skuMap.get(sku);
        if (existing) {
          existing.count++;
        } else {
          skuMap.set(sku, {
            count: 1,
            model: item.model,
            gb: item.gb,
            color: item.color
          });
        }
      }
    });

    const topGrade = Array.from(gradeMap.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    const topModel = Array.from(modelMap.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    const topSKU = Array.from(skuMap.entries())
      .sort((a, b) => b[1].count - a[1].count)[0];
    
    const unlockedCount = lockStatusMap.get('UNLOCKED') || 0;
    const uniqueModels = modelMap.size;

    return {
      totalDevices: items.length,
      topGrade,
      topModel,
      topSKU,
      unlockedCount,
      uniqueModels,
    };
  }, [items]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatsCard
        title="Total Devices"
        value={stats.totalDevices}
        icon={Package}
        description="All inventory items"
      />
      <StatsCard
        title="Highest Stocked SKU"
        value={stats.topSKU ? `${stats.topSKU[1].model} ${stats.topSKU[1].gb}` : 'N/A'}
        icon={Box}
        description={stats.topSKU ? `${stats.topSKU[1].color} • ${stats.topSKU[1].count} units` : 'No data'}
      />
      <StatsCard
        title="Top Model"
        value={stats.topModel ? stats.topModel[0] : 'N/A'}
        icon={Smartphone}
        description={stats.topModel ? `${stats.topModel[1]} units` : 'No data'}
      />
      <StatsCard
        title="Top Grade"
        value={stats.topGrade ? stats.topGrade[0] : 'N/A'}
        icon={Star}
        description={stats.topGrade ? `${stats.topGrade[1]} units` : 'No data'}
      />
      <StatsCard
        title="Unique Models"
        value={stats.uniqueModels}
        icon={Layers}
        description="Different device models"
      />
      <StatsCard
        title="Unlocked Devices"
        value={stats.unlockedCount}
        icon={Lock}
        description="Ready for any carrier"
      />
    </div>
  );
});

DashboardStats.displayName = 'DashboardStats';

export default DashboardStats;
