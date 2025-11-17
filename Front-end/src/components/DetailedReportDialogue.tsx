import type { ReactNode } from "react";
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
  const formatLineRange = (start?: number | null, end?: number | null) => {
    if (typeof start === "number" && typeof end === "number" && start > 0 && end > 0) {
      return start === end ? `Line ${start}` : `Lines ${start}-${end}`;
    }
    return null;
  };

  const formatCharRange = (start?: number | null, end?: number | null) => {
    if (typeof start === "number" && typeof end === "number" && end >= start) {
      return `Chars ${start}-${end}`;
    }
    return null;
  };

  const formatPosition = (
    lineStart?: number | null,
    lineEnd?: number | null,
    charStart?: number | null,
    charEnd?: number | null
  ) => {
    return (
      formatLineRange(lineStart, lineEnd) ??
      formatCharRange(charStart, charEnd) ??
      "Not available"
    );
  };

  const highlightMatches = (
    text?: string | null,
    match?: string | null,
    highlightClass = "bg-amber-200 text-amber-900 dark:bg-amber-400/30 dark:text-amber-50"
  ): ReactNode => {
    if (!text) {
      return <span className="italic text-muted-foreground">No text available</span>;
    }
    if (!match) {
      return text;
    }
    const trimmedMatch = match.trim();
    if (!trimmedMatch) {
      return text;
    }
    const escaped = trimmedMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const segments: ReactNode[] = [];
    let lastIndex = 0;
    let result: RegExpExecArray | null;

    while ((result = regex.exec(text)) !== null) {
      if (result.index > lastIndex) {
        segments.push(text.slice(lastIndex, result.index));
      }
      const matchValue = text.slice(result.index, result.index + result[0].length);
      segments.push(
        <span key={`match-${result.index}-${matchValue.length}`} className={`rounded px-0.5 ${highlightClass}`}>
          {matchValue}
        </span>
      );
      lastIndex = result.index + result[0].length;

      if (result.index === regex.lastIndex) {
        regex.lastIndex += 1;
      }
    }

    if (lastIndex < text.length) {
      segments.push(text.slice(lastIndex));
    }

    return segments.length > 0 ? segments : text;
  };

  const renderFullDocument = (
    text?: string | null,
    highlightStart?: number | null,
    highlightEnd?: number | null,
    highlightClass = "bg-emerald-300 text-emerald-950 dark:bg-emerald-500/40 dark:text-white"
  ): ReactNode => {
    if (!text) {
      return <span className="italic text-muted-foreground">Full text unavailable</span>;
    }

    const hasRange =
      typeof highlightStart === "number" &&
      !Number.isNaN(highlightStart) &&
      typeof highlightEnd === "number" &&
      !Number.isNaN(highlightEnd) &&
      highlightEnd > highlightStart;

    if (!hasRange) {
      return text;
    }

    const safeStart = Math.max(0, Math.min(highlightStart!, text.length));
    const safeEnd = Math.max(safeStart, Math.min(highlightEnd!, text.length));

    return (
      <>
        {text.slice(0, safeStart)}
        <span className={`rounded px-0.5 ${highlightClass}`}>
          {text.slice(safeStart, safeEnd) || " "}
        </span>
        {text.slice(safeEnd)}
      </>
    );
  };

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
                  {checkResult.localHighlights.map((highlight, index) => {
                    const sourcePosition = formatPosition(
                      highlight.lineStartA ?? highlight.lineA,
                      highlight.lineEndA ?? highlight.lineA,
                      highlight.charStartA,
                      highlight.charEndA
                    );
                    const matchedPosition = formatPosition(
                      highlight.lineStartB ?? highlight.lineB,
                      highlight.lineEndB ?? highlight.lineB,
                      highlight.charStartB ?? highlight.start,
                      highlight.charEndB ?? highlight.end
                    );

                    return (
                      <Card key={index} className="border-l-4 border-l-orange-500">
                        <CardContent className="pt-6 space-y-5">
                          <div className="flex items-start justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-orange-600">
                                {highlight.matchType === "exact" ? "Exact Match" : "Partial Match"}
                              </span>
                              {(highlight.lineA || highlight.lineB) && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                  {highlight.sourceFile || "File A"}:{highlight.lineA ?? "-"} →{" "}
                                  {highlight.targetFile || "File B"}:{highlight.lineB ?? "-"}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-orange-600">
                              {highlight.score.toFixed(1)}% Match
                            </span>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-orange-100 dark:border-orange-900/60 overflow-hidden">
                              <div className="px-4 py-2 bg-orange-50 dark:bg-orange-950/40 text-xs font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-100">
                                Source File
                              </div>
                              <div className="p-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{highlight.sourceFile || "File A"}</span>
                                  <span>{sourcePosition}</span>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded border border-orange-200 dark:border-orange-900 font-mono leading-relaxed">
                                  {highlightMatches(
                                    highlight.lineTextA ?? highlight.textA,
                                    highlight.textA,
                                    "bg-orange-300 text-orange-950 dark:bg-orange-500/50 dark:text-white"
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 text-xs font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                                Matched File
                              </div>
                              <div className="p-4 space-y-2 text-sm">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{highlight.targetFile || "File B"}</span>
                                  <span>{matchedPosition}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded border border-slate-200 dark:border-slate-800 font-mono leading-relaxed">
                                  {highlightMatches(
                                    highlight.lineTextB ?? highlight.textB,
                                    highlight.textB,
                                    "bg-emerald-200 text-emerald-900 dark:bg-emerald-500/40 dark:text-white"
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {(checkResult.sourceFullText || checkResult.targetFullText) && (
                            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 overflow-hidden">
                              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/40 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-100">
                                Overlapping Sections (Full Documents)
                              </div>
                              <div className="grid gap-4 p-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-200 flex items-center justify-between">
                                    <span>Full source document</span>
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                      Showing complete text
                                    </span>
                                  </div>
                                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded border border-emerald-200 dark:border-emerald-800 text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-auto">
                                    {renderFullDocument(
                                      checkResult.sourceFullText,
                                      highlight.charStartA ?? highlight.start,
                                      highlight.charEndA ?? highlight.end,
                                      "bg-emerald-300 text-emerald-900 dark:bg-emerald-500/40 dark:text-white"
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-200 flex items-center justify-between">
                                    <span>Full matched document</span>
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                      Showing complete text
                                    </span>
                                  </div>
                                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded border border-emerald-200 dark:border-emerald-800 text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-auto">
                                    {renderFullDocument(
                                      checkResult.targetFullText,
                                      highlight.charStartB ?? highlight.start,
                                      highlight.charEndB ?? highlight.end,
                                      "bg-emerald-400 text-emerald-950 dark:bg-emerald-400/60 dark:text-emerald-950"
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground grid gap-2 md:grid-cols-2">
                            <div>
                              <span className="font-semibold text-orange-700 dark:text-orange-300">Source position:</span>{" "}
                              {sourcePosition}
                            </div>
                            <div>
                              <span className="font-semibold text-orange-700 dark:text-orange-300">Matched position:</span>{" "}
                              {matchedPosition}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
