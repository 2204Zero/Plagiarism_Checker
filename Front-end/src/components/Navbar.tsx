import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileCheck } from "lucide-react";

const Navbar = () => {

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <FileCheck className="h-6 w-6 text-primary" />
            <span>Plagiarism Checker</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              About
            </Link>
            <Link to="/checker">
              <Button variant="ghost" size="sm">
                Checker
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
