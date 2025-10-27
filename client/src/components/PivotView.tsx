import { useState, useMemo } from "react";
import { InventoryItem } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy, Check, Download, ArrowDownWideNarrow, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/exportUtils";
import { sortModelsByHierarchy } from "@/lib/modelSorting";
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

export default function PivotView({ items }: PivotViewProps) {
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [expandedGB, setExpandedGB] = useState<Set<string>>(new Set());
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'quantity' | 'release'>('release');
  const { toast } = useToast();

  const modelData = useMemo(() => {
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
    
    const modelList = Object.values(models);
    
    if (sortMode === 'quantity') {
      return modelList.sort((a, b) => b.totalDevices - a.totalDevices);
    } else {
      return modelList.sort((a, b) => sortModelsByHierarchy(a.model, b.model));
    }
  }, [items, sortMode]);

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
                                    
                                    return (
                                      <div
                                        key={colorKey}
                                        className="p-2 rounded-md bg-muted/30"
                                      >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                          <p className="text-sm">{colorGroup.color}</p>
                                          <Badge variant="outline" className="flex-shrink-0">
                                            {colorGroup.totalDevices}
                                          </Badge>
                                        </div>
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
}
