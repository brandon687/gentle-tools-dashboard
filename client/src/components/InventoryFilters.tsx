import { useMemo } from "react";
import { InventoryItem } from "@shared/schema";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface InventoryFiltersProps {
  items: InventoryItem[];
  selectedGrade: string;
  selectedModel: string;
  selectedGB: string;
  selectedColor: string;
  selectedLockStatus: string;
  onGradeChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onGBChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onLockStatusChange: (value: string) => void;
  onClearAll: () => void;
}

export default function InventoryFilters({
  items,
  selectedGrade,
  selectedModel,
  selectedGB,
  selectedColor,
  selectedLockStatus,
  onGradeChange,
  onModelChange,
  onGBChange,
  onColorChange,
  onLockStatusChange,
  onClearAll,
}: InventoryFiltersProps) {
  const grades = useMemo(() => {
    const set = new Set(items.map(item => item.grade).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const models = useMemo(() => {
    const set = new Set(items.map(item => item.model).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const gbOptions = useMemo(() => {
    const set = new Set(items.map(item => item.gb).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const colors = useMemo(() => {
    const set = new Set(items.map(item => item.color).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const lockStatuses = useMemo(() => {
    const set = new Set(items.map(item => item.lockStatus).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const hasActiveFilters = selectedGrade || selectedModel || selectedGB || selectedColor || selectedLockStatus;

  return (
    <div className="border rounded-md p-4 bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Filter Inventory</h4>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            data-testid="button-clear-filters"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="filter-grade" className="text-xs">Grade</Label>
          <Select value={selectedGrade} onValueChange={onGradeChange}>
            <SelectTrigger id="filter-grade" data-testid="select-filter-grade">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map(grade => (
                <SelectItem key={grade} value={grade || ""}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-model" className="text-xs">Model</Label>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger id="filter-model" data-testid="select-filter-model">
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {models.map(model => (
                <SelectItem key={model} value={model || ""}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-gb" className="text-xs">Storage</Label>
          <Select value={selectedGB} onValueChange={onGBChange}>
            <SelectTrigger id="filter-gb" data-testid="select-filter-gb">
              <SelectValue placeholder="All Storage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Storage</SelectItem>
              {gbOptions.map(gb => (
                <SelectItem key={gb} value={gb || ""}>
                  {gb}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-color" className="text-xs">Color</Label>
          <Select value={selectedColor} onValueChange={onColorChange}>
            <SelectTrigger id="filter-color" data-testid="select-filter-color">
              <SelectValue placeholder="All Colors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colors</SelectItem>
              {colors.map(color => (
                <SelectItem key={color} value={color || ""}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-lock" className="text-xs">Lock Status</Label>
          <Select value={selectedLockStatus} onValueChange={onLockStatusChange}>
            <SelectTrigger id="filter-lock" data-testid="select-filter-lock">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {lockStatuses.map(status => (
                <SelectItem key={status} value={status || ""}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
