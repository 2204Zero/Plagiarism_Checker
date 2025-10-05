import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, Shield, Zap, ArrowRight, Target, Clock, BarChart3 } from "lucide-react";
import { useTypewriter } from "@/hooks/use-typewriter";

const Index = () => {
  const typewriterText = useTypewriter("Accuracy & Speed", 100);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 bg-gradient-to-b from-secondary/30 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Detect Plagiarism with{" "}
                <span className="text-primary">
                  {typewriterText}
                  {typewriterText.length < "Precision & Speed".length && (
                    <span className="animate-pulse">|</span>
                  )}
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Advanced local file comparison algorithms ensure your content is 100% original.
                Get instant results with detailed reports and exact text matches.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link to="/checker">
                  <Button size="lg" className="text-lg px-8 shadow-glow">
                    Start Checking Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button size="lg" variant="outline" className="text-lg px-8">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Our Tool?</h2>
              <p className="text-lg text-muted-foreground">
                Powerful features designed for accuracy and ease of use
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="hover:shadow-glow transition-all duration-300">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Lightning Fast</h3>
                  <p className="text-muted-foreground">
                    Ultra-fast C++ algorithms process your documents in milliseconds with 100% accuracy
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-glow transition-all duration-300">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Exact Matches</h3>
                  <p className="text-muted-foreground">
                    Find precise text matches with line numbers and character positions for complete accuracy
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-glow transition-all duration-300">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Detailed Reports</h3>
                  <p className="text-muted-foreground">
                    Get comprehensive reports with highlighted matches, scores, and source references
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-glow transition-all duration-300">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Instant Results</h3>
                  <p className="text-muted-foreground">
                    No waiting time - get your plagiarism analysis results immediately after upload
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-glow transition-all duration-300">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Multiple Formats</h3>
                  <p className="text-muted-foreground">
                    Support for various file formats including TXT, DOC, PDF, and more
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-glow transition-all duration-300">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Secure & Private</h3>
                  <p className="text-muted-foreground">
                    Your documents are processed locally and never stored on external servers
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-t from-secondary/30 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to ensure your content is original?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of users who trust our plagiarism checker for accurate results
              </p>
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 shadow-glow">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
