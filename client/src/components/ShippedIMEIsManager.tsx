import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Trash2, Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ShippedIMEIsManagerProps {
  shippedIMEIs: string[];
  onUpdateShippedIMEIs: () => void;
}

export default function ShippedIMEIsManager({ shippedIMEIs, onUpdateShippedIMEIs }: ShippedIMEIsManagerProps) {
  const [inputText, setInputText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addIMEIsMutation = useMutation({
    mutationFn: async (imeis: string[]) => {
      const res = await fetch('/api/shipped-imeis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imeis }),
      });
      if (!res.ok) throw new Error('Failed to add IMEIs');
      return res.json();
    },
    onSuccess: () => {
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

    await addIMEIsMutation.mutateAsync(lines);
    setInputText("");

    toast({
      title: "IMEIs Added",
      description: `${lines.length} IMEI(s) added to dump list`,
    });
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
    navigator.clipboard.writeText(shippedIMEIs.join('\n'));
    toast({
      title: "Copied",
      description: "Dump IMEIs copied to clipboard",
    });
  };

  const handleDownloadCSV = () => {
    const csv = shippedIMEIs.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dump-imeis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Dump IMEIs downloaded as CSV",
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
            Paste IMEIs (one per line) for items that have been shipped or ordered. These will be excluded from the Physical Inventory count.
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
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <div className="divide-y">
                {shippedIMEIs.map((imei, index) => (
                  <div key={imei} className="flex items-center justify-between p-3 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-8">#{index + 1}</span>
                      <span className="font-mono text-sm">{imei}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveIMEI(imei)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
