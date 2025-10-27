import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryItem, InventoryStats } from "@shared/schema";
import Header from "@/components/Header";
import DashboardStats from "@/components/DashboardStats";
import InventoryTable from "@/components/InventoryTable";
import PivotView from "@/components/PivotView";
import ItemDetailSheet from "@/components/ItemDetailSheet";
import InvMatchDialog from "@/components/InvMatchDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, Grid3x3, Scan, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'pivot'>('table');
  const [isInvMatchOpen, setIsInvMatchOpen] = useState(false);

  const { data: inventoryData, isLoading, error, refetch, isRefetching } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory'],
    refetchOnWindowFocus: false,
  });

  const filteredItems = useMemo(() => {
    if (!inventoryData) return [];
    if (!searchQuery.trim()) return inventoryData;
    
    const query = searchQuery.toLowerCase();
    return inventoryData.filter(item => 
      item.imei?.toLowerCase().includes(query) ||
      item.model?.toLowerCase().includes(query) ||
      item.grade?.toLowerCase().includes(query) ||
      item.gb?.toLowerCase().includes(query) ||
      item.color?.toLowerCase().includes(query) ||
      item.lockStatus?.toLowerCase().includes(query) ||
      item.concat?.toLowerCase().includes(query)
    );
  }, [inventoryData, searchQuery]);

  const stats = useMemo((): InventoryStats => {
    if (!inventoryData) {
      return {
        totalDevices: 0,
        byGrade: [],
        byModel: [],
        byLockStatus: [],
      };
    }

    const gradeMap = new Map<string, number>();
    const modelMap = new Map<string, number>();
    const lockStatusMap = new Map<string, number>();

    inventoryData.forEach(item => {
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
      totalDevices: inventoryData.length,
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
  }, [inventoryData]);

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleRefresh = () => {
    console.log("Refresh triggered - fetching latest data from Google Sheets");
    refetch();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          isRefreshing={isRefetching}
        />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Inventory</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load inventory data from Google Sheets. Please check your API key configuration.'}
              <div className="mt-4">
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          isRefreshing={isRefetching}
        />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading inventory from Google Sheets...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Physical Inventory</h2>
          <p className="text-muted-foreground">
            Real-time data from Google Sheets
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
        items={inventoryData || []}
      />
    </div>
  );
}
