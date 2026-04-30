import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20 py-8 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 opacity-80">
          <span className="font-bold text-lg font-mono">ValuLens</span>
          <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()}</span>
        </div>
        
        <p className="text-xs text-muted-foreground text-center md:text-left max-w-2xl">
          Disclaimer: ValuLens is a decision-support tool, not financial advice. 
          Intrinsic value calculations are estimates based on user inputs and assumptions. 
          Always do your own due diligence before making investment decisions.
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">Methodology</Link>
        </div>
      </div>
    </footer>
  );
}
