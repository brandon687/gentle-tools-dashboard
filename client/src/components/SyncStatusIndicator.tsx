import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useState } from "react";

interface SyncStatus {
  id: string;
  syncStartedAt: string;
  syncCompletedAt: string | null;
  status: "in_progress" | "completed" | "failed";
  itemsProcessed: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  errorMessage?: string | null;
  sheetsRowCount?: number | null;
  dbItemCount?: number | null;
}

export function SyncStatusIndicator() {
  const [manualSyncRunning, setManualSyncRunning] = useState(false);

  const { data: syncStatus, isLoading, refetch } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    refetchInterval: 5000, // Poll every 5 seconds
    retry: false,
  });

  const triggerManualSync = async () => {
    setManualSyncRunning(true);
    try {
      const response = await fetch("/api/sync/sheets", {
        method: "POST",
      });
      const data = await response.json();
      console.log("Manual sync result:", data);
      // Refetch status after triggering
      setTimeout(() => {
        refetch();
        setManualSyncRunning(false);
      }, 2000);
    } catch (error) {
      console.error("Manual sync failed:", error);
      setManualSyncRunning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading sync status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!syncStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Database Sync</span>
            <Button
              size="sm"
              variant="outline"
              onClick={triggerManualSync}
              disabled={manualSyncRunning}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${manualSyncRunning ? "animate-spin" : ""}`}
              />
              Run First Sync
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No sync has been run yet. Click "Run First Sync" to populate the database.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isInProgress = syncStatus.status === "in_progress";
  const isCompleted = syncStatus.status === "completed";
  const isFailed = syncStatus.status === "failed";

  const progress = syncStatus.sheetsRowCount
    ? (syncStatus.itemsProcessed / syncStatus.sheetsRowCount) * 100
    : 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
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
            <span>Database Sync Status</span>
            {isInProgress && (
              <Badge variant="secondary" className="animate-pulse">
                <Clock className="h-3 w-3 mr-1" />
                Syncing...
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
            {isFailed && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Failed
              </Badge>
            )}
          </div>
          {(isCompleted || isFailed) && (
            <Button
              size="sm"
              variant={isFailed ? "default" : "outline"}
              onClick={triggerManualSync}
              disabled={manualSyncRunning}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${manualSyncRunning ? "animate-spin" : ""}`}
              />
              {isFailed ? "Retry Sync" : "Sync Again"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar (only show if in progress) */}
        {isInProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Processing items...</span>
              <span className="font-mono font-semibold">
                {syncStatus.itemsProcessed.toLocaleString()} / {syncStatus.sheetsRowCount?.toLocaleString()}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress.toFixed(1)}% complete
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Items Added</p>
            <p className="text-2xl font-bold text-green-600">
              {syncStatus.itemsAdded.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Items Updated</p>
            <p className="text-2xl font-bold text-blue-600">
              {syncStatus.itemsUpdated.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unchanged</p>
            <p className="text-2xl font-bold text-gray-600">
              {syncStatus.itemsUnchanged.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Processed</p>
            <p className="text-2xl font-bold">
              {syncStatus.itemsProcessed.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Timing Info */}
        <div className="pt-2 space-y-1 text-xs text-muted-foreground border-t">
          <div className="flex justify-between">
            <span>Started:</span>
            <span>{formatDate(syncStatus.syncStartedAt)}</span>
          </div>
          {syncStatus.syncCompletedAt && (
            <div className="flex justify-between">
              <span>Completed:</span>
              <span>{formatDate(syncStatus.syncCompletedAt)}</span>
            </div>
          )}
          {isInProgress && (
            <div className="flex justify-between items-center">
              <span>Estimated time remaining:</span>
              <span className="font-medium animate-pulse">
                {syncStatus.sheetsRowCount && syncStatus.itemsProcessed > 0
                  ? `~${Math.ceil(
                      ((syncStatus.sheetsRowCount - syncStatus.itemsProcessed) *
                        (new Date().getTime() -
                          new Date(syncStatus.syncStartedAt).getTime())) /
                        syncStatus.itemsProcessed /
                        60000
                    )} min`
                  : "Calculating..."}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {isFailed && syncStatus.errorMessage && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive font-medium">Error:</p>
            <p className="text-xs text-destructive mt-1">{syncStatus.errorMessage}</p>
          </div>
        )}

        {/* Success Message */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">
              ✓ Sync completed successfully! Database is up to date.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
