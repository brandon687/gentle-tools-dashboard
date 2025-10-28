import { useState, useMemo, memo } from "react";
import { InventoryItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { sortModelsByHierarchy, sortGBOptions, sortColors } from "@/lib/modelSorting";

interface ExpandableGradeSectionProps {
  items: InventoryItem[];
}

interface GroupedData {
  [grade: string]: {
    [model: string]: {
      [gb: string]: {
        [color: string]: InventoryItem[];
      };
    };
  };
}

const ExpandableGradeSection = memo(({ items }: ExpandableGradeSectionProps) => {
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [expandedGB, setExpandedGB] = useState<Set<string>>(new Set());
  const [selectedDevices, setSelectedDevices] = useState<InventoryItem[] | null>(null);
  const { toast } = useToast();

  const groupedData = useMemo((): GroupedData => {
    const data: GroupedData = {};
    
    items.forEach(item => {
      const grade = item.grade || 'Unknown';
      const model = item.model || 'Unknown';
      const gb = item.gb || 'Unknown';
      const color = item.color || 'Unknown';
      
      if (!data[grade]) data[grade] = {};
      if (!data[grade][model]) data[grade][model] = {};
      if (!data[grade][model][gb]) data[grade][model][gb] = {};
      if (!data[grade][model][gb][color]) data[grade][model][gb][color] = [];
      
      data[grade][model][gb][color].push(item);
    });
    
    return data;
  }, [items]);

  const gradeStats = useMemo(() => {
    return Object.entries(groupedData).map(([grade, models]) => {
      const count = Object.values(models).reduce((acc, gbs) => 
        acc + Object.values(gbs).reduce((acc2, colors) => 
          acc2 + Object.values(colors).reduce((acc3, items) => acc3 + items.length, 0), 0), 0);
      return { grade, count };
    }).sort((a, b) => b.count - a.count);
  }, [groupedData]);

  const toggleGrade = (grade: string) => {
    setExpandedGrades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(grade)) {
        newSet.delete(grade);
      } else {
        newSet.add(grade);
      }
      return newSet;
    });
  };

  const toggleModel = (key: string) => {
    setExpandedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleGB = (key: string) => {
    setExpandedGB(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const showDevices = (devices: InventoryItem[]) => {
    setSelectedDevices(devices);
  };

  const copyIMEIs = async (devices: InventoryItem[]) => {
    const imeiList = devices.map(item => item.imei).filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(imeiList);
      toast({
        title: "Copied!",
        description: `${devices.length} IMEIs copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadFullData = (devices: InventoryItem[]) => {
    const headers = ['IMEI', 'MODEL', 'GB', 'COLOR', 'LOCK STATUS', 'GRADE'];
    const rows = devices.map(d => [
      d.imei || '',
      d.model || '',
      d.gb || '',
      d.color || '',
      d.lockStatus || '',
      d.grade || ''
    ].map(f => `"${f}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `devices_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV Downloaded",
      description: `${devices.length} devices exported successfully.`,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gradeStats.map(({ grade, count }) => {
          // Collect all devices for this grade
          const gradeDevices: InventoryItem[] = [];
          Object.values(groupedData[grade]).forEach(gbs => {
            Object.values(gbs).forEach(colors => {
              Object.values(colors).forEach(deviceList => {
                gradeDevices.push(...deviceList);
              });
            });
          });
          
          return (
          <Card key={grade} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg font-semibold">{grade}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {count}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyIMEIs(gradeDevices)}
                    title="Copy all IMEIs for this grade"
                    data-testid={`button-copy-grade-${grade}`}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => downloadFullData(gradeDevices)}
                    title="Download all data for this grade as CSV"
                    data-testid={`button-download-grade-${grade}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleGrade(grade)}
                className="w-full justify-start hover-elevate active-elevate-2"
                data-testid={`button-toggle-grade-${grade}`}
              >
                {expandedGrades.has(grade) ? (
                  <ChevronDown className="w-4 h-4 mr-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                {expandedGrades.has(grade) ? 'Collapse' : 'Expand'} Models
              </Button>

              {expandedGrades.has(grade) && (
                <div className="space-y-2 pl-4 border-l-2 border-border ml-2">
                  {Object.entries(groupedData[grade])
                    .sort(([a], [b]) => sortModelsByHierarchy(a, b))
                    .map(([model, gbs]) => {
                    const modelKey = `${grade}-${model}`;
                    const modelCount = Object.values(gbs).reduce((acc, colors) => 
                      acc + Object.values(colors).reduce((acc2, items) => acc2 + items.length, 0), 0);
                    
                    // Collect all devices for this model
                    const modelDevices: InventoryItem[] = [];
                    Object.values(gbs).forEach(colors => {
                      Object.values(colors).forEach(deviceList => {
                        modelDevices.push(...deviceList);
                      });
                    });
                    
                    return (
                      <div key={modelKey} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 group">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleModel(modelKey)}
                            className="flex-1 justify-start text-sm hover-elevate active-elevate-2"
                            data-testid={`button-toggle-model-${modelKey}`}
                          >
                            {expandedModels.has(modelKey) ? (
                              <ChevronDown className="w-3 h-3 mr-2" />
                            ) : (
                              <ChevronRight className="w-3 h-3 mr-2" />
                            )}
                            <span className="font-medium">{model}</span>
                            <Badge variant="outline" className="ml-auto mr-2">
                              {modelCount}
                            </Badge>
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyIMEIs(modelDevices)}
                              title="Copy IMEIs"
                              data-testid={`button-copy-model-${modelKey}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => downloadFullData(modelDevices)}
                              title="Download CSV"
                              data-testid={`button-download-model-${modelKey}`}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {expandedModels.has(modelKey) && (
                          <div className="space-y-1 pl-4 border-l border-border ml-2">
                            {Object.entries(gbs)
                              .sort(([a], [b]) => sortGBOptions(a, b))
                              .map(([gb, colors]) => {
                              const gbKey = `${modelKey}-${gb}`;
                              const gbCount = Object.values(colors).reduce((acc, items) => acc + items.length, 0);
                              
                              // Collect all devices for this GB
                              const gbDevices: InventoryItem[] = [];
                              Object.values(colors).forEach(deviceList => {
                                gbDevices.push(...deviceList);
                              });
                              
                              return (
                                <div key={gbKey} className="space-y-1">
                                  <div className="flex items-center justify-between gap-2 group">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleGB(gbKey)}
                                      className="flex-1 justify-start text-sm hover-elevate active-elevate-2"
                                      data-testid={`button-toggle-gb-${gbKey}`}
                                    >
                                      {expandedGB.has(gbKey) ? (
                                        <ChevronDown className="w-3 h-3 mr-2" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 mr-2" />
                                      )}
                                      <span>{gb}</span>
                                      <Badge variant="outline" className="ml-auto mr-2">
                                        {gbCount}
                                      </Badge>
                                    </Button>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyIMEIs(gbDevices)}
                                        title="Copy IMEIs"
                                        data-testid={`button-copy-gb-${gbKey}`}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => downloadFullData(gbDevices)}
                                        title="Download CSV"
                                        data-testid={`button-download-gb-${gbKey}`}
                                      >
                                        <Download className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {expandedGB.has(gbKey) && (
                                    <div className="space-y-1 pl-4 border-l border-border ml-2">
                                      {Object.entries(colors)
                                        .sort(([a], [b]) => sortColors(a, b))
                                        .map(([color, deviceList]) => {
                                        const colorKey = `${gbKey}-${color}`;
                                        
                                        return (
                                          <div
                                            key={colorKey}
                                            className="flex items-center justify-between gap-2 py-1 px-2 rounded hover-elevate active-elevate-2 cursor-pointer"
                                            onDoubleClick={() => showDevices(deviceList)}
                                            data-testid={`color-item-${colorKey}`}
                                          >
                                            <span className="text-sm">{color}</span>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="secondary" className="text-xs">
                                                {deviceList.length}
                                              </Badge>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  copyIMEIs(deviceList);
                                                }}
                                                data-testid={`button-copy-${colorKey}`}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
        })}
      </div>

      <Dialog open={selectedDevices !== null} onOpenChange={() => setSelectedDevices(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
            <DialogDescription>
              {selectedDevices?.length} device{selectedDevices?.length !== 1 ? 's' : ''} in this group
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>IMEI</TableHead>
                  <TableHead>MODEL</TableHead>
                  <TableHead>GB</TableHead>
                  <TableHead>COLOR</TableHead>
                  <TableHead>LOCK STATUS</TableHead>
                  <TableHead>GRADE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDevices?.map((device, idx) => (
                  <TableRow
                    key={idx}
                    className="hover-elevate"
                    data-testid={`device-row-${idx}`}
                  >
                    <TableCell className="font-mono text-sm">{device.imei || 'N/A'}</TableCell>
                    <TableCell>{device.model || 'N/A'}</TableCell>
                    <TableCell>{device.gb || 'N/A'}</TableCell>
                    <TableCell>{device.color || 'N/A'}</TableCell>
                    <TableCell>{device.lockStatus || 'N/A'}</TableCell>
                    <TableCell>{device.grade || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => selectedDevices && copyIMEIs(selectedDevices)}
              data-testid="button-copy-imeis-only"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy IMEIs Only
            </Button>
            <Button
              variant="outline"
              onClick={() => selectedDevices && downloadFullData(selectedDevices)}
              data-testid="button-download-full-data"
            >
              <Download className="w-4 h-4 mr-2" />
              Download as CSV
            </Button>
            <Button variant="ghost" onClick={() => setSelectedDevices(null)} data-testid="button-close-devices">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

ExpandableGradeSection.displayName = 'ExpandableGradeSection';

export default ExpandableGradeSection;
