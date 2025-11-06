import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Package, MapPin, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";

interface IMEISearchResult {
  found: boolean;
  imei: string;
  currentStatus?: string;
  currentLocation?: {
    id: string;
    name: string;
    code: string;
  } | null;
  currentGrade?: string | null;
  currentLockStatus?: string | null;
  model?: string | null;
  gb?: string | null;
  color?: string | null;
  sku?: string | null;
  lastMovement?: {
    type: string;
    date: string;
    notes?: string | null;
  } | null;
  daysInInventory?: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export function IMEISearchDialog() {
  const [open, setOpen] = useState(false);
  const [searchIMEI, setSearchIMEI] = useState("");
  const [searchResult, setSearchResult] = useState<IMEISearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchIMEI.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search/imei/${searchIMEI.trim()}`);
      const data = await response.json();
      setSearchResult(data);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResult({
        found: false,
        imei: searchIMEI.trim(),
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchIMEI("");
    setSearchResult(null);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-500";
      case "shipped":
        return "bg-blue-500";
      case "transferred":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Search IMEI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>IMEI Inventory Search</DialogTitle>
          <DialogDescription>
            Search for a device by IMEI to check if it's currently in inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter IMEI (e.g., 357004284796555)"
              value={searchIMEI}
              onChange={(e) => setSearchIMEI(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleSearch} disabled={isSearching || !searchIMEI.trim()}>
              {isSearching ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
            {searchResult && (
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>

          {/* Search Result */}
          {searchResult && (
            <Card className={searchResult.found ? "border-green-500" : "border-red-500"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {searchResult.found ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <span className="text-green-700">Device Found - IN INVENTORY</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-500" />
                      <span className="text-red-700">Device Not Found</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* IMEI */}
                <div>
                  <p className="text-sm text-muted-foreground">IMEI</p>
                  <p className="text-lg font-mono font-semibold">{searchResult.imei}</p>
                </div>

                {searchResult.found && (
                  <>
                    <Separator />

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={getStatusColor(searchResult.currentStatus)}>
                          {searchResult.currentStatus?.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      {searchResult.daysInInventory !== undefined && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Days in Inventory</p>
                          <p className="text-2xl font-bold">{searchResult.daysInInventory}</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Device Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Model
                        </p>
                        <p className="font-semibold">{searchResult.model || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Storage</p>
                        <p className="font-semibold">{searchResult.gb || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Color</p>
                        <p className="font-semibold">{searchResult.color || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Grade</p>
                        <p className="font-semibold">{searchResult.currentGrade || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lock Status</p>
                        <p className="font-semibold">{searchResult.currentLockStatus || "N/A"}</p>
                      </div>
                      {searchResult.sku && (
                        <div>
                          <p className="text-sm text-muted-foreground">SKU</p>
                          <p className="font-semibold">{searchResult.sku}</p>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Location */}
                    {searchResult.currentLocation && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Current Location
                        </p>
                        <p className="font-semibold">
                          {searchResult.currentLocation.name} ({searchResult.currentLocation.code})
                        </p>
                      </div>
                    )}

                    {/* Last Movement */}
                    {searchResult.lastMovement && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last Movement
                          </p>
                          <div className="mt-2 p-3 bg-muted rounded-md">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">
                                {searchResult.lastMovement.type.replace("_", " ").toUpperCase()}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(searchResult.lastMovement.date)}
                              </span>
                            </div>
                            {searchResult.lastMovement.notes && (
                              <p className="text-sm mt-2">{searchResult.lastMovement.notes}</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Timestamps */}
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          First Seen
                        </p>
                        <p>{formatDate(searchResult.firstSeenAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last Updated
                        </p>
                        <p>{formatDate(searchResult.lastSeenAt)}</p>
                      </div>
                    </div>
                  </>
                )}

                {!searchResult.found && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      This IMEI is not currently in the database.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      It may have been shipped, never received, or not yet synced from Google Sheets.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Tips */}
          {!searchResult && !isSearching && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Quick Tips:</strong>
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                  <li>Enter the complete 15-digit IMEI number</li>
                  <li>Press Enter or click Search to look up the device</li>
                  <li>Results show real-time inventory status</li>
                  <li>Green = In Stock, Blue = Shipped</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
