import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, TruckIcon } from "lucide-react";

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
        return { items: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } };
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

  const filteredItems = data?.items || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading outbound IMEIs from Google Sheets...</p>
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TruckIcon className="w-5 h-5" />
            Outbound IMEIs Sheet
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredItems.length.toLocaleString()} {searchQuery ? 'filtered' : 'total'})
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
              Refresh
            </Button>
          </div>
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
            <p className="text-muted-foreground">Searching outbound sheet...</p>
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
