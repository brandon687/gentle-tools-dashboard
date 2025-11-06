import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMEISearchDialog } from "@/components/IMEISearchDialog";
import { BulkIMEISearchDialog } from "@/components/BulkIMEISearchDialog";

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function Header({ onRefresh, isRefreshing }: HeaderProps) {
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 h-16 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-sm">GT</span>
            </div>
            <h1 className="text-xl font-semibold">GENTLE TOOLS</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IMEISearchDialog />
          <BulkIMEISearchDialog />
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </header>
  );
}
