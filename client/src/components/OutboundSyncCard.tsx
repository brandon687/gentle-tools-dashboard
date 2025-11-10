import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruckIcon, RefreshCw, Loader2, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const STORAGE_KEY = "outboundSyncLastResult";

export function OutboundSyncCard() {
  const [outboundSyncRunning, setOutboundSyncRunning] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const { toast } = useToast();

  // Load last sync result from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only show if sync was within last 24 hours
        const syncTime = new Date(parsed.timestamp).getTime();
        const now = Date.now();
        const hoursSince = (now - syncTime) / (1000 * 60 * 60);

        if (hoursSince < 24) {
          setLastSyncResult(parsed);
        } else {
          // Clear old data
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load last sync result:", error);
    }
  }, []);

  const triggerOutboundSync = async () => {
    setOutboundSyncRunning(true);
    setLastSyncResult(null);

    try {
      const response = await fetch("/api/sync/outbound", {
        method: "POST",
      });
      const data = await response.json();
      console.log("Outbound sync result:", data);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Sync failed');
      }

      // Handle success - data might be nested or at root level
      const result = data.success ? data : data;
      const shipped = result.itemsShipped || 0;
      const alreadyShipped = result.itemsAlreadyShipped || 0;
      const processed = result.itemsProcessed || 0;
      const notFound = result.itemsNotFound || 0;

      const syncResult = {
        shipped,
        alreadyShipped,
        processed,
        notFound,
        success: true,
        timestamp: new Date().toISOString(),
      };

      setLastSyncResult(syncResult);

      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(syncResult));
      } catch (error) {
        console.error("Failed to save sync result:", error);
      }

      let description = `${shipped} items marked as shipped.`;
      if (alreadyShipped > 0) description += ` ${alreadyShipped} already shipped.`;
      if (notFound > 0) description += ` ${notFound} not found in inventory.`;
      description += ` (${processed} total processed)`;

      toast({
        title: "Outbound Sync Complete",
        description,
        duration: 5000,
      });

      setTimeout(() => {
        setOutboundSyncRunning(false);
      }, 1000);
    } catch (error: any) {
      console.error("Outbound sync failed:", error);

      setLastSyncResult({
        success: false,
        error: error.message,
      });

      toast({
        title: "Outbound Sync Failed",
        description: error.message || "Failed to sync outbound IMEIs. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      setOutboundSyncRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TruckIcon className="w-4 h-4" />
            <span>Outbound Sync Status</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Metric Definitions:</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium text-green-600">Shipped:</span> IMEIs newly marked as shipped this sync</p>
                    <p><span className="font-medium text-blue-600">Already Shipped:</span> IMEIs that were shipped in previous syncs</p>
                    <p><span className="font-medium text-orange-600">Not Found:</span> IMEIs in the sheet but missing from your database</p>
                    <p><span className="font-medium">Total Processed:</span> All IMEIs checked from the outbound sheet</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {outboundSyncRunning && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </Badge>
            )}
            {lastSyncResult?.success && !outboundSyncRunning && (
              <Badge variant="default" className="bg-green-500">
                Completed
              </Badge>
            )}
            {lastSyncResult?.success === false && !outboundSyncRunning && (
              <Badge variant="destructive">
                Failed
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={triggerOutboundSync}
            disabled={outboundSyncRunning}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${outboundSyncRunning ? "animate-spin" : ""}`}
            />
            {outboundSyncRunning ? "Syncing..." : "Sync Outbound"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {outboundSyncRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <div>
                  <p className="text-sm font-medium">Processing outbound IMEIs...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This may take a few minutes for large datasets
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {lastSyncResult && !outboundSyncRunning && lastSyncResult.success && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Items Shipped</p>
              <p className="text-2xl font-bold text-green-600">
                {lastSyncResult.shipped.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Already Shipped</p>
              <p className="text-2xl font-bold text-blue-600">
                {lastSyncResult.alreadyShipped.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Not Found</p>
              <p className="text-2xl font-bold text-orange-600">
                {lastSyncResult.notFound.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Processed</p>
              <p className="text-2xl font-bold">
                {lastSyncResult.processed.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {lastSyncResult && !outboundSyncRunning && lastSyncResult.success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">
              ✓ Outbound sync completed successfully! Movement records created.
            </p>
            {lastSyncResult.timestamp && (
              <p className="text-xs text-green-600 mt-1">
                Last synced: {new Date(lastSyncResult.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {lastSyncResult && !outboundSyncRunning && lastSyncResult.success === false && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive font-medium">Error:</p>
            <p className="text-xs text-destructive mt-1">{lastSyncResult.error}</p>
          </div>
        )}

        {!outboundSyncRunning && !lastSyncResult && (
          <div className="text-center py-6">
            <TruckIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Click "Sync Outbound" to pull IMEIs from the outbound sheet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Processes up to 100,000 rows (last 3 weeks)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
