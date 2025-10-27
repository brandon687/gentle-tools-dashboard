import { useState, useMemo, useEffect, useCallback } from "react";
import { InventoryItem } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmartFilterSearchProps {
  items: InventoryItem[];
  onFiltersChange: (filters: {
    grade?: string;
    model?: string;
    gb?: string;
    color?: string;
    lockStatus?: string;
  }) => void;
}

export default function SmartFilterSearch({ items, onFiltersChange }: SmartFilterSearchProps) {
  const [searchInput, setSearchInput] = useState("");
  const [detectedFilters, setDetectedFilters] = useState<{
    grade?: string;
    model?: string;
    gb?: string;
    color?: string;
    lockStatus?: string;
  }>({});

  // Get all unique values from inventory
  const uniqueValues = useMemo(() => {
    const grades = new Set(items.map(item => item.grade).filter(Boolean));
    const models = new Set(items.map(item => item.model).filter(Boolean));
    const gbs = new Set(items.map(item => item.gb).filter(Boolean));
    const colors = new Set(items.map(item => item.color).filter(Boolean));
    const lockStatuses = new Set(items.map(item => item.lockStatus).filter(Boolean));

    return {
      grades: Array.from(grades),
      models: Array.from(models),
      gbs: Array.from(gbs),
      colors: Array.from(colors),
      lockStatuses: Array.from(lockStatuses),
    };
  }, [items]);

  const detectFilters = useCallback((input: string) => {
    if (!input.trim()) {
      setDetectedFilters({});
      onFiltersChange({});
      return;
    }

    const searchTerm = input.toLowerCase().trim();
    const detected: typeof detectedFilters = {};

    // Detect grade (AB GRADE, A GRADE, A1 GRADE)
    const gradeMatch = uniqueValues.grades.find(g => 
      g && searchTerm.includes(g.toLowerCase())
    );
    if (gradeMatch) detected.grade = gradeMatch;

    // Detect model - smart matching that handles partial names
    // Special handling for "Pro" vs "Pro Max"
    const modelMatch = uniqueValues.models.find(m => {
      if (!m) return false;
      const modelLower = m.toLowerCase();
      
      // Special case: if user types "pro" but NOT "max", don't match "Pro Max"
      if (searchTerm.includes('pro') && !searchTerm.includes('max')) {
        // Only match models with "Pro" that don't have "Max"
        if (modelLower.includes('pro') && modelLower.includes('max')) {
          return false;
        }
      }
      
      // Match if the model contains the search term OR search term contains significant parts of the model
      // This allows "13" to match "iPhone 13", "14 Pro" to match "iPhone 14 Pro", etc.
      if (modelLower.includes(searchTerm)) {
        return true;
      }
      
      // Extract model number/name parts (e.g., "13", "14 Pro", "SE")
      const modelParts = modelLower.split(/\s+/);
      const searchParts = searchTerm.split(/\s+/);
      
      // Check if all search parts are found in model parts
      return searchParts.every(searchPart => 
        modelParts.some(modelPart => 
          modelPart.includes(searchPart) || searchPart.includes(modelPart)
        )
      );
    });
    if (modelMatch) detected.model = modelMatch;

    // Detect GB/storage - match numbers followed by GB or just numbers
    const gbMatch = uniqueValues.gbs.find(gb => {
      if (!gb) return false;
      const gbLower = gb.toLowerCase();
      return searchTerm.includes(gbLower) || 
             // Match just the number part (e.g., "128" matches "128GB")
             (gbLower.replace(/[^\d]/g, '') && searchTerm.includes(gbLower.replace(/[^\d]/g, '')));
    });
    if (gbMatch) detected.gb = gbMatch;

    // Detect color
    const colorMatch = uniqueValues.colors.find(c => 
      c && searchTerm.includes(c.toLowerCase())
    );
    if (colorMatch) detected.color = colorMatch;

    // Detect lock status
    const lockMatch = uniqueValues.lockStatuses.find(ls => 
      ls && searchTerm.includes(ls.toLowerCase())
    );
    if (lockMatch) detected.lockStatus = lockMatch;

    setDetectedFilters(detected);
    onFiltersChange(detected);
  }, [uniqueValues, onFiltersChange]);

  useEffect(() => {
    detectFilters(searchInput);
  }, [searchInput, detectFilters]);

  const handleClear = () => {
    setSearchInput("");
    setDetectedFilters({});
    onFiltersChange({});
  };

  const hasDetectedFilters = Object.keys(detectedFilters).length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Smart search: try '13 Pro 128' or 'AB GRADE 256GB Black' or just '14'"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 pr-10"
          data-testid="input-smart-filter-search"
        />
        {searchInput && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
            data-testid="button-clear-smart-search"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {hasDetectedFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Detected filters:</span>
          {detectedFilters.grade && (
            <Badge variant="secondary" className="text-xs">
              Grade: {detectedFilters.grade}
            </Badge>
          )}
          {detectedFilters.model && (
            <Badge variant="secondary" className="text-xs">
              Model: {detectedFilters.model}
            </Badge>
          )}
          {detectedFilters.gb && (
            <Badge variant="secondary" className="text-xs">
              Storage: {detectedFilters.gb}
            </Badge>
          )}
          {detectedFilters.color && (
            <Badge variant="secondary" className="text-xs">
              Color: {detectedFilters.color}
            </Badge>
          )}
          {detectedFilters.lockStatus && (
            <Badge variant="secondary" className="text-xs">
              Lock: {detectedFilters.lockStatus}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
