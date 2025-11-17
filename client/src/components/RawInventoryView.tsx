import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Package, Box, Search } from "lucide-react";
import { InventoryItem } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RawInventoryViewProps {
  items: InventoryItem[];
}

interface MasterCartonGroup {
  label: string;
  items: InventoryItem[];
}

interface DeviceGroup {
  model: string;
  gb: string;
  grade: string;
  supplier: string;
  count: number;
  masterCartons: MasterCartonGroup[];
}

export default function RawInventoryView({ items }: RawInventoryViewProps) {
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterGB, setFilterGB] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Extract unique values for filters
  const { models, gbs, grades, suppliers } = useMemo(() => {
    const modelSet = new Set<string>();
    const gbSet = new Set<string>();
    const gradeSet = new Set<string>();
    const supplierSet = new Set<string>();

    items.forEach(item => {
      if (item.model) modelSet.add(item.model);
      if (item.gb) gbSet.add(item.gb);
      if (item.grade) gradeSet.add(item.grade);
      if (item.age) supplierSet.add(item.age); // age field stores supplier
    });

    return {
      models: Array.from(modelSet).sort(),
      gbs: Array.from(gbSet).sort((a, b) => parseInt(a) - parseInt(b)),
      grades: Array.from(gradeSet).sort((a, b) => {
        const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'FALLOUT'];
        return gradeOrder.indexOf(a) - gradeOrder.indexOf(b);
      }),
      suppliers: Array.from(supplierSet).sort(),
    };
  }, [items]);

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterModel !== "all" && item.model !== filterModel) return false;
      if (filterGB !== "all" && item.gb !== filterGB) return false;
      if (filterGrade !== "all" && item.grade !== filterGrade) return false;
      if (filterSupplier !== "all" && item.age !== filterSupplier) return false;
      return true;
    });
  }, [items, filterModel, filterGB, filterGrade, filterSupplier]);

  // Group filtered items by Model+GB+Grade+Supplier -> Master Cartons
  const groupedData = useMemo(() => {
    const groups: DeviceGroup[] = [];

    filteredItems.forEach(item => {
      const model = item.model || 'Unknown Model';
      const gb = item.gb || '';
      const grade = item.grade || 'Unknown';
      const supplier = item.age || 'Unknown'; // age field stores supplier
      const masterCarton = item.concat || 'No Label';

      const groupKey = `${model}|${gb}|${grade}|${supplier}`;
      let group = groups.find(g => `${g.model}|${g.gb}|${g.grade}|${g.supplier}` === groupKey);

      if (!group) {
        group = {
          model,
          gb,
          grade,
          supplier,
          count: 0,
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
      group.count++;
    });

    // Sort by grade, then model
    return groups.sort((a, b) => {
      const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'FALLOUT'];
      const aGrade = gradeOrder.indexOf(a.grade);
      const bGrade = gradeOrder.indexOf(b.grade);
      if (aGrade !== bGrade) return aGrade - bGrade;
      return a.model.localeCompare(b.model);
    });
  }, [filteredItems]);

  const toggleCard = (cardKey: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardKey)) {
        newSet.delete(cardKey);
      } else {
        newSet.add(cardKey);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setFilterModel("all");
    setFilterGB("all");
    setFilterGrade("all");
    setFilterSupplier("all");
  };

  const hasActiveFilters = filterModel !== "all" || filterGB !== "all" || filterGrade !== "all" || filterSupplier !== "all";

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Search Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Model Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models ({items.length})</SelectItem>
                  {models.map(model => {
                    const count = items.filter(i => i.model === model).length;
                    return (
                      <SelectItem key={model} value={model}>
                        {model} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* GB Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Storage</label>
              <Select value={filterGB} onValueChange={setFilterGB}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes ({items.length})</SelectItem>
                  {gbs.map(gb => {
                    const count = items.filter(i => i.gb === gb).length;
                    return (
                      <SelectItem key={gb} value={gb}>
                        {gb} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Grade Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Grade</label>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades ({items.length})</SelectItem>
                  {grades.map(grade => {
                    const count = items.filter(i => i.grade === grade).length;
                    return (
                      <SelectItem key={grade} value={grade}>
                        {grade} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers ({items.length})</SelectItem>
                  {suppliers.map(supplier => {
                    const count = items.filter(i => i.age === supplier).length;
                    return (
                      <SelectItem key={supplier} value={supplier}>
                        {supplier} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredItems.length} of {items.length} devices</span>
            <span>{groupedData.length} unique configuration{groupedData.length !== 1 ? 's' : ''}</span>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {groupedData.map((group) => {
          const cardKey = `${group.model}|${group.gb}|${group.grade}|${group.supplier}`;
          const isExpanded = expandedCards.has(cardKey);

          return (
            <Card key={cardKey} className="overflow-hidden">
              <button
                onClick={() => toggleCard(cardKey)}
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
                      <Badge variant="default" className="font-semibold">
                        {group.grade}
                      </Badge>
                      <Badge variant="outline">
                        {group.supplier}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {group.masterCartons.length} master carton{group.masterCartons.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1 flex-shrink-0">
                  {group.count}
                </Badge>
              </button>

              {/* Expanded: Master Cartons */}
              {isExpanded && (
                <div className="border-t bg-muted/10 px-6 py-4">
                  <div className="space-y-3">
                    {group.masterCartons.map((carton) => (
                      <div key={carton.label} className="border rounded-lg bg-background overflow-hidden">
                        <div className="px-4 py-3 bg-muted/20 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm font-semibold">
                              {carton.label}
                            </span>
                          </div>
                          <Badge variant="secondary">
                            {carton.items.length} device{carton.items.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* All items in master carton */}
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {carton.items.map((item, idx) => (
                              <div
                                key={`${item.imei}-${idx}`}
                                className="p-3 bg-muted/30 border rounded-lg text-sm"
                              >
                                <div className="font-semibold text-primary">
                                  {item.color || 'Unknown Color'}
                                </div>
                                <div className="font-mono text-xs text-muted-foreground mt-1">
                                  {item.imei || 'No IMEI'}
                                </div>
                                {item.lockStatus && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {item.lockStatus}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {groupedData.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {hasActiveFilters ? (
                <div>
                  <p className="text-lg font-medium mb-2">No items match your filters</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <p>No raw inventory items found</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
