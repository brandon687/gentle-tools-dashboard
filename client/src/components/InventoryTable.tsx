import { useState, useMemo, memo, useCallback } from "react";
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

const MemoizedRow = memo(({ item, index, onViewDetails }: {
  item: InventoryItem;
  index: number;
  onViewDetails: (item: InventoryItem) => void;
}) => {
  return (
    <TableRow 
      className="hover-elevate"
      data-testid={`row-item-${index}`}
    >
      <TableCell className="font-mono text-sm" data-testid={`text-imei-${index}`}>
        {item.imei || '—'}
      </TableCell>
      <TableCell data-testid={`text-model-${index}`}>{item.model || '—'}</TableCell>
      <TableCell data-testid={`text-gb-${index}`}>{item.gb || '—'}</TableCell>
      <TableCell data-testid={`text-color-${index}`}>{item.color || '—'}</TableCell>
      <TableCell data-testid={`text-lockstatus-${index}`}>{item.lockStatus || '—'}</TableCell>
      <TableCell>
        {item.grade ? (
          <Badge variant={getGradeBadgeVariant(item.grade)} data-testid={`badge-grade-${index}`}>
            {item.grade}
          </Badge>
        ) : '—'}
      </TableCell>
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
  );
});

MemoizedRow.displayName = 'MemoizedRow';

const InventoryTable = memo(({ items, onViewDetails }: InventoryTableProps) => {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = useCallback((field: keyof InventoryItem) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDirection(dir => dir === 'asc' ? 'desc' : 'asc');
        return field;
      } else {
        setSortDirection('asc');
        return field;
      }
    });
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    
    return [...items].sort((a, b) => {
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
  }, [items, sortField, sortDirection]);

  const SortIcon = useCallback(({ field }: { field: keyof InventoryItem }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline-block ml-1" />
    );
  }, [sortField, sortDirection]);

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
                onClick={() => handleSort('model')}
              >
                <div className="flex items-center">
                  MODEL
                  <SortIcon field="model" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('gb')}
              >
                <div className="flex items-center">
                  GB
                  <SortIcon field="gb" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('color')}
              >
                <div className="flex items-center">
                  COLOR
                  <SortIcon field="color" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('lockStatus')}
              >
                <div className="flex items-center">
                  LOCK STATUS
                  <SortIcon field="lockStatus" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('grade')}
              >
                <div className="flex items-center">
                  GRADE
                  <SortIcon field="grade" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No devices found. Try adjusting your search.
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((item, index) => (
                <MemoizedRow
                  key={item.imei || `row-${index}`}
                  item={item}
                  index={index}
                  onViewDetails={onViewDetails}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

InventoryTable.displayName = 'InventoryTable';

export default InventoryTable;
