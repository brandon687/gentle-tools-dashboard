import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Package,
  TruckIcon,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search
} from "lucide-react";

interface Movement {
  id: string;
  movementType: string;
  imei: string;
  model: string | null;
  gb: string | null;
  color: string | null;
  grade: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  fromGrade: string | null;
  toGrade: string | null;
  fromLockStatus: string | null;
  toLockStatus: string | null;
  fromLocation: { id: string; name: string; code: string } | null;
  toLocation: { id: string; name: string; code: string } | null;
  notes: string | null;
  source: string;
  performedBy: string | null;
  performedAt: string;
  snapshotData: any;
}

interface MovementsResponse {
  movements: Movement[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function MovementLog() {
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const limit = 50;

  const { data, isLoading, error, refetch, isRefetching } = useQuery<MovementsResponse>({
    queryKey: ['/api/movements', movementTypeFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (currentPage * limit).toString(),
      });

      if (movementTypeFilter !== "all") {
        params.append('movementType', movementTypeFilter);
      }

      const response = await fetch(`/api/movements?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch movements: ${response.statusText}`);
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
  });

  // Filter movements by search query (IMEI search)
  const filteredMovements = data?.movements.filter((movement) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return movement.imei?.toLowerCase().includes(query);
  }) || [];

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'shipped':
        return <TruckIcon className="w-4 h-4" />;
      case 'added':
        return <Package className="w-4 h-4" />;
      case 'transferred':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getMovementBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'shipped':
        return 'destructive';
      case 'added':
        return 'default';
      case 'transferred':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeviceInfo = (movement: Movement) => {
    const parts = [];
    if (movement.model) parts.push(movement.model);
    if (movement.gb) parts.push(movement.gb);
    if (movement.color) parts.push(movement.color);
    if (movement.grade) parts.push(`Grade: ${movement.grade}`);
    return parts.join(" • ") || "N/A";
  };

  const getChangeDescription = (movement: Movement) => {
    const changes = [];

    if (movement.fromStatus && movement.toStatus) {
      changes.push(`${movement.fromStatus} → ${movement.toStatus}`);
    }

    if (movement.fromGrade && movement.toGrade) {
      changes.push(`Grade: ${movement.fromGrade} → ${movement.toGrade}`);
    }

    if (movement.fromLockStatus && movement.toLockStatus) {
      changes.push(`Lock: ${movement.fromLockStatus} → ${movement.toLockStatus}`);
    }

    if (movement.fromLocation && movement.toLocation) {
      changes.push(`${movement.fromLocation.code} → ${movement.toLocation.code}`);
    } else if (movement.toLocation) {
      changes.push(`→ ${movement.toLocation.code}`);
    }

    return changes.join(" | ") || "—";
  };

  const totalPages = data ? Math.ceil(data.pagination.total / limit) : 0;

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">Failed to load movement history</p>
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Movement History & Audit Log</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by IMEI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[200px]"
                />
              </div>
              <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Movements</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="added">Added</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="grade_changed">Grade Changed</SelectItem>
                  <SelectItem value="status_changed">Status Changed</SelectItem>
                </SelectContent>
              </Select>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading movements...</p>
              </div>
            </div>
          ) : filteredMovements.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Date & Time</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead className="w-[140px]">IMEI</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead className="w-[100px]">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-xs font-mono">
                          {formatDate(movement.performedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getMovementBadgeVariant(movement.movementType)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getMovementIcon(movement.movementType)}
                            <span className="capitalize">
                              {movement.movementType.replace('_', ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {movement.imei}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getDeviceInfo(movement)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getChangeDescription(movement)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {movement.source.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {currentPage * limit + 1} - {Math.min((currentPage + 1) * limit, data.pagination.total)} of {data.pagination.total} movements
                    {searchQuery.trim() && ` (${filteredMovements.length} matching search)`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={!data.pagination.hasMore}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No movements found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery.trim()
                  ? `No movements found for IMEI: "${searchQuery}"`
                  : movementTypeFilter !== "all"
                  ? "Try changing the filter to see more results"
                  : "Movement history will appear here once items are added or moved"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
