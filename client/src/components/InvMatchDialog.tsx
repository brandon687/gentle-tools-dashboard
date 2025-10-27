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
import { Copy, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InvMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

export default function InvMatchDialog({ open, onOpenChange, items }: InvMatchDialogProps) {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedGB, setSelectedGB] = useState<string>("");
  const [pastedIMEIs, setPastedIMEIs] = useState("");
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
      const modelMatch = !selectedModel || selectedModel === "all" || item.model === selectedModel;
      const gbMatch = !selectedGB || selectedGB === "all" || item.gb === selectedGB;
      return modelMatch && gbMatch;
    });
  }, [items, selectedModel, selectedGB]);

  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    filteredInventory.forEach(item => {
      if (item.imei) {
        map.set(item.imei.trim(), item);
      }
    });
    return map;
  }, [filteredInventory]);

  const parsedIMEIs = useMemo(() => {
    return pastedIMEIs
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [pastedIMEIs]);

  const matchResults = useMemo(() => {
    const matched: Array<{ imei: string; item: InventoryItem }> = [];
    const missing: string[] = [];
    const seen = new Set<string>();

    parsedIMEIs.forEach(imei => {
      if (seen.has(imei)) return; // Skip duplicates
      seen.add(imei);

      const foundItem = inventoryMap.get(imei);
      if (foundItem) {
        matched.push({ imei, item: foundItem });
      } else {
        missing.push(imei);
      }
    });

    return { matched, missing };
  }, [parsedIMEIs, inventoryMap]);

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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Inventory Match - Remote Scan</DialogTitle>
          <DialogDescription>
            Paste IMEIs to compare against your filtered inventory in real-time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-shrink-0">
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
              <Label>Stats</Label>
              <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted">
                <span className="text-sm">
                  Inventory: <strong>{filteredInventory.length}</strong> • 
                  Scanned: <strong>{parsedIMEIs.length}</strong> • 
                  Matched: <strong className="text-green-600">{matchResults.matched.length}</strong> • 
                  Missing: <strong className="text-red-600">{matchResults.missing.length}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="imei-input">Scanned/Dump IMEIs</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  data-testid="button-reset"
                >
                  Clear
                </Button>
              </div>
              <Textarea
                id="imei-input"
                data-testid="textarea-imeis"
                placeholder="Paste IMEIs here&#10;(one per line)"
                value={pastedIMEIs}
                onChange={(e) => setPastedIMEIs(e.target.value)}
                className="min-h-[400px] font-mono text-sm resize-none"
              />
            </div>

            <div className="md:col-span-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Live Comparison Results</Label>
                <div className="flex items-center gap-2">
                  {matchResults.missing.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(matchResults.missing.join('\n'), 'missing')}
                      data-testid="button-copy-missing"
                    >
                      {copiedSection === 'missing' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied Missing
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Missing ({matchResults.missing.length})
                        </>
                      )}
                    </Button>
                  )}
                  {matchResults.matched.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(matchResults.matched.map(m => m.imei).join('\n'), 'matched')}
                      data-testid="button-copy-matched"
                    >
                      {copiedSection === 'matched' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied Matched
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Matched ({matchResults.matched.length})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead>Scanned IMEI</TableHead>
                        <TableHead>Match Status</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>GB</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedIMEIs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Paste IMEIs in the left panel to see live comparison results
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {matchResults.matched.map((match, idx) => (
                            <TableRow key={`matched-${idx}`} className="bg-green-50 dark:bg-green-950/20">
                              <TableCell>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </TableCell>
                              <TableCell className="font-mono text-sm">{match.imei}</TableCell>
                              <TableCell>
                                <Badge variant="default" className="bg-green-600">Matched</Badge>
                              </TableCell>
                              <TableCell>{match.item.model}</TableCell>
                              <TableCell>{match.item.gb}</TableCell>
                              <TableCell>{match.item.color}</TableCell>
                              <TableCell>{match.item.grade}</TableCell>
                            </TableRow>
                          ))}
                          {matchResults.missing.map((imei, idx) => (
                            <TableRow key={`missing-${idx}`} className="bg-red-50 dark:bg-red-950/20">
                              <TableCell>
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              </TableCell>
                              <TableCell className="font-mono text-sm">{imei}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">Not Found</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">—</TableCell>
                              <TableCell className="text-muted-foreground">—</TableCell>
                              <TableCell className="text-muted-foreground">—</TableCell>
                              <TableCell className="text-muted-foreground">—</TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t flex-shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-close">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
