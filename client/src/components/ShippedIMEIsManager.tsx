import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Trash2, Copy, Download, AlertTriangle, CheckCircle, HelpCircle, Smartphone, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ShippedIMEI {
  imei: string;
  source?: 'physical' | 'raw' | 'unknown';
  model?: string;
  grade?: string;
  supplier?: string;
  createdAt?: string;
}

interface ValidationResult {
  imei: string;
  found: boolean;
  source: 'physical' | 'raw' | 'unknown';
  model?: string;
  grade?: string;
  supplier?: string;
}

interface AddIMEIsResponse {
  success: boolean;
  stats: {
    total: number;
    found: number;
    notFound: number;
    physical: number;
    raw: number;
    unknown: number;
    inserted: number;
    skipped: number;
  };
  validationResults: ValidationResult[];
  allImeis: string[];
  message: string;
}

interface ShippedIMEIsManagerProps {
  shippedIMEIs: (string | ShippedIMEI)[];
  onUpdateShippedIMEIs: () => void;
}

export default function ShippedIMEIsManager({ shippedIMEIs, onUpdateShippedIMEIs }: ShippedIMEIsManagerProps) {
  const [inputText, setInputText] = useState("");
  const [lastValidationResults, setLastValidationResults] = useState<ValidationResult[]>([]);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addIMEIsMutation = useMutation<AddIMEIsResponse, Error, string[]>({
    mutationFn: async (imeis: string[]) => {
      const res = await fetch('/api/shipped-imeis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imeis }),
      });
      if (!res.ok) throw new Error('Failed to add IMEIs');
      return res.json();
    },
    onSuccess: (data) => {
      // Store validation results for display
      setLastValidationResults(data.validationResults || []);
      setShowValidationDetails(true);

      queryClient.invalidateQueries({ queryKey: ['/api/shipped-imeis'] });
      onUpdateShippedIMEIs();
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/shipped-imeis', {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear IMEIs');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shipped-imeis'] });
      onUpdateShippedIMEIs();
    },
  });

  const deleteIMEIMutation = useMutation({
    mutationFn: async (imei: string) => {
      const res = await fetch(`/api/shipped-imeis/${encodeURIComponent(imei)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete IMEI');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shipped-imeis'] });
      onUpdateShippedIMEIs();
    },
  });

  const handleAddIMEIs = async () => {
    const lines = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const result = await addIMEIsMutation.mutateAsync(lines);
    setInputText("");

    // Show detailed toast with validation results
    if (result && result.stats) {
      const { stats } = result;
      toast({
        title: "IMEIs Processed",
        description: result.message,
      });

      // Show warning if some IMEIs were not found
      if (stats.notFound > 0) {
        setTimeout(() => {
          toast({
            title: "Warning",
            description: `${stats.notFound} IMEI(s) were not found in any inventory but were still added to the dump list.`,
            variant: "destructive",
          });
        }, 500);
      }
    } else {
      // Fallback for legacy response
      toast({
        title: "IMEIs Added",
        description: `${lines.length} IMEI(s) added to dump list`,
      });
    }
  };

  const handleClearAll = async () => {
    if (confirm(`Are you sure you want to clear all ${shippedIMEIs.length} dump IMEIs?`)) {
      await clearAllMutation.mutateAsync();
      toast({
        title: "Cleared",
        description: "All dump IMEIs have been removed",
      });
    }
  };

  const handleCopyList = () => {
    // Extract just the IMEIs for copying
    const imeiList = shippedIMEIs.map(item =>
      typeof item === 'string' ? item : item.imei
    );
    navigator.clipboard.writeText(imeiList.join('\n'));
    toast({
      title: "Copied",
      description: "Dump IMEIs copied to clipboard",
    });
  };

  const handleDownloadCSV = () => {
    // Create CSV with metadata if available
    const headers = ['IMEI', 'Source', 'Model', 'Grade', 'Supplier'];
    const rows = shippedIMEIs.map(item => {
      if (typeof item === 'string') {
        return [item, '', '', '', ''];
      }
      return [
        item.imei,
        item.source || '',
        item.model || '',
        item.grade || '',
        item.supplier || ''
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dump-imeis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Dump IMEIs downloaded as CSV with metadata",
    });
  };

  const handleRemoveIMEI = async (imei: string) => {
    await deleteIMEIMutation.mutateAsync(imei);
    toast({
      title: "Removed",
      description: `IMEI ${imei} removed from dump list`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add Dump IMEIs
          </CardTitle>
          <CardDescription>
            Paste IMEIs (one per line) for items that have been shipped or ordered. These will be excluded from both Physical and Raw Inventory counts. The system will validate each IMEI and show where it was found.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste IMEIs here (one per line)&#10;Example:&#10;355555754760571&#10;354155251896506&#10;352803728976318"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[150px] font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={handleAddIMEIs} disabled={!inputText.trim()}>
              Add IMEIs
            </Button>
            <Button variant="outline" onClick={() => setInputText("")} disabled={!inputText.trim()}>
              Clear Input
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dump IMEI List</CardTitle>
              <CardDescription>
                Total: <Badge variant="secondary">{shippedIMEIs.length}</Badge> IMEIs in dump list
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyList}
                disabled={shippedIMEIs.length === 0}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={shippedIMEIs.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                disabled={shippedIMEIs.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {shippedIMEIs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No dump IMEIs yet</p>
              <p className="text-sm">Add IMEIs above to track items</p>
            </div>
          ) : (
            <>
              {/* Validation Results Alert (if any) */}
              {showValidationDetails && lastValidationResults.length > 0 && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Last Import Results</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2 mt-2">
                      <div className="flex gap-4 text-sm">
                        <span>
                          <CheckCircle className="inline w-3 h-3 mr-1 text-green-600" />
                          Found: {lastValidationResults.filter(r => r.found).length}
                        </span>
                        <span>
                          <HelpCircle className="inline w-3 h-3 mr-1 text-orange-600" />
                          Not Found: {lastValidationResults.filter(r => !r.found).length}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>
                          <Smartphone className="inline w-3 h-3 mr-1" />
                          Physical: {lastValidationResults.filter(r => r.source === 'physical').length}
                        </span>
                        <span>
                          <Warehouse className="inline w-3 h-3 mr-1" />
                          Raw: {lastValidationResults.filter(r => r.source === 'raw').length}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowValidationDetails(false)}
                        className="p-0 h-auto"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <div className="divide-y">
                  {shippedIMEIs.map((item, index) => {
                    const imei = typeof item === 'string' ? item : item.imei;
                    const source = typeof item === 'string' ? undefined : item.source;
                    const model = typeof item === 'string' ? undefined : item.model;
                    const grade = typeof item === 'string' ? undefined : item.grade;
                    const supplier = typeof item === 'string' ? undefined : item.supplier;

                    return (
                      <div key={imei} className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xs text-muted-foreground w-8">#{index + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{imei}</span>
                              {source && (
                                <Badge
                                  variant={
                                    source === 'physical' ? 'default' :
                                    source === 'raw' ? 'secondary' :
                                    'outline'
                                  }
                                  className="text-xs"
                                >
                                  {source === 'physical' && <Smartphone className="w-3 h-3 mr-1" />}
                                  {source === 'raw' && <Warehouse className="w-3 h-3 mr-1" />}
                                  {source === 'unknown' && <HelpCircle className="w-3 h-3 mr-1" />}
                                  {source}
                                </Badge>
                              )}
                            </div>
                            {(model || grade || supplier) && (
                              <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                                {model && <span>Model: {model}</span>}
                                {grade && <span>Grade: {grade}</span>}
                                {supplier && <span>Supplier: {supplier}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveIMEI(imei)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
