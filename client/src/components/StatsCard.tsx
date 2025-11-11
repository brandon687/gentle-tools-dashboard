import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LucideIcon, Eye, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  imeis?: string[];
}

export default function StatsCard({ title, value, icon: Icon, description, imeis }: StatsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyImeis = async () => {
    if (!imeis || imeis.length === 0) return;

    try {
      const imeiText = imeis.join('\n');
      await navigator.clipboard.writeText(imeiText);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: `${imeis.length} IMEIs copied to clipboard`,
        duration: 2000,
      });

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy IMEIs to clipboard',
        variant: 'destructive',
      });
    }
  };

  const hasImeis = imeis && imeis.length > 0;

  return (
    <>
      <Card
        className={`p-6 hover-elevate ${hasImeis ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
        data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={() => hasImeis && setDialogOpen(true)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {hasImeis && (
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <Eye className="w-3 h-3" />
                <span>Click to view IMEIs</span>
              </div>
            )}
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </Card>

      {/* IMEI List Dialog */}
      {hasImeis && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                {title}: {value}
              </DialogTitle>
              <DialogDescription>
                {description || 'List of IMEIs in this category'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{imeis.length.toLocaleString()} IMEIs</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyImeis}
                  className="h-8 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy All
                    </>
                  )}
                </Button>
              </div>

              <ScrollArea className="h-[60vh] border rounded-md p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {imeis.map((imei, idx) => (
                    <div key={idx} className="text-muted-foreground">
                      {imei}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
