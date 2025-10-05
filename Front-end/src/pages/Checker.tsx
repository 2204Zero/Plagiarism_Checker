import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import PlagiarismGauge from "@/components/PlagiarismGauge";
import DetailedReportDialog from "@/components/DetailedReportDialogue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Database, Sparkles, FileText } from "lucide-react";
import { PlagiarismAPI, PlagiarismCheckResult } from "@/services/api";

const Checker = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [secondFile, setSecondFile] = useState<File | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [plagiarismScore, setPlagiarismScore] = useState<number | null>(null);
  const [checkType, setCheckType] = useState<"local" | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [checkResult, setCheckResult] = useState<PlagiarismCheckResult | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    // Check backend connection
    PlagiarismAPI.healthCheck().then(setIsBackendConnected);

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    setCheckType("local");

    try {
      const result = await PlagiarismAPI.checkPlagiarism({
        mode: "local",
        fileA: selectedFile,
        fileB: secondFile,
      });

      setCheckResult(result);
      setPlagiarismScore(result.overallScore);

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
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Check for Plagiarism</h1>
            <p className="text-lg text-muted-foreground">
              Upload two documents to compare and detect plagiarism using advanced local file comparison
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
                  <CardTitle>Upload First Document</CardTitle>
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
                  <CardTitle>Upload Second Document (For Local Check)</CardTitle>
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
                        {plagiarismScore}% Plagiarism Found
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
        checkType={checkType}
        checkResult={checkResult}
      />
    </div>
  );
};

export default Checker;
