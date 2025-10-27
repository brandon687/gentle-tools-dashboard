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
import { Copy, Check, AlertCircle, CheckCircle2, Minus, AlertTriangle } from "lucide-react";
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

  const masterInventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(item => {
      if (item.imei) {
        map.set(item.imei.trim(), item);
      }
    });
    return map;
  }, [items]);

  const scannedIMEISet = useMemo(() => {
    return new Set(
      pastedIMEIs
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    );
  }, [pastedIMEIs]);

  const parsedIMEIs = useMemo(() => {
    return pastedIMEIs
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [pastedIMEIs]);

  const { wrongModelIMEIs, notFoundIMEIs, matchedCount } = useMemo(() => {
    if (parsedIMEIs.length === 0) {
      return { wrongModelIMEIs: [], notFoundIMEIs: [], matchedCount: 0 };
    }

    const filteredIMEISet = new Set(
      filteredInventory.map(item => item.imei?.trim()).filter(Boolean)
    );

    const wrongModel: Array<{ imei: string; item: InventoryItem }> = [];
    const notFound: string[] = [];
    let matched = 0;

    parsedIMEIs.forEach(imei => {
      if (filteredIMEISet.has(imei)) {
        matched++;
      } else {
        const masterItem = masterInventoryMap.get(imei);
        if (masterItem) {
          wrongModel.push({ imei, item: masterItem });
        } else {
          notFound.push(imei);
        }
      }
    });

    return { wrongModelIMEIs: wrongModel, notFoundIMEIs: notFound, matchedCount: matched };
  }, [parsedIMEIs, filteredInventory, masterInventoryMap]);

  const displayRows = useMemo(() => {
    if (parsedIMEIs.length === 0) {
      return filteredInventory.map(item => ({
        type: 'inventory' as const,
        item,
        status: 'unscanned' as const,
      }));
    }

    const rows: Array<{
      type: 'not-found' | 'wrong-model' | 'inventory';
      item?: InventoryItem;
      imei?: string;
      status: 'not-found' | 'wrong-model' | 'matched' | 'unscanned';
    }> = [];

    notFoundIMEIs.forEach(imei => {
      rows.push({ type: 'not-found', imei, status: 'not-found' });
    });

    wrongModelIMEIs.forEach(({ imei, item }) => {
      rows.push({ type: 'wrong-model', imei, item, status: 'wrong-model' });
    });

    filteredInventory.forEach(item => {
      const isMatched = item.imei && scannedIMEISet.has(item.imei.trim());
      rows.push({
        type: 'inventory',
        item,
        status: isMatched ? 'matched' : 'unscanned',
      });
    });

    return rows;
  }, [filteredInventory, notFoundIMEIs, wrongModelIMEIs, scannedIMEISet, parsedIMEIs.length]);

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
            Filter your inventory and paste scanned IMEIs to see live comparison
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
                  Matched: <strong className="text-green-600">{matchedCount}</strong> • 
                  Wrong Model: <strong className="text-yellow-600">{wrongModelIMEIs.length}</strong> • 
                  Not Found: <strong className="text-red-600">{notFoundIMEIs.length}</strong>
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
                <Label>
                  {parsedIMEIs.length === 0 
                    ? 'Filtered Inventory' 
                    : 'Live Comparison Results'}
                </Label>
                <div className="flex items-center gap-2">
                  {notFoundIMEIs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(notFoundIMEIs.join('\n'), 'not-found')}
                      data-testid="button-copy-not-found"
                    >
                      {copiedSection === 'not-found' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied Not Found
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Not Found ({notFoundIMEIs.length})
                        </>
                      )}
                    </Button>
                  )}
                  {wrongModelIMEIs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(wrongModelIMEIs.map(w => w.imei).join('\n'), 'wrong-model')}
                      data-testid="button-copy-wrong-model"
                    >
                      {copiedSection === 'wrong-model' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied Wrong Model
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Wrong Model ({wrongModelIMEIs.length})
                        </>
                      )}
                    </Button>
                  )}
                  {matchedCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const matchedIMEIs = filteredInventory
                          .filter(item => item.imei && scannedIMEISet.has(item.imei.trim()))
                          .map(item => item.imei)
                          .filter(Boolean);
                        copyToClipboard(matchedIMEIs.join('\n'), 'matched');
                      }}
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
                          Copy Matched ({matchedCount})
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
                        <TableHead>IMEI</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>GB</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Lock Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Select Model and GB filters to view inventory
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayRows.map((row, idx) => {
                          if (row.type === 'not-found') {
                            return (
                              <TableRow key={`not-found-${idx}`} className="bg-red-50 dark:bg-red-950/20">
                                <TableCell>
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                </TableCell>
                                <TableCell className="font-mono text-sm">{row.imei}</TableCell>
                                <TableCell colSpan={5}>
                                  <Badge variant="destructive">Not Found in Inventory</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          if (row.type === 'wrong-model') {
                            const item = row.item!;
                            return (
                              <TableRow key={`wrong-${idx}`} className="bg-yellow-50 dark:bg-yellow-950/20">
                                <TableCell>
                                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                </TableCell>
                                <TableCell className="font-mono text-sm">{row.imei}</TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <Badge variant="secondary" className="bg-yellow-600 text-white">Wrong Model</Badge>
                                    <div className="text-xs text-muted-foreground">
                                      Actually: {item.model} {item.gb}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{item.gb || '—'}</TableCell>
                                <TableCell>{item.color || '—'}</TableCell>
                                <TableCell>{item.grade || '—'}</TableCell>
                                <TableCell>{item.lockStatus || '—'}</TableCell>
                              </TableRow>
                            );
                          }

                          const item = row.item!;
                          const bgClass = row.status === 'matched' 
                            ? 'bg-green-50 dark:bg-green-950/20' 
                            : '';

                          return (
                            <TableRow key={`inv-${idx}`} className={bgClass}>
                              <TableCell>
                                {row.status === 'matched' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Minus className="w-4 h-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.imei || '—'}</TableCell>
                              <TableCell>{item.model || '—'}</TableCell>
                              <TableCell>{item.gb || '—'}</TableCell>
                              <TableCell>{item.color || '—'}</TableCell>
                              <TableCell>{item.grade || '—'}</TableCell>
                              <TableCell>{item.lockStatus || '—'}</TableCell>
                            </TableRow>
                          );
                        })
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
