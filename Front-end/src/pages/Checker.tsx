import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import PlagiarismGauge from "@/components/PlagiarismGauge";
import DetailedReportDialog from "@/components/DetailedReportDialogue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Database, FileText } from "lucide-react";
import { PlagiarismAPI, PlagiarismCheckResult } from "@/services/api";

const Checker = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [plagiarismScore, setPlagiarismScore] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [checkResult, setCheckResult] = useState<PlagiarismCheckResult | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Only check backend connection, no authentication required
    PlagiarismAPI.healthCheck().then(setIsBackendConnected);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, []);

  const handleCheck = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a file first",
        variant: "destructive",
      });
      return;
    }

    if (!secondFile) {
      toast({
        title: "Second file required",
        description: "Please upload a second file to compare",
        variant: "destructive",
      });
      return;
    }

    if (isBackendConnected === false) {
      toast({
        title: "Backend not available",
        description: "Please ensure the backend server is running on port 8000",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);

    try {
      const result = await PlagiarismAPI.checkPlagiarism({
        mode: "local",
        fileA: selectedFile,
        fileB: secondFile,
      });

      // Fallback score from highlight coverage when backend returns 0 but highlights exist
      const highlights = result.localHighlights?.length ? result.localHighlights : result.highlights;
      const coverage = (intervals: Array<{ s: number; e: number }>, total: number) => {
        if (!intervals.length || !total) return 0;
        const sorted = intervals
          .map((x) => ({ s: Math.max(0, Math.min(x.s, total)), e: Math.max(0, Math.min(x.e, total)) }))
          .filter((x) => x.e > x.s)
          .sort((a, b) => a.s - b.s);
        let covered = 0;
        let cs = sorted[0].s;
        let ce = sorted[0].e;
        for (let k = 1; k < sorted.length; k++) {
          const { s, e } = sorted[k];
          if (s <= ce) ce = Math.max(ce, e);
          else {
            covered += ce - cs;
            cs = s;
            ce = e;
          }
        }
        covered += ce - cs;
        return (covered * 100) / total;
      };

      let displayOverall = result.overallScore;
      let displayLocal = result.localScore;
      if ((displayOverall === 0 || displayLocal === 0) && highlights && highlights.length > 0) {
        const aIntervals = highlights.map((h) => ({
          s: (h.charStartA ?? (h.start ?? 0)) as number,
          e: (h.charEndA ?? (h.end ?? 0)) as number,
        }));
        const bIntervals = highlights.map((h) => ({
          s: (h.charStartB ?? (h.start ?? 0)) as number,
          e: (h.charEndB ?? (h.end ?? 0)) as number,
        }));
  // read full text directly from uploaded files if backend didn't send them
const totalA = result.sourceFullText?.length
  ?? (await selectedFile.text()).length;

const totalB = result.targetFullText?.length
  ?? (await secondFile.text()).length;

if (totalA > 0 && totalB > 0) {
  const aCov = coverage(aIntervals, totalA);
  const bCov = coverage(bIntervals, totalB);
  const mean = (aCov + bCov) / 2;

  displayOverall = mean;
  displayLocal = mean;
}

      }

      setCheckResult({ ...result, overallScore: displayOverall, localScore: displayLocal });
      setPlagiarismScore(displayOverall);

      toast({
        title: "Check completed!",
        description: "Plagiarism check finished with local file comparison",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Check failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h1 className="text-4xl font-bold mb-4">Check for Plagiarism</h1>
            <p className="text-lg text-muted-foreground">
              Upload two plain-text (.txt) files to compare and detect plagiarism using advanced local file comparison.
            </p>
            <p className="text-sm text-muted-foreground">
              Rich formats such as DOC/DOCX/PDF must be converted to .txt before uploading.
            </p>
            {isBackendConnected !== null && (
              <div className="mt-4">
                {isBackendConnected ? (
                  <div className="inline-flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Backend Connected
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Backend Disconnected
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload First TXT File</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Second TXT File</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    onFileSelect={setSecondFile}
                    selectedFile={secondFile}
                  />
                </CardContent>
              </Card>

              <Button
                size="lg"
                onClick={handleCheck}
                disabled={isChecking || !selectedFile || !secondFile}
                className="w-full h-auto py-6 flex flex-col gap-2"
              >
                <Database className="h-6 w-6" />
                <span>Check for Plagiarism</span>
                <span className="text-sm opacity-80">Local file comparison</span>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[400px]">
                {isChecking ? (
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
                    <p className="text-muted-foreground">
                      Analyzing documents for plagiarism...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Using local file comparison
                    </p>
                  </div>
                ) : plagiarismScore !== null ? (
                  <div className="space-y-6 w-full">
                    <div className="flex justify-center">
                      <PlagiarismGauge score={plagiarismScore} />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold mb-2">
                        {plagiarismScore.toFixed(1)}% Plagiarism Found
                      </p>
                      <p className="text-muted-foreground mb-6">
                        Analyzed using local file comparison
                      </p>
                      <Button 
                        variant="destructive" 
                        size="lg" 
                        className="w-full"
                        onClick={() => setShowReport(true)}
                      >
                        <FileText className="mr-2 h-5 w-5" />
                        View Detailed Report
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Upload both files and run a check to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <DetailedReportDialog
        open={showReport}
        onOpenChange={setShowReport}
        checkResult={checkResult}
      />
    </div>
  );
};

export default Checker;
