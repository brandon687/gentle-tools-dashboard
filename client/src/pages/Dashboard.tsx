import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryItem, InventoryStats, InventoryDataResponse } from "@shared/schema";
import Header from "@/components/Header";
import ExpandableGradeSection from "@/components/ExpandableGradeSection";
import InventoryTable from "@/components/InventoryTable";
import PivotView from "@/components/PivotView";
import ItemDetailSheet from "@/components/ItemDetailSheet";
import InvMatchDialog from "@/components/InvMatchDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, Grid3x3, Scan, AlertCircle, Database, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'pivot'>('table');
  const [isInvMatchOpen, setIsInvMatchOpen] = useState(false);
  const [activeDataset, setActiveDataset] = useState<'physical' | 'fallout'>('physical');

  const { data: inventoryData, isLoading, error, refetch, isRefetching } = useQuery<InventoryDataResponse>({
    queryKey: ['/api/inventory'],
    refetchOnWindowFocus: false,
  });

  const currentItems = useMemo(() => {
    if (!inventoryData) return [];
    return activeDataset === 'physical' 
      ? inventoryData.physicalInventory 
      : inventoryData.gradedToFallout;
  }, [inventoryData, activeDataset]);

  const filteredItems = useMemo(() => {
    if (!currentItems) return [];
    if (!searchQuery.trim()) return currentItems;
    
    const query = searchQuery.toLowerCase();
    return currentItems.filter(item => 
      item.imei?.toLowerCase().includes(query) ||
      item.model?.toLowerCase().includes(query) ||
      item.grade?.toLowerCase().includes(query) ||
      item.gb?.toLowerCase().includes(query) ||
      item.color?.toLowerCase().includes(query) ||
      item.lockStatus?.toLowerCase().includes(query) ||
      item.concat?.toLowerCase().includes(query)
    );
  }, [currentItems, searchQuery]);

  const handleViewDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  const allItems = useMemo(() => {
    if (!inventoryData) return [];
    return [...inventoryData.physicalInventory, ...inventoryData.gradedToFallout];
  }, [inventoryData]);

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
          <h2 className="text-3xl font-semibold mb-2">Inventory Management</h2>
          <p className="text-muted-foreground">
            Real-time data from Google Sheets • Click grade cards to drill down • Double-click quantities for IMEIs
          </p>
        </div>

        <Tabs value={activeDataset} onValueChange={(v) => setActiveDataset(v as any)} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="physical" data-testid="tab-physical-inventory">
              <Database className="w-4 h-4 mr-2" />
              Physical Inventory
            </TabsTrigger>
            <TabsTrigger value="fallout" data-testid="tab-graded-fallout">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Graded to Fallout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="physical" className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">
                Breakdown by Grade
                <span className="text-muted-foreground font-normal text-base ml-3">
                  ({inventoryData?.physicalInventory.length || 0} total devices)
                </span>
              </h3>
              <ExpandableGradeSection items={inventoryData?.physicalInventory || []} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-xl font-semibold">
                  Detailed View
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
          </TabsContent>

          <TabsContent value="fallout" className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">
                Breakdown by Grade
                <span className="text-muted-foreground font-normal text-base ml-3">
                  ({inventoryData?.gradedToFallout.length || 0} total devices)
                </span>
              </h3>
              <ExpandableGradeSection items={inventoryData?.gradedToFallout || []} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-xl font-semibold">
                  Detailed View
                  <span className="text-muted-foreground font-normal text-base ml-3">
                    ({filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'})
                  </span>
                </h3>

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
          </TabsContent>
        </Tabs>
      </main>

      <ItemDetailSheet
        item={selectedItem}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />

      <InvMatchDialog
        open={isInvMatchOpen}
        onOpenChange={setIsInvMatchOpen}
        items={allItems}
      />
    </div>
  );
}
