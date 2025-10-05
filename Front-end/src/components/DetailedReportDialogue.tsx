import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, AlertCircle } from "lucide-react";
import { PlagiarismCheckResult } from "@/services/api";

interface DetailedReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkType: "local" | "ai" | null;
  checkResult?: PlagiarismCheckResult | null;
}

const DetailedReportDialog = ({
  open,
  onOpenChange,
  checkType,
  checkResult,
}: DetailedReportDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Detailed Plagiarism Report</DialogTitle>
          <DialogDescription>
            {checkType === "local"
              ? "Matching lines and words found between the two documents"
              : "Sources found on the internet with similar content"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {!checkResult ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No check results available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{checkResult.overallScore.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{checkResult.localScore.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Local File Comparison</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Web Sources */}
              {checkResult.webSources && checkResult.webSources.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Web Sources</h3>
                  {checkResult.webSources.map((source, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{source.title}</h4>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {source.url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <span className="text-sm font-semibold text-destructive">
                            {source.score.toFixed(1)}% Match
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* File Matches */}
              {checkResult.localHighlights && checkResult.localHighlights.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-orange-600">📄 File Matches</h3>
                  <p className="text-sm text-muted-foreground">
                    Direct text comparisons between the uploaded files
                  </p>
                  {checkResult.localHighlights.map((highlight, index) => (
                    <Card key={index} className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-orange-600">
                              Exact Match
                            </span>
                            {highlight.lineA > 0 && highlight.lineB > 0 && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                Lines {highlight.lineA} → {highlight.lineB}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-orange-600">
                            {highlight.score.toFixed(1)}% Match
                          </span>
                        </div>
                        
                        {/* Text A (Source) */}
                        {highlight.textA && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Source Text:
                            </div>
                            <div className="bg-orange-50 p-3 rounded text-sm font-mono border border-orange-200">
                              {highlight.textA}
                            </div>
                          </div>
                        )}
                        
                        {/* Text B (Matched) */}
                        {highlight.textB && (
                          <div className="mb-3">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Matched Text:
                            </div>
                            <div className="bg-orange-100 p-3 rounded text-sm font-mono border border-orange-300">
                              {highlight.textB}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Position: {highlight.start}-{highlight.end}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {(!checkResult.webSources || checkResult.webSources.length === 0) && 
               (!checkResult.highlights || checkResult.highlights.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No detailed matches found</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DetailedReportDialog;
