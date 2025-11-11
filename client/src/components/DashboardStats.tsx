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
    const skuMap = new Map<string, { count: number; model: string; gb: string; color: string; imeis: string[] }>();

    // Store IMEIs for each category
    const gradeImeis = new Map<string, string[]>();
    const modelImeis = new Map<string, string[]>();
    const lockStatusImeis = new Map<string, string[]>();

    items.forEach(item => {
      if (item.grade) {
        gradeMap.set(item.grade, (gradeMap.get(item.grade) || 0) + 1);
        if (item.imei) {
          const imeis = gradeImeis.get(item.grade) || [];
          imeis.push(item.imei);
          gradeImeis.set(item.grade, imeis);
        }
      }
      if (item.model) {
        modelMap.set(item.model, (modelMap.get(item.model) || 0) + 1);
        if (item.imei) {
          const imeis = modelImeis.get(item.model) || [];
          imeis.push(item.imei);
          modelImeis.set(item.model, imeis);
        }
      }
      if (item.lockStatus) {
        lockStatusMap.set(item.lockStatus, (lockStatusMap.get(item.lockStatus) || 0) + 1);
        if (item.imei) {
          const imeis = lockStatusImeis.get(item.lockStatus) || [];
          imeis.push(item.imei);
          lockStatusImeis.set(item.lockStatus, imeis);
        }
      }

      const sku = `${item.model || 'Unknown'} ${item.gb || ''} ${item.color || ''}`.trim();
      if (sku && item.model && item.gb && item.color) {
        const existing = skuMap.get(sku);
        if (existing) {
          existing.count++;
          if (item.imei) existing.imeis.push(item.imei);
        } else {
          skuMap.set(sku, {
            count: 1,
            model: item.model,
            gb: item.gb,
            color: item.color,
            imeis: item.imei ? [item.imei] : []
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
    const allImeis = items.map(item => item.imei).filter(Boolean) as string[];

    return {
      totalDevices: items.length,
      allImeis,
      topGrade,
      topGradeImeis: topGrade ? gradeImeis.get(topGrade[0]) : undefined,
      topModel,
      topModelImeis: topModel ? modelImeis.get(topModel[0]) : undefined,
      topSKU,
      topSKUImeis: topSKU ? topSKU[1].imeis : undefined,
      unlockedCount,
      unlockedImeis: lockStatusImeis.get('UNLOCKED'),
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
        imeis={stats.allImeis}
      />
      <StatsCard
        title="Highest Stocked SKU"
        value={stats.topSKU ? `${stats.topSKU[1].model} ${stats.topSKU[1].gb}` : 'N/A'}
        icon={Box}
        description={stats.topSKU ? `${stats.topSKU[1].color} • ${stats.topSKU[1].count} units` : 'No data'}
        imeis={stats.topSKUImeis}
      />
      <StatsCard
        title="Top Model"
        value={stats.topModel ? stats.topModel[0] : 'N/A'}
        icon={Smartphone}
        description={stats.topModel ? `${stats.topModel[1]} units` : 'No data'}
        imeis={stats.topModelImeis}
      />
      <StatsCard
        title="Top Grade"
        value={stats.topGrade ? stats.topGrade[0] : 'N/A'}
        icon={Star}
        description={stats.topGrade ? `${stats.topGrade[1]} units` : 'No data'}
        imeis={stats.topGradeImeis}
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
        imeis={stats.unlockedImeis}
      />
    </div>
  );
});

DashboardStats.displayName = 'DashboardStats';

export default DashboardStats;
