import { useState, useMemo } from "react";
import { InventoryItem } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InvMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

export default function InvMatchDialog({ open, onOpenChange, items }: InvMatchDialogProps) {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedGB, setSelectedGB] = useState<string>("");
  const [pastedIMEIs, setPastedIMEIs] = useState("");
  const [matchMode, setMatchMode] = useState<"missing" | "duplicates">("missing");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { toast } = useToast();

  const models = useMemo(() => {
    const modelSet = new Set(items.map(item => item.model).filter(Boolean));
    return Array.from(modelSet).sort();
  }, [items]);

  const gbOptions = useMemo(() => {
    const gbSet = new Set(items.map(item => item.gb).filter(Boolean));
    return Array.from(gbSet).sort();
  }, [items]);

  const filteredInventory = useMemo(() => {
    return items.filter(item => {
      const modelMatch = !selectedModel || item.model === selectedModel;
      const gbMatch = !selectedGB || item.gb === selectedGB;
      return modelMatch && gbMatch;
    });
  }, [items, selectedModel, selectedGB]);

  const inventoryIMEIs = useMemo(() => {
    return new Set(filteredInventory.map(item => item.imei?.trim()).filter(Boolean));
  }, [filteredInventory]);

  const parsedIMEIs = useMemo(() => {
    return pastedIMEIs
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [pastedIMEIs]);

  const { missingIMEIs, matchedIMEIs, duplicateIMEIs } = useMemo(() => {
    const missing: string[] = [];
    const matched: string[] = [];
    const duplicates: string[] = [];
    const seen = new Map<string, number>();

    parsedIMEIs.forEach(imei => {
      const count = (seen.get(imei) || 0) + 1;
      seen.set(imei, count);

      if (count > 1) {
        if (!duplicates.includes(imei)) {
          duplicates.push(imei);
        }
      }

      if (inventoryIMEIs.has(imei)) {
        if (count === 1) {
          matched.push(imei);
        }
      } else {
        if (count === 1) {
          missing.push(imei);
        }
      }
    });

    return { missingIMEIs: missing, matchedIMEIs: matched, duplicateIMEIs: duplicates };
  }, [parsedIMEIs, inventoryIMEIs]);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast({
        title: "Copied!",
        description: "IMEIs copied to clipboard. Ready to paste into Google Sheets.",
      });
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please try again or copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSelectedModel("");
    setSelectedGB("");
    setPastedIMEIs("");
    setMatchMode("missing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Match Tool</DialogTitle>
          <DialogDescription>
            Compare IMEIs against your inventory to find missing devices or duplicates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-select">Filter by Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model-select" data-testid="select-model">
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
              <Label htmlFor="gb-select">Filter by Storage</Label>
              <Select value={selectedGB} onValueChange={setSelectedGB}>
                <SelectTrigger id="gb-select" data-testid="select-gb">
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
              <Label htmlFor="mode-select">Match Mode</Label>
              <Select value={matchMode} onValueChange={(v) => setMatchMode(v as any)}>
                <SelectTrigger id="mode-select" data-testid="select-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing">Find Missing</SelectItem>
                  <SelectItem value="duplicates">Find Duplicates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imei-input">
              Paste IMEIs (one per line)
            </Label>
            <Textarea
              id="imei-input"
              data-testid="textarea-imeis"
              placeholder="356938035643809&#10;356938035643810&#10;356938035643811"
              value={pastedIMEIs}
              onChange={(e) => setPastedIMEIs(e.target.value)}
              className="min-h-32 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {parsedIMEIs.length} IMEIs pasted • {filteredInventory.length} devices in filtered inventory
            </p>
          </div>

          {parsedIMEIs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">MATCHED</h4>
                    <Badge variant="default">{matchedIMEIs.length}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {matchedIMEIs.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Found in inventory</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">MISSING</h4>
                    <Badge variant="destructive">{missingIMEIs.length}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {missingIMEIs.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Not in inventory</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">DUPLICATES</h4>
                    <Badge variant="secondary">{duplicateIMEIs.length}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {duplicateIMEIs.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Appear multiple times</p>
                </div>
              </Card>
            </div>
          )}

          {parsedIMEIs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchMode === "missing" && missingIMEIs.length > 0 && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <h4 className="font-semibold">Missing from Inventory</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(missingIMEIs.join('\n'), 'missing')}
                      data-testid="button-copy-missing"
                    >
                      {copiedSection === 'missing' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {missingIMEIs.map((imei, idx) => (
                      <div
                        key={idx}
                        className="text-sm font-mono p-2 bg-muted rounded-md"
                        data-testid={`text-missing-${idx}`}
                      >
                        {imei}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {matchMode === "duplicates" && duplicateIMEIs.length > 0 && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <h4 className="font-semibold">Duplicate IMEIs</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(duplicateIMEIs.join('\n'), 'duplicates')}
                      data-testid="button-copy-duplicates"
                    >
                      {copiedSection === 'duplicates' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {duplicateIMEIs.map((imei, idx) => (
                      <div
                        key={idx}
                        className="text-sm font-mono p-2 bg-muted rounded-md"
                        data-testid={`text-duplicate-${idx}`}
                      >
                        {imei}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {matchedIMEIs.length > 0 && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold">Matched in Inventory</h4>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(matchedIMEIs.join('\n'), 'matched')}
                      data-testid="button-copy-matched"
                    >
                      {copiedSection === 'matched' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {matchedIMEIs.map((imei, idx) => (
                      <div
                        key={idx}
                        className="text-sm font-mono p-2 bg-muted rounded-md"
                        data-testid={`text-matched-${idx}`}
                      >
                        {imei}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleReset} data-testid="button-reset">
              Reset
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-close">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
