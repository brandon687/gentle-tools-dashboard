import { useState, useEffect } from "react";
import { InventoryItem } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ItemDetailSheetProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MovementHistoryItem {
  id: string;
  movementType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromGrade?: string | null;
  toGrade?: string | null;
  fromLockStatus?: string | null;
  toLockStatus?: string | null;
  fromLocation?: { id: string; name: string; code: string } | null;
  toLocation?: { id: string; name: string; code: string } | null;
  notes?: string | null;
  source: string;
  performedBy?: string | null;
  performedAt: string;
}

export default function ItemDetailSheet({ item, open, onOpenChange }: ItemDetailSheetProps) {
  const [movementHistory, setMovementHistory] = useState<MovementHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (open && item?.imei) {
      fetchMovementHistory(item.imei);
    }
  }, [open, item?.imei]);

  const fetchMovementHistory = async (imei: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/movements/${imei}/history`);
      const data = await response.json();
      if (data.found && data.movements) {
        setMovementHistory(data.movements);
      } else {
        setMovementHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch movement history:", error);
      setMovementHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  if (!item) return null;

  const getGradeBadgeVariant = (grade?: string) => {
    const normalizedGrade = grade?.toUpperCase().trim();
    switch (normalizedGrade) {
      case 'A1 GRADE':
      case 'A1':
        return 'default';
      case 'A GRADE':
      case 'A':
        return 'secondary';
      case 'AB GRADE':
      case 'AB':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: any }) => {
    if (value === undefined || value === null || value === '') return null;
    
    return (
      <div className="grid grid-cols-3 gap-4 py-3">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="col-span-2 text-sm" data-testid={`text-detail-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {label === 'Grade' && typeof value === 'string' ? (
            <Badge variant={getGradeBadgeVariant(value)}>{value}</Badge>
          ) : (
            value.toString()
          )}
        </div>
      </div>
    );
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

  const getMovementTypeLabel = (type: string) => {
    return type.replace("_", " ").toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto" data-testid="sheet-item-details">
        <SheetHeader>
          <SheetTitle data-testid="text-detail-title">
            {item.model || 'Device Details'}
          </SheetTitle>
          <SheetDescription>
            View complete information and movement history
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">
              Movement History
              {movementHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {movementHistory.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-1">
            <DetailRow label="IMEI" value={item.imei} />
            <Separator />
            <DetailRow label="Model" value={item.model} />
            <Separator />
            <DetailRow label="Storage (GB)" value={item.gb} />
            <Separator />
            <DetailRow label="Color" value={item.color} />
            <Separator />
            <DetailRow label="Lock Status" value={item.lockStatus} />
            <Separator />
            <DetailRow label="Grade" value={item.grade} />
            <Separator />
            <DetailRow label="Date" value={item.date} />
            <Separator />
            <DetailRow label="Age" value={item.age} />
            <Separator />
            <DetailRow label="Concatenated Info" value={item.concat} />
          </TabsContent>

          <TabsContent value="history">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading movement history...</p>
              </div>
            ) : movementHistory.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No movement history available yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Movement tracking is active - future changes will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {movementHistory.map((movement, index) => (
                    <Card key={movement.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">
                              {getMovementTypeLabel(movement.movementType)}
                            </CardTitle>
                            {index === 0 && (
                              <Badge variant="outline" className="text-xs">
                                Latest
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(movement.performedAt)}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {/* Status Change */}
                        {movement.fromStatus && movement.toStatus && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Status: </span>
                            <Badge variant="outline" className="mr-2">
                              {movement.fromStatus}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="default" className="ml-2">
                              {movement.toStatus}
                            </Badge>
                          </div>
                        )}

                        {/* Grade Change */}
                        {movement.fromGrade && movement.toGrade && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Grade: </span>
                            <Badge variant="outline" className="mr-2">
                              {movement.fromGrade}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="default" className="ml-2">
                              {movement.toGrade}
                            </Badge>
                          </div>
                        )}

                        {/* Lock Status Change */}
                        {movement.fromLockStatus && movement.toLockStatus && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Lock Status: </span>
                            <Badge variant="outline" className="mr-2">
                              {movement.fromLockStatus}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="default" className="ml-2">
                              {movement.toLockStatus}
                            </Badge>
                          </div>
                        )}

                        {/* Location Transfer */}
                        {movement.toLocation && (
                          <div className="text-sm flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {movement.fromLocation && (
                              <>
                                <span>{movement.fromLocation.name}</span>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <span className="font-medium">{movement.toLocation.name}</span>
                          </div>
                        )}

                        {/* Notes */}
                        {movement.notes && (
                          <div className="text-sm bg-muted/50 p-2 rounded-md">
                            <p className="text-muted-foreground">Note:</p>
                            <p>{movement.notes}</p>
                          </div>
                        )}

                        {/* Source & Performed By */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                          <span>Source: {movement.source}</span>
                          {movement.performedBy && (
                            <span>By: {movement.performedBy}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
