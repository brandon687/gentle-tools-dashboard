import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Package, Box } from "lucide-react";
import { InventoryItem } from "@shared/schema";

interface RawInventoryViewProps {
  items: InventoryItem[];
}

interface MasterCartonGroup {
  label: string;
  items: InventoryItem[];
}

interface ModelGBGroup {
  model: string;
  gb: string;
  grade: string;
  count: number;
  masterCartons: MasterCartonGroup[];
}

export default function RawInventoryView({ items }: RawInventoryViewProps) {
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedCartons, setExpandedCartons] = useState<Set<string>>(new Set());

  // Group items: Grade -> Model+GB -> Master Carton -> Items
  const groupedData = useMemo(() => {
    const gradeMap = new Map<string, ModelGBGroup[]>();

    items.forEach((item) => {
      const grade = item.grade || 'Unknown';
      const model = item.model || 'Unknown Model';
      const gb = item.gb || '';
      const masterCarton = item.concat || 'No Label';

      if (!gradeMap.has(grade)) {
        gradeMap.set(grade, []);
      }

      const gradeGroups = gradeMap.get(grade)!;
      const modelGBKey = `${model}|${gb}`;

      let modelGBGroup = gradeGroups.find(g => `${g.model}|${g.gb}` === modelGBKey);

      if (!modelGBGroup) {
        modelGBGroup = {
          model,
          gb,
          grade,
          count: 0,
          masterCartons: [],
        };
        gradeGroups.push(modelGBGroup);
      }

      let cartonGroup = modelGBGroup.masterCartons.find(c => c.label === masterCarton);

      if (!cartonGroup) {
        cartonGroup = {
          label: masterCarton,
          items: [],
        };
        modelGBGroup.masterCartons.push(cartonGroup);
      }

      cartonGroup.items.push(item);
      modelGBGroup.count++;
    });

    // Sort grades by typical hierarchy
    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'FALLOUT'];
    return Array.from(gradeMap.entries())
      .sort(([a], [b]) => {
        const aIndex = gradeOrder.indexOf(a);
        const bIndex = gradeOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, [items]);

  const toggleGrade = (gradeKey: string) => {
    setExpandedGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gradeKey)) {
        newSet.delete(gradeKey);
      } else {
        newSet.add(gradeKey);
      }
      return newSet;
    });
  };

  const toggleCarton = (cartonKey: string) => {
    setExpandedCartons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cartonKey)) {
        newSet.delete(cartonKey);
      } else {
        newSet.add(cartonKey);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {groupedData.map(([grade, modelGBGroups]) => {
        const totalCount = modelGBGroups.reduce((sum, g) => sum + g.count, 0);

        return (
          <Card key={grade} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold">{grade}</h3>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {totalCount.toLocaleString()} devices
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {modelGBGroups.map((group) => {
                const gradeKey = `${grade}|${group.model}|${group.gb}`;
                const isExpanded = expandedGrades.has(gradeKey);

                return (
                  <div key={gradeKey} className="border rounded-lg">
                    {/* Level 1: Model + GB Card */}
                    <button
                      onClick={() => toggleGrade(gradeKey)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left">
                          <p className="font-semibold text-base">
                            {group.model} {group.gb}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {group.masterCartons.length} master carton{group.masterCartons.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {group.count}
                      </Badge>
                    </button>

                    {/* Level 2: Master Cartons */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 px-4 py-2 space-y-2">
                        {group.masterCartons.map((carton) => {
                          const cartonKey = `${gradeKey}|${carton.label}`;
                          const isCartonExpanded = expandedCartons.has(cartonKey);

                          return (
                            <div key={cartonKey} className="border rounded bg-background">
                              <button
                                onClick={() => toggleCarton(cartonKey)}
                                className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {isCartonExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Box className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-mono text-sm font-medium">
                                    {carton.label}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="text-sm">
                                  {carton.items.length}
                                </Badge>
                              </button>

                              {/* Level 3: Individual Items (Color + IMEI) */}
                              {isCartonExpanded && (
                                <div className="border-t px-3 py-2 space-y-1 bg-muted/10">
                                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                                    {carton.items.map((item, idx) => (
                                      <div
                                        key={`${item.imei}-${idx}`}
                                        className="p-2 bg-background border rounded text-xs"
                                      >
                                        <div className="font-medium text-primary">
                                          {item.color || 'Unknown Color'}
                                        </div>
                                        <div className="font-mono text-muted-foreground mt-1">
                                          {item.imei || 'No IMEI'}
                                        </div>
                                        {item.lockStatus && (
                                          <div className="text-muted-foreground mt-1">
                                            {item.lockStatus}
                                          </div>
                                        )}
                                      </div>
                                    ))}
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
            </CardContent>
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
  );
}
