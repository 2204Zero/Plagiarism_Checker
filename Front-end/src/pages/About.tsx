import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, Globe } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">About Plagiarism Checker</h1>
            <p className="text-lg text-muted-foreground">
              Advanced plagiarism detection powered by high-performance local algorithms
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardContent className="pt-6">
                <p className="text-lg leading-relaxed">
                  Our plagiarism checker uses cutting-edge C++ algorithms with advanced similarity
                  detection to provide comprehensive document analysis. Whether you're a
                  student, educator, or professional writer, our tool helps ensure content originality
                  with precise text matching and detailed reporting.
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <Shield className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Secure & Private</h3>
                  <p className="text-muted-foreground">
                    Your documents are processed securely and never stored permanently
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <Zap className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">Fast Analysis</h3>
                  <p className="text-muted-foreground">
                    Get results in seconds with our optimized C++ algorithms
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <Globe className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">AI-Powered</h3>
                  <p className="text-muted-foreground">
                    Advanced Python AI models check against internet sources
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;
