import { useState, useMemo, memo } from "react";
import { InventoryItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy, Check, Download, ArrowDownWideNarrow, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/exportUtils";
import { sortModelsByHierarchy, sortGBOptions, sortColors, sortByLockStatus } from "@/lib/modelSorting";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PivotViewProps {
  items: InventoryItem[];
  onViewDetails: (item: InventoryItem) => void;
}

interface ModelData {
  model: string;
  totalDevices: number;
  items: InventoryItem[];
  gbGroups: { [gb: string]: GBData };
}

interface GBData {
  gb: string;
  totalDevices: number;
  items: InventoryItem[];
  colorGroups: { [color: string]: ColorData };
}

interface ColorData {
  color: string;
  totalDevices: number;
  items: InventoryItem[];
}

const PivotView = memo(({ items }: PivotViewProps) => {
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [expandedGB, setExpandedGB] = useState<Set<string>>(new Set());
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'quantity' | 'release'>('release');
  const { toast } = useToast();

  // Separate grouping from sorting for performance - only rebuild when items change
  const groupedModels = useMemo(() => {
    const models: { [key: string]: ModelData } = {};
    
    items.forEach(item => {
      const model = item.model || 'Unknown';
      const gb = item.gb || 'Unknown';
      const color = item.color || 'Unknown';
      
      if (!models[model]) {
        models[model] = {
          model,
          totalDevices: 0,
          items: [],
          gbGroups: {}
        };
      }
      
      models[model].totalDevices++;
      models[model].items.push(item);
      
      if (!models[model].gbGroups[gb]) {
        models[model].gbGroups[gb] = {
          gb,
          totalDevices: 0,
          items: [],
          colorGroups: {}
        };
      }
      
      models[model].gbGroups[gb].totalDevices++;
      models[model].gbGroups[gb].items.push(item);
      
      if (!models[model].gbGroups[gb].colorGroups[color]) {
        models[model].gbGroups[gb].colorGroups[color] = {
          color,
          totalDevices: 0,
          items: []
        };
      }
      
      models[model].gbGroups[gb].colorGroups[color].totalDevices++;
      models[model].gbGroups[gb].colorGroups[color].items.push(item);
    });
    
    // Sort items by lock status (UNLOCKED first) in all groups
    Object.values(models).forEach(modelGroup => {
      modelGroup.items = sortByLockStatus(modelGroup.items);
      Object.values(modelGroup.gbGroups).forEach(gbGroup => {
        gbGroup.items = sortByLockStatus(gbGroup.items);
        Object.values(gbGroup.colorGroups).forEach(colorGroup => {
          colorGroup.items = sortByLockStatus(colorGroup.items);
        });
      });
    });
    
    return Object.values(models);
  }, [items]);
  
  // Apply sorting separately - cheap operation that doesn't rebuild data structures
  const modelData = useMemo(() => {
    if (sortMode === 'quantity') {
      return [...groupedModels].sort((a, b) => b.totalDevices - a.totalDevices);
    } else {
      return [...groupedModels].sort((a, b) => sortModelsByHierarchy(a.model, b.model));
    }
  }, [groupedModels, sortMode]);

  const toggleModel = (model: string) => {
    setExpandedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(model)) {
        newSet.delete(model);
      } else {
        newSet.add(model);
      }
      return newSet;
    });
  };

  const toggleGB = (modelGbKey: string) => {
    setExpandedGB(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelGbKey)) {
        newSet.delete(modelGbKey);
      } else {
        newSet.add(modelGbKey);
      }
      return newSet;
    });
  };

  const toggleColor = (colorKey: string) => {
    setExpandedColors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(colorKey)) {
        newSet.delete(colorKey);
      } else {
        newSet.add(colorKey);
      }
      return newSet;
    });
  };

  const copyIMEIsToClipboard = async (items: InventoryItem[], groupKey: string) => {
    const imeis = items
      .map(item => item.imei)
      .filter(imei => imei)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(imeis);
      setCopiedGroup(groupKey);
      toast({
        title: "IMEIs Copied!",
        description: `${items.length} IMEI(s) copied to clipboard.`,
      });
      setTimeout(() => setCopiedGroup(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please try again or copy manually.",
        variant: "destructive",
      });
    }
  };

  const downloadFullData = (items: InventoryItem[], filename: string) => {
    downloadCSV(items, filename);
    toast({
      title: "CSV Downloaded",
      description: `${items.length} device(s) exported successfully.`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
          <Tabs value={sortMode} onValueChange={(value) => setSortMode(value as 'quantity' | 'release')}>
            <TabsList>
              <TabsTrigger value="release" className="gap-2" data-testid="sort-release">
                <Calendar className="w-4 h-4" />
                Release Order
              </TabsTrigger>
              <TabsTrigger value="quantity" className="gap-2" data-testid="sort-quantity">
                <ArrowDownWideNarrow className="w-4 h-4" />
                Quantity
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modelData.map((modelGroup) => {
          const isModelExpanded = expandedModels.has(modelGroup.model);
          
          return (
            <Card
              key={modelGroup.model}
              className="overflow-hidden"
              data-testid={`card-model-${modelGroup.model.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div
                className="p-4 cursor-pointer hover-elevate active-elevate-2"
                onClick={() => toggleModel(modelGroup.model)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isModelExpanded ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" title={modelGroup.model}>
                        {modelGroup.model}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2 ml-6">
                  <p className="text-2xl font-bold" data-testid={`text-model-count-${modelGroup.model.toLowerCase().replace(/\s+/g, '-')}`}>
                    {modelGroup.totalDevices}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {modelGroup.totalDevices === 1 ? 'device' : 'devices'}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4 space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyIMEIsToClipboard(modelGroup.items, `model-${modelGroup.model}`);
                    }}
                    data-testid={`button-copy-model-${modelGroup.model.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {copiedGroup === `model-${modelGroup.model}` ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy IMEIs
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFullData(modelGroup.items, `${modelGroup.model}.csv`);
                    }}
                    data-testid={`button-download-model-${modelGroup.model.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </div>

                {isModelExpanded && (
                  <div className="space-y-2 pt-2 border-t">
                    {Object.values(modelGroup.gbGroups)
                      .sort((a, b) => {
                        const aNum = parseInt(a.gb) || 0;
                        const bNum = parseInt(b.gb) || 0;
                        return bNum - aNum;
                      })
                      .map((gbGroup) => {
                        const gbKey = `${modelGroup.model}-${gbGroup.gb}`;
                        const isGBExpanded = expandedGB.has(gbKey);

                        return (
                          <div key={gbKey} className="space-y-2">
                            <div
                              className="p-2 rounded-md cursor-pointer hover-elevate active-elevate-2 bg-muted/50"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGB(gbKey);
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {isGBExpanded ? (
                                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                  )}
                                  <p className="text-sm font-medium">{gbGroup.gb}</p>
                                </div>
                                <Badge variant="secondary" className="flex-shrink-0">
                                  {gbGroup.totalDevices}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex gap-1 ml-5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyIMEIsToClipboard(gbGroup.items, gbKey);
                                }}
                                data-testid={`button-copy-gb-${gbKey.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                {copiedGroup === gbKey ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadFullData(gbGroup.items, `${modelGroup.model}-${gbGroup.gb}.csv`);
                                }}
                                data-testid={`button-download-gb-${gbKey.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>

                            {isGBExpanded && (
                              <div className="ml-5 space-y-1">
                                {Object.values(gbGroup.colorGroups)
                                  .sort((a, b) => b.totalDevices - a.totalDevices)
                                  .map((colorGroup) => {
                                    const colorKey = `${gbKey}-${colorGroup.color}`;
                                    const isColorExpanded = expandedColors.has(colorKey);
                                    
                                    return (
                                      <div
                                        key={colorKey}
                                        className="rounded-md bg-muted/30 overflow-hidden"
                                      >
                                        <div 
                                          className="p-2 cursor-pointer hover-elevate active-elevate-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleColor(colorKey);
                                          }}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                              {isColorExpanded ? (
                                                <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                              ) : (
                                                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                              )}
                                              <p className="text-sm">{colorGroup.color}</p>
                                            </div>
                                            <Badge variant="outline" className="flex-shrink-0">
                                              {colorGroup.totalDevices}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="px-2 pb-2">
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="flex-1 h-7 text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                copyIMEIsToClipboard(colorGroup.items, colorKey);
                                              }}
                                              data-testid={`button-copy-color-${colorKey.toLowerCase().replace(/\s+/g, '-')}`}
                                            >
                                              {copiedGroup === colorKey ? (
                                                <>
                                                  <Check className="w-3 h-3 mr-1" />
                                                  Copied
                                                </>
                                              ) : (
                                                <>
                                                  <Copy className="w-3 h-3 mr-1" />
                                                  Copy
                                                </>
                                              )}
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 px-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                downloadFullData(colorGroup.items, `${modelGroup.model}-${gbGroup.gb}-${colorGroup.color}.csv`);
                                              }}
                                              data-testid={`button-download-color-${colorKey.toLowerCase().replace(/\s+/g, '-')}`}
                                            >
                                              <Download className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        {isColorExpanded && colorGroup.items.length > 0 && (
                                          <div className="border-t bg-background/50 max-h-96 overflow-auto">
                                            <table className="w-full text-xs">
                                              <thead className="sticky top-0 bg-muted text-muted-foreground uppercase">
                                                <tr>
                                                  <th className="px-2 py-1 text-left font-medium">IMEI</th>
                                                  <th className="px-2 py-1 text-left font-medium">Lock Status</th>
                                                  <th className="px-2 py-1 text-left font-medium">Grade</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {colorGroup.items.map((item, idx) => (
                                                  <tr 
                                                    key={idx} 
                                                    className="border-b hover-elevate cursor-pointer"
                                                    data-testid={`device-row-${idx}`}
                                                  >
                                                    <td className="px-2 py-1 font-mono">{item.imei || 'N/A'}</td>
                                                    <td className="px-2 py-1">{item.lockStatus || 'N/A'}</td>
                                                    <td className="px-2 py-1">{item.grade || 'N/A'}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
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
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

PivotView.displayName = 'PivotView';

export default PivotView;
