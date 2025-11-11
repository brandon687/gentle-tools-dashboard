import { RefreshCw, LogOut, User, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { IMEISearchDialog } from "@/components/IMEISearchDialog";
import { BulkIMEISearchDialog } from "@/components/BulkIMEISearchDialog";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function Header({ onRefresh, isRefreshing }: HeaderProps) {
  const { user, logout, isAdmin } = useAuth();

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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <Crown className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Shield className="w-4 h-4 text-blue-400" />
                  )}
                  <span>{isAdmin ? 'Admin' : 'Power User'}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-400">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
