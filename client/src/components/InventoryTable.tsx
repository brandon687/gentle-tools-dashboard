import { useState } from "react";
import { InventoryItem } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";

interface InventoryTableProps {
  items: InventoryItem[];
  onViewDetails: (item: InventoryItem) => void;
}

type SortField = keyof InventoryItem | null;
type SortDirection = 'asc' | 'desc';

export default function InventoryTable({ items, onViewDetails }: InventoryTableProps) {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: keyof InventoryItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortField) return 0;
    
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  });

  const getStatusBadgeVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'in stock':
      case 'available':
        return 'default';
      case 'low stock':
        return 'secondary';
      case 'out of stock':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const SortIcon = ({ field }: { field: keyof InventoryItem }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline-block ml-1" />
    );
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('imei')}
              >
                <div className="flex items-center">
                  IMEI
                  <SortIcon field="imei" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('deviceModel')}
              >
                <div className="flex items-center">
                  Device Model
                  <SortIcon field="deviceModel" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('brand')}
              >
                <div className="flex items-center">
                  Brand
                  <SortIcon field="brand" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center">
                  Location
                  <SortIcon field="location" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('condition')}
              >
                <div className="flex items-center">
                  Condition
                  <SortIcon field="condition" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('stockLevel')}
              >
                <div className="flex items-center">
                  Stock
                  <SortIcon field="stockLevel" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No devices found. Try adjusting your search.
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((item, index) => (
                <TableRow 
                  key={item.id || index} 
                  className="hover-elevate"
                  data-testid={`row-item-${index}`}
                >
                  <TableCell className="font-mono text-sm" data-testid={`text-imei-${index}`}>
                    {item.imei || '—'}
                  </TableCell>
                  <TableCell data-testid={`text-model-${index}`}>{item.deviceModel || '—'}</TableCell>
                  <TableCell data-testid={`text-brand-${index}`}>{item.brand || '—'}</TableCell>
                  <TableCell>
                    {item.status && (
                      <Badge variant={getStatusBadgeVariant(item.status)} data-testid={`badge-status-${index}`}>
                        {item.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell data-testid={`text-location-${index}`}>{item.location || '—'}</TableCell>
                  <TableCell data-testid={`text-condition-${index}`}>{item.condition || '—'}</TableCell>
                  <TableCell data-testid={`text-stock-${index}`}>{item.stockLevel ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(item)}
                      data-testid={`button-view-${index}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
