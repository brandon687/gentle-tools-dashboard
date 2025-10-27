import { useState } from "react";
import { InventoryItem } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PivotViewProps {
  items: InventoryItem[];
  onViewDetails: (item: InventoryItem) => void;
}

interface GroupedData {
  [key: string]: InventoryItem[];
}

export default function PivotView({ items, onViewDetails }: PivotViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'sku' | 'grade' | 'model' | 'lockStatus' | 'color'>('sku');
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const { toast } = useToast();

  const groupByField = (field: keyof InventoryItem): GroupedData => {
    const grouped: GroupedData = {};
    items.forEach(item => {
      const key = (item[field] as string) || 'Unknown';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    return grouped;
  };

  const groupBySKU = (): GroupedData => {
    const grouped: GroupedData = {};
    items.forEach(item => {
      const sku = `${item.model || 'Unknown'} ${item.gb || ''} ${item.color || ''}`.trim();
      if (!grouped[sku]) {
        grouped[sku] = [];
      }
      grouped[sku].push(item);
    });
    return grouped;
  };

  const groupedBySKU = groupBySKU();
  const groupedByGrade = groupByField('grade');
  const groupedByModel = groupByField('model');
  const groupedByLockStatus = groupByField('lockStatus');
  const groupedByColor = groupByField('color');

  const getCurrentGrouped = () => {
    switch (selectedCategory) {
      case 'sku': return groupedBySKU;
      case 'grade': return groupedByGrade;
      case 'model': return groupedByModel;
      case 'lockStatus': return groupedByLockStatus;
      case 'color': return groupedByColor;
      default: return groupedBySKU;
    }
  };

  const currentGrouped = getCurrentGrouped();
  const displayedItems = selectedGroup ? currentGrouped[selectedGroup] || [] : [];

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
        description: `${items.length} IMEI(s) copied to clipboard. Ready to paste into Google Sheets.`,
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

  const getGradeBadgeVariant = (grade?: string) => {
    const normalizedGrade = grade?.toUpperCase().trim();
    switch (normalizedGrade) {
      case 'A1 GRADE':
      case 'A1':
        return 'default';
      case 'A GRADE':
      case 'A':
        return 'secondary';
      case 'AB GRADE':
      case 'AB':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={selectedCategory} onValueChange={(value) => {
        setSelectedCategory(value as any);
        setSelectedGroup(null);
      }}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sku" data-testid="tab-sku">By SKU</TabsTrigger>
          <TabsTrigger value="grade" data-testid="tab-grade">By Grade</TabsTrigger>
          <TabsTrigger value="model" data-testid="tab-model">By Model</TabsTrigger>
          <TabsTrigger value="lockStatus" data-testid="tab-lockstatus">By Lock Status</TabsTrigger>
          <TabsTrigger value="color" data-testid="tab-color">By Color</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(currentGrouped)
              .sort((a, b) => b[1].length - a[1].length)
              .map(([key, groupItems]) => (
                <Card
                  key={key}
                  className={`p-4 ${
                    selectedGroup === key ? 'ring-2 ring-primary' : ''
                  }`}
                  data-testid={`card-group-${key.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="space-y-3">
                    <div 
                      className="cursor-pointer hover-elevate active-elevate-2 rounded-md -m-4 p-4"
                      onClick={() => setSelectedGroup(selectedGroup === key ? null : key)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          {selectedCategory === 'grade' ? (
                            <Badge variant={getGradeBadgeVariant(key)} className="text-sm">
                              {key}
                            </Badge>
                          ) : (
                            <p className="font-medium text-sm truncate" title={key}>
                              {key}
                            </p>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold" data-testid={`text-count-${key.toLowerCase().replace(/\s+/g, '-')}`}>
                            {groupItems.length}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {groupItems.length === 1 ? 'device' : 'devices'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {groupItems.length >= 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyIMEIsToClipboard(groupItems, key);
                        }}
                        data-testid={`button-copy-imeis-${key.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {copiedGroup === key ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy {groupItems.length} {groupItems.length === 1 ? 'IMEI' : 'IMEIs'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedGroup && displayedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-semibold">
              {selectedGroup} - {displayedItems.length} {displayedItems.length === 1 ? 'Device' : 'Devices'}
            </h3>
            <div className="flex items-center gap-2">
              {displayedItems.length >= 1 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => copyIMEIsToClipboard(displayedItems, selectedGroup)}
                  data-testid="button-copy-all-imeis"
                >
                  {copiedGroup === selectedGroup ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied {displayedItems.length} {displayedItems.length === 1 ? 'IMEI' : 'IMEIs'}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy All IMEIs
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedGroup(null)}
                data-testid="button-clear-selection"
              >
                Clear Selection
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedItems.map((item, index) => (
              <Card
                key={item.id || index}
                className="p-4 hover-elevate"
                data-testid={`card-device-${index}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-semibold truncate" title={item.model}>
                        {item.model}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.gb} • {item.color}
                      </p>
                    </div>
                    {item.grade && (
                      <Badge variant={getGradeBadgeVariant(item.grade)} className="flex-shrink-0">
                        {item.grade}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-muted-foreground">IMEI</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono truncate">{item.imei}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-shrink-0"
                          onClick={async () => {
                            if (item.imei) {
                              await navigator.clipboard.writeText(item.imei);
                              toast({
                                title: "IMEI Copied",
                                description: item.imei,
                              });
                            }
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Lock</span>
                      <span>{item.lockStatus}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Age</span>
                      <span>{item.age}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onViewDetails(item)}
                    data-testid={`button-view-device-${index}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
