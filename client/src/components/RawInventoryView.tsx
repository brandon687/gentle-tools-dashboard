import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  totalDevices: number;
  masterCartons: MasterCartonGroup[];
}

export default function RawInventoryView({ items }: RawInventoryViewProps) {
  const [expandedModelGB, setExpandedModelGB] = useState<Set<string>>(new Set());
  const [expandedCartons, setExpandedCartons] = useState<Set<string>>(new Set());

  // Group items: Model+GB -> Master Carton -> Items
  const groupedData = useMemo(() => {
    const groups: ModelGBGroup[] = [];

    items.forEach((item) => {
      const model = item.model || 'Unknown Model';
      const gb = item.gb || '';
      const masterCarton = item.concat || 'No Label';

      const modelGBKey = `${model}|${gb}`;
      let group = groups.find(g => `${g.model}|${g.gb}` === modelGBKey);

      if (!group) {
        group = {
          model,
          gb,
          totalDevices: 0,
          masterCartons: [],
        };
        groups.push(group);
      }

      let carton = group.masterCartons.find(c => c.label === masterCarton);
      if (!carton) {
        carton = {
          label: masterCarton,
          items: [],
        };
        group.masterCartons.push(carton);
      }

      carton.items.push(item);
      group.totalDevices++;
    });

    // Sort by model name
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

  return (
    <div className="space-y-3">
      {groupedData.map((group) => {
        const modelGBKey = `${group.model}|${group.gb}`;
        const isExpanded = expandedModelGB.has(modelGBKey);

        return (
          <Card key={modelGBKey} className="overflow-hidden">
            {/* Level 1: Model + GB */}
            <button
              onClick={() => toggleModelGB(modelGBKey)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {isExpanded ? (
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
                    {group.masterCartons.length} master carton{group.masterCartons.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1 flex-shrink-0">
                {group.totalDevices}
              </Badge>
            </button>

            {/* Level 2: Master Cartons List */}
            {isExpanded && (
              <div className="border-t bg-muted/10">
                {group.masterCartons.map((carton) => {
                  const cartonKey = `${modelGBKey}|${carton.label}`;
                  const isCartonExpanded = expandedCartons.has(cartonKey);

                  return (
                    <div key={cartonKey} className="border-b last:border-b-0">
                      <button
                        onClick={() => toggleCarton(cartonKey)}
                        className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
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

                      {/* Level 3: Device Details Table (like physical inventory) */}
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
