import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, CheckCircle2, XCircle, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BatchSearchResult {
  results: Array<{
    found: boolean;
    imei: string;
    currentStatus?: string;
    model?: string;
    gb?: string;
    currentGrade?: string;
  }>;
  summary: {
    total: number;
    found: number;
    notFound: number;
  };
}

export function BulkIMEISearchDialog() {
  const [open, setOpen] = useState(false);
  const [imeiText, setImeiText] = useState("");
  const [searchResult, setSearchResult] = useState<BatchSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    // Parse IMEIs from text (newline, comma, or space separated)
    const imeis = imeiText
      .split(/[\n,\s]+/)
      .map(i => i.trim())
      .filter(i => i.length > 0);

    if (imeis.length === 0) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/search/imei/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imeis }),
      });
      const data = await response.json();
      setSearchResult(data);
    } catch (error) {
      console.error("Bulk search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setImeiText("");
    setSearchResult(null);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "in_stock":
        return "bg-green-500";
      case "shipped":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const exportResults = () => {
    if (!searchResult) return;

    const csv = [
      ["IMEI", "Found", "Status", "Model", "Storage", "Grade"].join(","),
      ...searchResult.results.map(r =>
        [
          r.imei,
          r.found ? "YES" : "NO",
          r.found ? (r.currentStatus || "").toUpperCase() : "",
          r.found ? (r.model || "") : "",
          r.found ? (r.gb || "") : "",
          r.found ? (r.currentGrade || "") : "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imei-bulk-search-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ListChecks className="h-4 w-4" />
          Bulk IMEI Search
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk IMEI Search</DialogTitle>
          <DialogDescription>
            {isSearching ? "Searching database..." : "Paste multiple IMEIs to check which ones are in inventory"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Input Section */}
          {!searchResult && (
            <div className="space-y-4">
              <Textarea
                placeholder="Paste IMEIs here (one per line)&#10;&#10;Example:&#10;354155255208211&#10;356226676664213&#10;354066787123440&#10;358057915125387&#10;356752985498415"
                value={imeiText}
                onChange={(e) => setImeiText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                autoFocus
              />

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {imeiText.split(/[\n,\s]+/).filter(i => i.trim().length > 0).length} IMEIs ready to search
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !imeiText.trim()}
                  >
                    {isSearching ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Searching...
                      </>
                    ) : (
                      <>
                        <ListChecks className="h-4 w-4 mr-2" />
                        Search All
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium mb-2">Supported Formats:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• One IMEI per line</li>
                    <li>• Comma separated: 123456789012345, 098765432109876</li>
                    <li>• Space separated: 123456789012345 098765432109876</li>
                    <li>• Mixed formats (will be parsed automatically)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Section */}
          {searchResult && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Searched
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{searchResult.summary.total}</p>
                  </CardContent>
                </Card>
                <Card className="border-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      {searchResult.summary.found}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {((searchResult.summary.found / searchResult.summary.total) * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-red-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Not Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">
                      {searchResult.summary.notFound}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {((searchResult.summary.notFound / searchResult.summary.total) * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Bar */}
              <Progress
                value={(searchResult.summary.found / searchResult.summary.total) * 100}
                className="h-2"
              />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear}>
                  New Search
                </Button>
                <Button variant="outline" onClick={exportResults}>
                  <Upload className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              {/* Results List */}
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-4 space-y-2">
                  {searchResult.results.map((result, index) => (
                    <Card
                      key={index}
                      className={`transition-colors ${
                        result.found
                          ? "border-green-200 bg-green-50/50"
                          : "border-red-200 bg-red-50/50"
                      }`}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {result.found ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="font-mono font-semibold text-sm">
                                {result.imei}
                              </p>
                              {result.found && (
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge className={getStatusColor(result.currentStatus)}>
                                    {result.currentStatus?.replace("_", " ").toUpperCase()}
                                  </Badge>
                                  {result.model && (
                                    <span className="text-xs text-muted-foreground">
                                      {result.model} {result.gb}
                                    </span>
                                  )}
                                  {result.currentGrade && (
                                    <Badge variant="outline" className="text-xs">
                                      {result.currentGrade}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {!result.found && (
                                <p className="text-xs text-red-600 mt-1">
                                  Not in inventory
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
