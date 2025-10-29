import { useState, useMemo } from "react";
import { InventoryItem } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, AlertCircle, CheckCircle2, Minus, AlertTriangle, Save, FileDown } from "lucide-react";
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
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedGB, setSelectedGB] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedLockStatus, setSelectedLockStatus] = useState<string>("");
  const [pastedIMEIs, setPastedIMEIs] = useState("");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const { toast } = useToast();

  const grades = useMemo(() => {
    const gradeSet = new Set(items.map(item => item.grade).filter(Boolean));
    return Array.from(gradeSet).sort();
  }, [items]);

  const models = useMemo(() => {
    const modelSet = new Set(items.map(item => item.model).filter(Boolean));
    return Array.from(modelSet).sort();
  }, [items]);

  const gbOptions = useMemo(() => {
    const gbSet = new Set(items.map(item => item.gb).filter(Boolean));
    return Array.from(gbSet).sort();
  }, [items]);

  const colors = useMemo(() => {
    const colorSet = new Set(items.map(item => item.color).filter(Boolean));
    return Array.from(colorSet).sort();
  }, [items]);

  const lockStatuses = useMemo(() => {
    const statusSet = new Set(items.map(item => item.lockStatus).filter(Boolean));
    return Array.from(statusSet).sort();
  }, [items]);

  const filteredInventory = useMemo(() => {
    return items.filter(item => {
      const gradeMatch = !selectedGrade || selectedGrade === "all" || item.grade === selectedGrade;
      const modelMatch = !selectedModel || selectedModel === "all" || item.model === selectedModel;
      const gbMatch = !selectedGB || selectedGB === "all" || item.gb === selectedGB;
      const colorMatch = !selectedColor || selectedColor === "all" || item.color === selectedColor;
      const lockStatusMatch = !selectedLockStatus || selectedLockStatus === "all" || item.lockStatus === selectedLockStatus;
      return gradeMatch && modelMatch && gbMatch && colorMatch && lockStatusMatch;
    });
  }, [items, selectedGrade, selectedModel, selectedGB, selectedColor, selectedLockStatus]);

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
    setSelectedGrade("");
    setSelectedModel("");
    setSelectedGB("");
    setSelectedColor("");
    setSelectedLockStatus("");
    setPastedIMEIs("");
  };

  const handleSaveWorksheet = () => {
    if (!operatorName.trim()) {
      toast({
        title: "Operator Name Required",
        description: "Please enter the operator name before saving the worksheet.",
        variant: "destructive",
      });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const worksheetData = {
      timestamp,
      operator: operatorName.trim(),
      filters: {
        grade: selectedGrade || 'all',
        model: selectedModel || 'all',
        gb: selectedGB || 'all',
        color: selectedColor || 'all',
        lockStatus: selectedLockStatus || 'all',
      },
      stats: {
        inventoryCount: filteredInventory.length,
        scannedCount: parsedIMEIs.length,
        matchedCount,
        wrongModelCount: wrongModelIMEIs.length,
        notFoundCount: notFoundIMEIs.length,
      },
      scannedIMEIs: parsedIMEIs,
      notFoundIMEIs,
      wrongModelIMEIs: wrongModelIMEIs.map(item => ({
        imei: item.imei,
        actualModel: item.item.model,
        actualGB: item.item.gb,
        actualColor: item.item.color,
        actualGrade: item.item.grade,
        actualLockStatus: item.item.lockStatus,
      })),
      matchedItems: filteredInventory.filter(item => 
        item.imei && scannedIMEISet.has(item.imei.trim())
      ),
    };

    // Save to localStorage
    const savedWorksheets = JSON.parse(localStorage.getItem('inventoryWorksheets') || '[]');
    savedWorksheets.push(worksheetData);
    localStorage.setItem('inventoryWorksheets', JSON.stringify(savedWorksheets));

    // Download as JSON file
    const blob = new Blob([JSON.stringify(worksheetData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worksheet_${timestamp}_${operatorName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Worksheet Saved",
      description: `Worksheet saved successfully for operator: ${operatorName}`,
    });
    
    setShowSaveDialog(false);
    setOperatorName("");
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-2">
              <Label htmlFor="grade-select" className="text-xs">Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger id="grade-select" data-testid="select-grade" className="h-9">
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
              <Label htmlFor="model-select" className="text-xs">Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model-select" data-testid="select-model" className="h-9">
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
              <Label htmlFor="gb-select" className="text-xs">Storage</Label>
              <Select value={selectedGB} onValueChange={setSelectedGB}>
                <SelectTrigger id="gb-select" data-testid="select-gb" className="h-9">
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
              <Label htmlFor="color-select" className="text-xs">Color</Label>
              <Select value={selectedColor} onValueChange={setSelectedColor}>
                <SelectTrigger id="color-select" data-testid="select-color" className="h-9">
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
              <Label htmlFor="lock-select" className="text-xs">Lock Status</Label>
              <Select value={selectedLockStatus} onValueChange={setSelectedLockStatus}>
                <SelectTrigger id="lock-select" data-testid="select-lock" className="h-9">
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

          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
            <span className="text-sm">
              Inventory: <strong>{filteredInventory.length}</strong> • 
              Scanned: <strong>{parsedIMEIs.length}</strong> • 
              Matched: <strong className="text-green-600">{matchedCount}</strong> • 
              Wrong Model: <strong className="text-yellow-600">{wrongModelIMEIs.length}</strong> • 
              Not Found: <strong className="text-red-600">{notFoundIMEIs.length}</strong>
            </span>
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

        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowSaveDialog(true)}
            disabled={parsedIMEIs.length === 0}
            data-testid="button-save-worksheet"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Worksheet
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-close">
            Close
          </Button>
        </div>
      </DialogContent>
      
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Worksheet</DialogTitle>
            <DialogDescription>
              Save the current inventory match session as a worksheet
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Timestamp</Label>
              <Input 
                value={new Date().toLocaleString()} 
                disabled 
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="operator-name">Operator Name *</Label>
              <Input
                id="operator-name"
                placeholder="Enter your name"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && operatorName.trim()) {
                    handleSaveWorksheet();
                  }
                }}
                autoFocus
              />
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This worksheet will include:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Current filters and settings</li>
                <li>Scanned IMEIs ({parsedIMEIs.length} items)</li>
                <li>Match results and statistics</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveWorksheet}
              disabled={!operatorName.trim()}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Save & Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
