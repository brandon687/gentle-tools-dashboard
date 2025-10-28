import { useState, useMemo, useCallback, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryItem, InventoryDataResponse } from "@shared/schema";
import Header from "@/components/Header";
import DashboardStats from "@/components/DashboardStats";
import ExpandableGradeSection from "@/components/ExpandableGradeSection";
import PivotView from "@/components/PivotView";
import ItemDetailSheet from "@/components/ItemDetailSheet";
import InvMatchDialog from "@/components/InvMatchDialog";
import InventoryFilters from "@/components/InventoryFilters";
import ExportButtons from "@/components/ExportButtons";
import EmptyFilterState from "@/components/EmptyFilterState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Scan, AlertCircle, Database, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isInvMatchOpen, setIsInvMatchOpen] = useState(false);
  const [activeDataset, setActiveDataset] = useState<'physical' | 'graded'>('physical');
  const [isPending, startTransition] = useTransition();

  const [filterGrade, setFilterGrade] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterGB, setFilterGB] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterLockStatus, setFilterLockStatus] = useState("");

  const { data: inventoryData, isLoading, error, refetch, isRefetching } = useQuery<InventoryDataResponse>({
    queryKey: ['/api/inventory'],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const currentItems = useMemo(() => {
    if (!inventoryData) return [];
    return activeDataset === 'physical' 
      ? inventoryData.physicalInventory 
      : inventoryData.gradedToFallout;
  }, [inventoryData, activeDataset]);

  const filteredItems = useMemo(() => {
    let items = currentItems;

    if (filterGrade && filterGrade !== 'all') {
      items = items.filter(item => item.grade === filterGrade);
    }
    if (filterModel && filterModel !== 'all') {
      items = items.filter(item => item.model === filterModel);
    }
    if (filterGB && filterGB !== 'all') {
      items = items.filter(item => item.gb === filterGB);
    }
    if (filterColor && filterColor !== 'all') {
      items = items.filter(item => item.color === filterColor);
    }
    if (filterLockStatus && filterLockStatus !== 'all') {
      items = items.filter(item => item.lockStatus === filterLockStatus);
    }

    return items;
  }, [currentItems, filterGrade, filterModel, filterGB, filterColor, filterLockStatus]);

  const handleViewDetails = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      setFilterGrade("");
      setFilterModel("");
      setFilterGB("");
      setFilterColor("");
      setFilterLockStatus("");
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(filterGrade || filterModel || filterGB || filterColor || filterLockStatus);
  }, [filterGrade, filterModel, filterGB, filterColor, filterLockStatus]);

  const allItems = useMemo(() => {
    if (!inventoryData) return [];
    return [...inventoryData.physicalInventory, ...inventoryData.gradedToFallout];
  }, [inventoryData]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header
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
            <TabsTrigger value="graded" data-testid="tab-graded-fallout">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Graded to Fallout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="physical" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                Quick Insights
              </h3>
              <DashboardStats items={inventoryData?.physicalInventory || []} />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                Breakdown by Grade
                <span className="font-normal text-base ml-3 normal-case">
                  ({inventoryData?.physicalInventory.length || 0} total devices • Click to expand)
                </span>
              </h3>
              <ExpandableGradeSection items={inventoryData?.physicalInventory || []} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">
                  Detailed View
                  <span className="font-normal text-base ml-3 normal-case">
                    ({filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'})
                  </span>
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <ExportButtons items={filteredItems} />
                  
                  <Button
                    variant="outline"
                    onClick={() => setIsInvMatchOpen(true)}
                    data-testid="button-inv-match"
                  >
                    <Scan className="w-4 h-4 mr-2" />
                    INV MATCH
                  </Button>
                </div>
              </div>

              <InventoryFilters
                items={currentItems}
                selectedGrade={filterGrade}
                selectedModel={filterModel}
                selectedGB={filterGB}
                selectedColor={filterColor}
                selectedLockStatus={filterLockStatus}
                onGradeChange={setFilterGrade}
                onModelChange={setFilterModel}
                onGBChange={setFilterGB}
                onColorChange={setFilterColor}
                onLockStatusChange={setFilterLockStatus}
                onClearAll={handleClearFilters}
              />

              {filteredItems.length === 0 ? (
                <EmptyFilterState hasActiveFilters={hasActiveFilters} />
              ) : (
                <PivotView
                  items={filteredItems}
                  onViewDetails={handleViewDetails}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="graded" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                Quick Insights
              </h3>
              <DashboardStats items={inventoryData?.gradedToFallout || []} />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
                Breakdown by Grade
                <span className="font-normal text-base ml-3 normal-case">
                  ({inventoryData?.gradedToFallout.length || 0} total devices • Click to expand)
                </span>
              </h3>
              <ExpandableGradeSection items={inventoryData?.gradedToFallout || []} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">
                  Detailed View
                  <span className="font-normal text-base ml-3 normal-case">
                    ({filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'})
                  </span>
                </h3>

                <div className="flex items-center gap-2 flex-wrap">
                  <ExportButtons items={filteredItems} />
                </div>
              </div>

              <InventoryFilters
                items={currentItems}
                selectedGrade={filterGrade}
                selectedModel={filterModel}
                selectedGB={filterGB}
                selectedColor={filterColor}
                selectedLockStatus={filterLockStatus}
                onGradeChange={setFilterGrade}
                onModelChange={setFilterModel}
                onGBChange={setFilterGB}
                onColorChange={setFilterColor}
                onLockStatusChange={setFilterLockStatus}
                onClearAll={handleClearFilters}
              />

              {filteredItems.length === 0 ? (
                <EmptyFilterState hasActiveFilters={hasActiveFilters} />
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
