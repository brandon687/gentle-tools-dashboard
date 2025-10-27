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

  const getGradeBadgeVariant = (grade?: string) => {
    switch (grade?.toUpperCase()) {
      case 'A':
      case 'A+':
        return 'default';
      case 'B':
      case 'B+':
        return 'secondary';
      case 'C':
        return 'outline';
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
                onClick={() => handleSort('grade')}
              >
                <div className="flex items-center">
                  GRADE
                  <SortIcon field="grade" />
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
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  DATE
                  <SortIcon field="date" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover-elevate"
                onClick={() => handleSort('age')}
              >
                <div className="flex items-center">
                  AGE
                  <SortIcon field="age" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
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
                  <TableCell>
                    {item.grade ? (
                      <Badge variant={getGradeBadgeVariant(item.grade)} data-testid={`badge-grade-${index}`}>
                        {item.grade}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell data-testid={`text-model-${index}`}>{item.model || '—'}</TableCell>
                  <TableCell data-testid={`text-gb-${index}`}>{item.gb || '—'}</TableCell>
                  <TableCell data-testid={`text-color-${index}`}>{item.color || '—'}</TableCell>
                  <TableCell data-testid={`text-lockstatus-${index}`}>{item.lockStatus || '—'}</TableCell>
                  <TableCell data-testid={`text-date-${index}`}>{item.date || '—'}</TableCell>
                  <TableCell data-testid={`text-age-${index}`}>{item.age || '—'}</TableCell>
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
