import { Link, useLocation } from "wouter";
import { LineChart, BarChart2, Info } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="bg-primary/10 p-2 rounded-lg">
            <LineChart className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight font-mono">ValuLens</span>
        </Link>
        
        <nav className="flex items-center gap-1 sm:gap-4">
          <Link 
            href="/analyze" 
            className={`text-sm font-medium transition-colors px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
              location === '/analyze' ? 'bg-accent/50 text-foreground' : 'text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Analyze</span>
            </div>
          </Link>
          <Link 
            href="/compare" 
            className={`text-sm font-medium transition-colors px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
              location === '/compare' ? 'bg-accent/50 text-foreground' : 'text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left-right"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
              <span className="hidden sm:inline">Compare</span>
            </div>
          </Link>
          <Link 
            href="/about" 
            className={`text-sm font-medium transition-colors px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground ${
              location === '/about' ? 'bg-accent/50 text-foreground' : 'text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">About</span>
            </div>
          </Link>
        </nav>
      </div>
    </header>
  );
}
