import { useState, useMemo } from "react";
import { InventoryItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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

export default function ExpandableGradeSection({ items }: ExpandableGradeSectionProps) {
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [expandedGB, setExpandedGB] = useState<Set<string>>(new Set());
  const [selectedIMEIs, setSelectedIMEIs] = useState<InventoryItem[] | null>(null);
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
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) {
      newExpanded.delete(grade);
    } else {
      newExpanded.add(grade);
    }
    setExpandedGrades(newExpanded);
  };

  const toggleModel = (key: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedModels(newExpanded);
  };

  const toggleGB = (key: string) => {
    const newExpanded = new Set(expandedGB);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGB(newExpanded);
  };

  const showIMEIs = (imeis: InventoryItem[]) => {
    setSelectedIMEIs(imeis);
  };

  const copyIMEIs = async (imeis: InventoryItem[]) => {
    const imeiList = imeis.map(item => item.imei).filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(imeiList);
      toast({
        title: "Copied!",
        description: `${imeis.length} IMEIs copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gradeStats.map(({ grade, count }) => (
          <Card key={grade} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg font-semibold">{grade}</CardTitle>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {count}
                </Badge>
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
                  {Object.entries(groupedData[grade]).map(([model, gbs]) => {
                    const modelKey = `${grade}-${model}`;
                    const modelCount = Object.values(gbs).reduce((acc, colors) => 
                      acc + Object.values(colors).reduce((acc2, items) => acc2 + items.length, 0), 0);
                    
                    return (
                      <div key={modelKey} className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleModel(modelKey)}
                          className="w-full justify-start text-sm hover-elevate active-elevate-2"
                          data-testid={`button-toggle-model-${modelKey}`}
                        >
                          {expandedModels.has(modelKey) ? (
                            <ChevronDown className="w-3 h-3 mr-2" />
                          ) : (
                            <ChevronRight className="w-3 h-3 mr-2" />
                          )}
                          <span className="font-medium">{model}</span>
                          <Badge variant="outline" className="ml-auto">
                            {modelCount}
                          </Badge>
                        </Button>

                        {expandedModels.has(modelKey) && (
                          <div className="space-y-1 pl-4 border-l border-border ml-2">
                            {Object.entries(gbs).map(([gb, colors]) => {
                              const gbKey = `${modelKey}-${gb}`;
                              const gbCount = Object.values(colors).reduce((acc, items) => acc + items.length, 0);
                              
                              return (
                                <div key={gbKey} className="space-y-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleGB(gbKey)}
                                    className="w-full justify-start text-sm hover-elevate active-elevate-2"
                                    data-testid={`button-toggle-gb-${gbKey}`}
                                  >
                                    {expandedGB.has(gbKey) ? (
                                      <ChevronDown className="w-3 h-3 mr-2" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 mr-2" />
                                    )}
                                    <span>{gb}</span>
                                    <Badge variant="outline" className="ml-auto">
                                      {gbCount}
                                    </Badge>
                                  </Button>

                                  {expandedGB.has(gbKey) && (
                                    <div className="space-y-1 pl-4 border-l border-border ml-2">
                                      {Object.entries(colors).map(([color, imeiList]) => {
                                        const colorKey = `${gbKey}-${color}`;
                                        
                                        return (
                                          <div
                                            key={colorKey}
                                            className="flex items-center justify-between gap-2 py-1 px-2 rounded hover-elevate active-elevate-2 cursor-pointer"
                                            onDoubleClick={() => showIMEIs(imeiList)}
                                            data-testid={`color-item-${colorKey}`}
                                          >
                                            <span className="text-sm">{color}</span>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="secondary" className="text-xs">
                                                {imeiList.length}
                                              </Badge>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  copyIMEIs(imeiList);
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
        ))}
      </div>

      <Dialog open={selectedIMEIs !== null} onOpenChange={() => setSelectedIMEIs(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Individual IMEIs</DialogTitle>
            <DialogDescription>
              {selectedIMEIs?.length} device{selectedIMEIs?.length !== 1 ? 's' : ''} in this group
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-1 font-mono text-sm">
              {selectedIMEIs?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border bg-muted/50 hover-elevate"
                  data-testid={`imei-item-${idx}`}
                >
                  {item.imei || 'N/A'}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => selectedIMEIs && copyIMEIs(selectedIMEIs)}
              data-testid="button-copy-all-imeis"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy All
            </Button>
            <Button variant="ghost" onClick={() => setSelectedIMEIs(null)} data-testid="button-close-imeis">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
