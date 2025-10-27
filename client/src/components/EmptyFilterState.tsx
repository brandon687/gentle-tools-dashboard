import { Search, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EmptyFilterStateProps {
  hasActiveFilters: boolean;
}

export default function EmptyFilterState({ hasActiveFilters }: EmptyFilterStateProps) {
  if (!hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No inventory items</h3>
        <p className="text-muted-foreground max-w-md">
          Your inventory is currently empty. Add items to get started.
        </p>
      </div>
    );
  }

  return (
    <Alert className="border-2">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="text-lg">No items match your search criteria</AlertTitle>
      <AlertDescription className="text-base mt-2">
        <p className="mb-2">
          The model or combination you're searching for doesn't exist in the current inventory.
        </p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or using the "Clear All" button to start a new search.
        </p>
      </AlertDescription>
    </Alert>
  );
}
