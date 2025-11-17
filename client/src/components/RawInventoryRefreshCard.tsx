import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { useState } from "react";
import { InventoryDataResponse } from "@shared/schema";

export function RawInventoryRefreshCard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setRefreshStatus("idle");
    setErrorMessage(null);

    try {
      // Invalidate and refetch the inventory data
      await queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });

      // Wait a bit for the query to refetch
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the latest data
      const data = queryClient.getQueryData<InventoryDataResponse>(["/api/inventory"]);

      if (data?.rawInventory) {
        setItemCount(data.rawInventory.length);
        setRefreshStatus("success");
        setLastRefresh(new Date());
      } else {
        setRefreshStatus("error");
        setErrorMessage("No raw inventory data available. Check sheet permissions.");
        setItemCount(0);
      }
    } catch (error) {
      console.error("Raw inventory refresh failed:", error);
      setRefreshStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh raw inventory");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Raw Inventory Refresh</span>
            {isRefreshing && (
              <Badge variant="secondary" className="animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Refreshing...
              </Badge>
            )}
            {refreshStatus === "success" && !isRefreshing && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Up to date
              </Badge>
            )}
            {refreshStatus === "error" && !isRefreshing && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={refreshStatus === "error" ? "default" : "outline"}
            onClick={triggerRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {refreshStatus === "error" ? "Retry" : "Refresh Now"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item Count */}
        {itemCount !== null && (
          <div>
            <p className="text-xs text-muted-foreground">Raw Inventory Items</p>
            <p className="text-3xl font-bold text-blue-600">
              {itemCount.toLocaleString()}
            </p>
          </div>
        )}

        {/* Last Refresh Info */}
        <div className="pt-2 space-y-1 text-xs text-muted-foreground border-t">
          <div className="flex justify-between items-center">
            <span>Last Refreshed:</span>
            <span className="font-medium">{formatDate(lastRefresh)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Source:</span>
            <span className="font-medium">Google Sheets (Dump)</span>
          </div>
        </div>

        {/* Error Message */}
        {refreshStatus === "error" && errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive font-medium">Error:</p>
            <p className="text-xs text-destructive mt-1">{errorMessage}</p>
          </div>
        )}

        {/* Success Message */}
        {refreshStatus === "success" && !isRefreshing && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">
              ✓ Raw inventory refreshed successfully!
            </p>
          </div>
        )}

        {/* Info Message */}
        {refreshStatus === "idle" && !lastRefresh && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Click "Refresh Now" to load the latest raw inventory data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
