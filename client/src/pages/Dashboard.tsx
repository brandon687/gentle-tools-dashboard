import { useState, useMemo } from "react";
import { InventoryItem, InventoryStats } from "@shared/schema";
import Header from "@/components/Header";
import DashboardStats from "@/components/DashboardStats";
import InventoryTable from "@/components/InventoryTable";
import PivotView from "@/components/PivotView";
import ItemDetailSheet from "@/components/ItemDetailSheet";
import InvMatchDialog from "@/components/InvMatchDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, Grid3x3, Scan } from "lucide-react";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'pivot'>('table');
  const [isInvMatchOpen, setIsInvMatchOpen] = useState(false);

  // TODO: Remove mock data - replace with real Google Sheets data
  const mockInventoryData: InventoryItem[] = [
    {
      id: "1",
      imei: "356938035643809",
      grade: "A GRADE",
      model: "iPhone 14 Pro",
      gb: "256GB",
      color: "Space Black",
      lockStatus: "Unlocked",
      date: "2024-01-15",
      concat: "iPhone 14 Pro 256GB Space Black",
      age: "45 days",
    },
    {
      id: "2",
      imei: "356938035643810",
      grade: "AB GRADE",
      model: "iPhone 13",
      gb: "128GB",
      color: "Blue",
      lockStatus: "T-Mobile",
      date: "2024-02-20",
      concat: "iPhone 13 128GB Blue",
      age: "10 days",
    },
    {
      id: "3",
      imei: "356938035643811",
      grade: "A1 GRADE",
      model: "Galaxy S23",
      gb: "512GB",
      color: "Phantom Black",
      lockStatus: "Unlocked",
      date: "2024-01-10",
      concat: "Galaxy S23 512GB Phantom Black",
      age: "50 days",
    },
    {
      id: "4",
      imei: "356938035643812",
      grade: "A GRADE",
      model: "iPhone 14",
      gb: "128GB",
      color: "Purple",
      lockStatus: "Unlocked",
      date: "2024-01-28",
      concat: "iPhone 14 128GB Purple",
      age: "32 days",
    },
    {
      id: "5",
      imei: "356938035643813",
      grade: "AB GRADE",
      model: "iPhone 12 Pro Max",
      gb: "256GB",
      color: "Gold",
      lockStatus: "Verizon",
      date: "2023-12-10",
      concat: "iPhone 12 Pro Max 256GB Gold",
      age: "81 days",
    },
    {
      id: "6",
      imei: "356938035643814",
      grade: "A1 GRADE",
      model: "Galaxy S22 Ultra",
      gb: "1TB",
      color: "Burgundy",
      lockStatus: "Unlocked",
      date: "2024-02-05",
      concat: "Galaxy S22 Ultra 1TB Burgundy",
      age: "25 days",
    },
    {
      id: "7",
      imei: "356938035643815",
      grade: "A GRADE",
      model: "iPhone 13 Pro",
      gb: "512GB",
      color: "Sierra Blue",
      lockStatus: "AT&T",
      date: "2024-01-20",
      concat: "iPhone 13 Pro 512GB Sierra Blue",
      age: "40 days",
    },
    {
      id: "8",
      imei: "356938035643816",
      grade: "AB GRADE",
      model: "Pixel 7 Pro",
      gb: "256GB",
      color: "Obsidian",
      lockStatus: "Unlocked",
      date: "2024-02-15",
      concat: "Pixel 7 Pro 256GB Obsidian",
      age: "15 days",
    },
    {
      id: "9",
      imei: "356938035643817",
      grade: "A GRADE",
      model: "iPhone 14 Pro",
      gb: "512GB",
      color: "Deep Purple",
      lockStatus: "Unlocked",
      date: "2024-02-01",
      concat: "iPhone 14 Pro 512GB Deep Purple",
      age: "29 days",
    },
    {
      id: "10",
      imei: "356938035643818",
      grade: "AB GRADE",
      model: "Galaxy S21",
      gb: "256GB",
      color: "Phantom Gray",
      lockStatus: "T-Mobile",
      date: "2023-12-20",
      concat: "Galaxy S21 256GB Phantom Gray",
      age: "71 days",
    },
  ];

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return mockInventoryData;
    
    const query = searchQuery.toLowerCase();
    return mockInventoryData.filter(item => 
      item.imei?.toLowerCase().includes(query) ||
      item.model?.toLowerCase().includes(query) ||
      item.grade?.toLowerCase().includes(query) ||
      item.gb?.toLowerCase().includes(query) ||
      item.color?.toLowerCase().includes(query) ||
      item.lockStatus?.toLowerCase().includes(query) ||
      item.concat?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const stats = useMemo((): InventoryStats => {
    const gradeMap = new Map<string, number>();
    const modelMap = new Map<string, number>();
    const lockStatusMap = new Map<string, number>();

    mockInventoryData.forEach(item => {
      if (item.grade) {
        gradeMap.set(item.grade, (gradeMap.get(item.grade) || 0) + 1);
      }
      if (item.model) {
        modelMap.set(item.model, (modelMap.get(item.model) || 0) + 1);
      }
      if (item.lockStatus) {
        lockStatusMap.set(item.lockStatus, (lockStatusMap.get(item.lockStatus) || 0) + 1);
      }
    });

    return {
      totalDevices: mockInventoryData.length,
      byGrade: Array.from(gradeMap.entries())
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => b.count - a.count),
      byModel: Array.from(modelMap.entries())
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count),
      byLockStatus: Array.from(lockStatusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, []);

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleRefresh = () => {
    console.log("Refresh triggered - will fetch latest data from Google Sheets");
    setIsRefreshing(true);
    // TODO: Replace with actual Google Sheets API call
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Physical Inventory</h2>
          <p className="text-muted-foreground">
            Track and manage your device inventory in real-time
          </p>
        </div>

        <DashboardStats stats={stats} />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-xl font-semibold">
              Inventory Items
              <span className="text-muted-foreground font-normal text-base ml-3">
                ({filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'})
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsInvMatchOpen(true)}
                data-testid="button-inv-match"
              >
                <Scan className="w-4 h-4 mr-2" />
                INV MATCH
              </Button>

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="table" data-testid="tab-table-view">
                    <Table className="w-4 h-4 mr-2" />
                    Table View
                  </TabsTrigger>
                  <TabsTrigger value="pivot" data-testid="tab-pivot-view">
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    Pivot View
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {viewMode === 'table' ? (
            <InventoryTable
              items={filteredItems}
              onViewDetails={handleViewDetails}
            />
          ) : (
            <PivotView
              items={filteredItems}
              onViewDetails={handleViewDetails}
            />
          )}
        </div>
      </main>

      <ItemDetailSheet
        item={selectedItem}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

      <InvMatchDialog
        open={isInvMatchOpen}
        onOpenChange={setIsInvMatchOpen}
        items={mockInventoryData}
      />
    </div>
  );
}
