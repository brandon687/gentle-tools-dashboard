import { useState } from "react";
import { InventoryItem } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PivotViewProps {
  items: InventoryItem[];
  onViewDetails: (item: InventoryItem) => void;
}

interface GroupedData {
  [key: string]: InventoryItem[];
}

export default function PivotView({ items, onViewDetails }: PivotViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'grade' | 'model' | 'lockStatus' | 'color'>('grade');

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

  const groupedByGrade = groupByField('grade');
  const groupedByModel = groupByField('model');
  const groupedByLockStatus = groupByField('lockStatus');
  const groupedByColor = groupByField('color');

  const getCurrentGrouped = () => {
    switch (selectedCategory) {
      case 'grade': return groupedByGrade;
      case 'model': return groupedByModel;
      case 'lockStatus': return groupedByLockStatus;
      case 'color': return groupedByColor;
      default: return groupedByGrade;
    }
  };

  const currentGrouped = getCurrentGrouped();
  const displayedItems = selectedGroup ? currentGrouped[selectedGroup] || [] : [];

  const getGradeBadgeVariant = (grade?: string) => {
    switch (grade?.toUpperCase()) {
      case 'A':
      case 'A+':
        return 'default';
      case 'B':
      case 'B+':
        return 'secondary';
      case 'C':
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="grade" data-testid="tab-grade">By Grade</TabsTrigger>
          <TabsTrigger value="model" data-testid="tab-model">By Model</TabsTrigger>
          <TabsTrigger value="lockStatus" data-testid="tab-lockstatus">By Lock Status</TabsTrigger>
          <TabsTrigger value="color" data-testid="tab-color">By Color</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Object.entries(currentGrouped)
              .sort((a, b) => b[1].length - a[1].length)
              .map(([key, groupItems]) => (
                <Card
                  key={key}
                  className={`p-4 cursor-pointer hover-elevate active-elevate-2 ${
                    selectedGroup === key ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedGroup(selectedGroup === key ? null : key)}
                  data-testid={`card-group-${key.toLowerCase().replace(/\s+/g, '-')}`}
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
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedGroup && displayedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {selectedGroup} - {displayedItems.length} {displayedItems.length === 1 ? 'Device' : 'Devices'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGroup(null)}
              data-testid="button-clear-selection"
            >
              Clear Selection
            </Button>
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
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">IMEI</span>
                      <span className="font-mono">{item.imei}</span>
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
