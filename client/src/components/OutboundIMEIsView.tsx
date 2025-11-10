import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, TruckIcon, Clock, AlertCircle, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OutboundItem {
  imei?: string;
  model?: string;
  capacity?: string;
  color?: string;
  lockStatus?: string;
  graded?: string;
  price?: string;
  updatedAt?: string;
  invno?: string;
  invtype?: string;
}

export default function OutboundIMEIsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();

  // Debounce search to avoid too many API calls
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['/api/outbound-imeis', debouncedSearch],
    queryFn: async () => {
      // Only fetch if there's a search query (at least 3 chars)
      if (!debouncedSearch || debouncedSearch.trim().length < 3) {
        return {
          items: [],
          pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
          cacheInfo: null
        };
      }

      const params = new URLSearchParams({
        search: debouncedSearch.trim(),
        limit: '1000', // Get more results for searching
        offset: '0'
      });

      const response = await fetch(`/api/outbound-imeis?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch outbound IMEIs');
      }
      return response.json();
    },
    enabled: debouncedSearch.trim().length >= 3, // Only run query if search is 3+ chars
    refetchOnWindowFocus: false,
  });

  // Cache sync mutation
  const syncCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cache/sync-outbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync cache');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cache synced successfully",
        description: `Processed ${data.stats.rowsInserted.toLocaleString()} items in ${(data.stats.timeTaken / 1000).toFixed(1)}s`,
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/outbound-imeis'] });
    },
    onError: (error) => {
      toast({
        title: "Cache sync failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    },
  });

  const filteredItems = data?.items || [];
  const cacheInfo = data?.cacheInfo;

  // Format last sync time
  const formatSyncTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Database className="w-12 h-12 text-muted-foreground mx-auto animate-pulse" />
              <p className="text-muted-foreground">Searching...</p>
              <p className="text-xs text-muted-foreground">
                Database-powered instant results
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-destructive font-medium">Failed to load outbound IMEIs</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TruckIcon className="w-5 h-5" />
              Outbound IMEIs (Cached)
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredItems.length.toLocaleString()} {searchQuery ? 'found' : 'total'})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search IMEI, Model, or Invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[280px]"
                />
              </div>
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                disabled={isRefetching}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
                Search
              </Button>
              <Button
                onClick={() => syncCacheMutation.mutate()}
                variant="outline"
                size="sm"
                disabled={syncCacheMutation.isPending}
              >
                <Database className={`w-4 h-4 mr-2 ${syncCacheMutation.isPending ? "animate-pulse" : ""}`} />
                Refresh Cache
              </Button>
            </div>
          </div>

          {/* Cache Status Bar */}
          {cacheInfo && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Last synced: {formatSyncTime(cacheInfo.lastSyncedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {cacheInfo.cacheSize?.toLocaleString() || 0} items cached
                  </span>
                </div>
                {cacheInfo.isStale && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Cache is older than 1 hour
                  </Badge>
                )}
              </div>
              {syncCacheMutation.isPending && (
                <span className="text-muted-foreground animate-pulse">
                  Syncing from Google Sheets...
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {searchQuery.trim().length < 3 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Search Outbound IMEIs</h3>
            <p className="text-muted-foreground">
              Enter at least 3 characters to search
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Search by IMEI, Model, or Invoice Number
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              💡 Example: "357136795163154" or "iPhone" or "INV-2024"
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Searching...</p>
            <p className="text-xs text-muted-foreground mt-2">
              Database-powered instant results
            </p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Found {data?.pagination?.total || 0} results
              {data?.pagination?.hasMore && ' (showing first 1,000)'}
            </div>
            <div className="rounded-md border">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[140px]">IMEI</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="w-[80px]">Storage</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="w-[90px]">Lock Status</TableHead>
                      <TableHead className="w-[70px]">Grade</TableHead>
                      <TableHead className="w-[90px]">Price</TableHead>
                      <TableHead className="w-[110px]">Invoice</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[110px]">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item: OutboundItem, index: number) => (
                      <TableRow key={`${item.imei}-${index}`}>
                        <TableCell className="font-mono text-xs">{item.imei}</TableCell>
                        <TableCell className="text-sm">{item.model}</TableCell>
                        <TableCell className="text-sm">{item.capacity}</TableCell>
                        <TableCell className="text-sm">{item.color}</TableCell>
                        <TableCell className="text-xs">{item.lockStatus}</TableCell>
                        <TableCell className="text-sm font-medium">{item.graded}</TableCell>
                        <TableCell className="text-sm">{item.price}</TableCell>
                        <TableCell className="font-mono text-xs">{item.invno}</TableCell>
                        <TableCell className="text-xs">{item.invtype}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.updatedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <TruckIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No outbound items found matching "{searchQuery}"
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try a different search term
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
