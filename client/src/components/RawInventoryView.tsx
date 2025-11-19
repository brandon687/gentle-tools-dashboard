import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Package, Box, Tag } from "lucide-react";
import { InventoryItem } from "@shared/schema";

interface RawInventoryViewProps {
  items: InventoryItem[];
}

interface MasterCartonGroup {
  label: string;
  items: InventoryItem[];
}

interface SupplierGradeGroup {
  supplier: string;
  grade: string;
  totalDevices: number;
  masterCartons: MasterCartonGroup[];
}

interface ModelGBGroup {
  model: string;
  gb: string;
  totalDevices: number;
  supplierGradeGroups: SupplierGradeGroup[];
}

export default function RawInventoryView({ items }: RawInventoryViewProps) {
  const [expandedModelGB, setExpandedModelGB] = useState<Set<string>>(new Set());
  const [expandedSupplierGrade, setExpandedSupplierGrade] = useState<Set<string>>(new Set());
  const [expandedCartons, setExpandedCartons] = useState<Set<string>>(new Set());
  const [expandedSummaryCards, setExpandedSummaryCards] = useState<Set<string>>(new Set());

  // Group items: Model+GB -> Supplier+Grade -> Master Carton -> Items
  const groupedData = useMemo(() => {
    const groups: ModelGBGroup[] = [];

    items.forEach((item) => {
      const model = item.model || 'Unknown Model';
      const gb = item.gb || '';
      const supplier = item.age || 'Unknown Supplier'; // age field stores supplier
      const grade = item.grade || 'Unknown Grade';
      const masterCarton = item.concat || 'No Label';

      // Find or create Model+GB group
      const modelGBKey = `${model}|${gb}`;
      let group = groups.find(g => `${g.model}|${g.gb}` === modelGBKey);

      if (!group) {
        group = {
          model,
          gb,
          totalDevices: 0,
          supplierGradeGroups: [],
        };
        groups.push(group);
      }

      // Find or create Supplier+Grade group within Model+GB
      const supplierGradeKey = `${supplier}|${grade}`;
      let supplierGradeGroup = group.supplierGradeGroups.find(
        sg => `${sg.supplier}|${sg.grade}` === supplierGradeKey
      );

      if (!supplierGradeGroup) {
        supplierGradeGroup = {
          supplier,
          grade,
          totalDevices: 0,
          masterCartons: [],
        };
        group.supplierGradeGroups.push(supplierGradeGroup);
      }

      // Find or create Master Carton within Supplier+Grade group
      let carton = supplierGradeGroup.masterCartons.find(c => c.label === masterCarton);
      if (!carton) {
        carton = {
          label: masterCarton,
          items: [],
        };
        supplierGradeGroup.masterCartons.push(carton);
      }

      carton.items.push(item);
      supplierGradeGroup.totalDevices++;
      group.totalDevices++;
    });

    // Sort by model name and gb
    groups.forEach(group => {
      // Sort supplier+grade groups by grade then supplier
      const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'FALLOUT', 'Unknown Grade'];
      group.supplierGradeGroups.sort((a, b) => {
        const aGradeIdx = gradeOrder.indexOf(a.grade);
        const bGradeIdx = gradeOrder.indexOf(b.grade);
        if (aGradeIdx !== bGradeIdx) return aGradeIdx - bGradeIdx;
        return a.supplier.localeCompare(b.supplier);
      });
    });

    return groups.sort((a, b) => {
      const modelCompare = a.model.localeCompare(b.model);
      if (modelCompare !== 0) return modelCompare;
      return parseInt(a.gb) - parseInt(b.gb);
    });
  }, [items]);

  const toggleModelGB = (key: string) => {
    setExpandedModelGB(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSupplierGrade = (key: string) => {
    setExpandedSupplierGrade(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleCarton = (key: string) => {
    setExpandedCartons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSummaryCard = (key: string) => {
    setExpandedSummaryCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Calculate summary statistics by Supplier + Grade across all models
  const supplierGradeSummary = useMemo(() => {
    const summaryMap = new Map<string, {
      supplier: string;
      grade: string;
      deviceCount: number;
      cartonCount: number;
      modelBreakdown: Array<{
        model: string;
        gb: string;
        deviceCount: number;
        masterCartons: MasterCartonGroup[];
      }>;
    }>();

    groupedData.forEach((group) => {
      group.supplierGradeGroups.forEach((sg) => {
        const key = `${sg.supplier}|${sg.grade}`;
        const existing = summaryMap.get(key);

        if (existing) {
          existing.deviceCount += sg.totalDevices;
          existing.cartonCount += sg.masterCartons.length;
          existing.modelBreakdown.push({
            model: group.model,
            gb: group.gb,
            deviceCount: sg.totalDevices,
            masterCartons: sg.masterCartons,
          });
        } else {
          summaryMap.set(key, {
            supplier: sg.supplier,
            grade: sg.grade,
            deviceCount: sg.totalDevices,
            cartonCount: sg.masterCartons.length,
            modelBreakdown: [{
              model: group.model,
              gb: group.gb,
              deviceCount: sg.totalDevices,
              masterCartons: sg.masterCartons,
            }],
          });
        }
      });
    });

    // Sort by grade order, then supplier
    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'FALLOUT', 'Unknown Grade'];
    return Array.from(summaryMap.values()).sort((a, b) => {
      const aGradeIdx = gradeOrder.indexOf(a.grade);
      const bGradeIdx = gradeOrder.indexOf(b.grade);
      if (aGradeIdx !== bGradeIdx) return aGradeIdx - bGradeIdx;
      return a.supplier.localeCompare(b.supplier);
    });
  }, [groupedData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards: Supplier + Grade Overview */}
      {supplierGradeSummary.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            INVENTORY BY SUPPLIER & GRADE
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {supplierGradeSummary.map((summary) => {
              const summaryKey = `${summary.supplier}|${summary.grade}`;
              const isExpanded = expandedSummaryCards.has(summaryKey);

              return (
                <Card key={summaryKey} className="overflow-hidden">
                  <button
                    onClick={() => toggleSummaryCard(summaryKey)}
                    className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Badge variant="default" className="font-semibold">
                          {summary.grade}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm truncate">
                        {summary.supplier}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{summary.cartonCount} cartons</span>
                        <Badge variant="secondary" className="text-xs px-2 py-0">
                          {summary.deviceCount}
                        </Badge>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content: Model+GB and Master Cartons */}
                  {isExpanded && (
                    <div className="border-t bg-muted/10 p-3 space-y-2">
                      {summary.modelBreakdown.map((modelData) => (
                        <div key={`${summaryKey}|${modelData.model}|${modelData.gb}`} className="space-y-1">
                          {/* Model + GB Header */}
                          <div className="flex items-center justify-between px-2 py-1 bg-background rounded">
                            <div className="flex items-center gap-2">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="font-semibold text-xs">
                                {modelData.model} {modelData.gb}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              {modelData.deviceCount}
                            </Badge>
                          </div>

                          {/* Master Cartons List */}
                          <div className="pl-6 space-y-1">
                            {modelData.masterCartons.map((carton) => (
                              <div
                                key={`${summaryKey}|${modelData.model}|${modelData.gb}|${carton.label}`}
                                className="flex items-center justify-between px-2 py-1 text-xs bg-background/50 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <Box className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-mono font-medium">
                                    {carton.label}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">
                                  {carton.items.length}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Breakdown by Model */}
      <div className="space-y-3">
        {groupedData.map((group) => {
        const modelGBKey = `${group.model}|${group.gb}`;
        const isModelGBExpanded = expandedModelGB.has(modelGBKey);

        // Calculate total master cartons across all supplier+grade groups
        const totalMasterCartons = group.supplierGradeGroups.reduce(
          (sum, sg) => sum + sg.masterCartons.length,
          0
        );

        return (
          <Card key={modelGBKey} className="overflow-hidden">
            {/* Level 1: Model + GB */}
            <button
              onClick={() => toggleModelGB(modelGBKey)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {isModelGBExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <Package className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="text-left">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-lg">{group.model} {group.gb}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalMasterCartons} master carton{totalMasterCartons !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1 flex-shrink-0">
                {group.totalDevices}
              </Badge>
            </button>

            {/* Level 2: Supplier + Grade Groups */}
            {isModelGBExpanded && (
              <div className="border-t bg-muted/10">
                {group.supplierGradeGroups.map((supplierGrade) => {
                  const supplierGradeKey = `${modelGBKey}|${supplierGrade.supplier}|${supplierGrade.grade}`;
                  const isSupplierGradeExpanded = expandedSupplierGrade.has(supplierGradeKey);

                  return (
                    <div key={supplierGradeKey} className="border-b last:border-b-0">
                      <button
                        onClick={() => toggleSupplierGrade(supplierGradeKey)}
                        className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isSupplierGradeExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {supplierGrade.supplier}
                            </span>
                            <Badge variant="default" className="font-semibold">
                              {supplierGrade.grade}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">
                            {supplierGrade.masterCartons.length} carton{supplierGrade.masterCartons.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-sm px-3 py-1">
                          {supplierGrade.totalDevices}
                        </Badge>
                      </button>

                      {/* Level 3: Master Cartons List */}
                      {isSupplierGradeExpanded && (
                        <div className="bg-muted/20 border-t">
                          {supplierGrade.masterCartons.map((carton) => {
                            const cartonKey = `${supplierGradeKey}|${carton.label}`;
                            const isCartonExpanded = expandedCartons.has(cartonKey);

                            return (
                              <div key={cartonKey} className="border-b last:border-b-0">
                                <button
                                  onClick={() => toggleCarton(cartonKey)}
                                  className="w-full px-8 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {isCartonExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="font-mono text-sm font-semibold">
                                      {carton.label}
                                    </span>
                                  </div>
                                  <Badge variant="secondary" className="text-sm px-3 py-1">
                                    {carton.items.length}
                                  </Badge>
                                </button>

                                {/* Level 4: Device Details Table */}
                                {isCartonExpanded && (
                                  <div className="bg-background">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead className="bg-muted/50 border-y">
                                          <tr>
                                            <th className="px-4 py-3 text-left font-semibold">IMEI</th>
                                            <th className="px-4 py-3 text-left font-semibold">MODEL</th>
                                            <th className="px-4 py-3 text-left font-semibold">GB</th>
                                            <th className="px-4 py-3 text-left font-semibold">COLOR</th>
                                            <th className="px-4 py-3 text-left font-semibold">LOCK STATUS</th>
                                            <th className="px-4 py-3 text-left font-semibold">GRADE</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {carton.items.map((item, idx) => (
                                            <tr
                                              key={`${item.imei}-${idx}`}
                                              className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                                            >
                                              <td className="px-4 py-3 font-mono text-xs">
                                                {item.imei || 'No IMEI'}
                                              </td>
                                              <td className="px-4 py-3">
                                                {item.model || '-'}
                                              </td>
                                              <td className="px-4 py-3">
                                                {item.gb || '-'}
                                              </td>
                                              <td className="px-4 py-3 font-medium">
                                                {item.color || 'Unknown'}
                                              </td>
                                              <td className="px-4 py-3">
                                                {item.lockStatus || '-'}
                                              </td>
                                              <td className="px-4 py-3">
                                                {item.grade ? (
                                                  <Badge variant="outline" className="text-xs">
                                                    {item.grade}
                                                  </Badge>
                                                ) : (
                                                  '-'
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

        {groupedData.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No raw inventory items found
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
