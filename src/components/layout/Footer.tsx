import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex flex-col gap-2">
            <span className="font-serif text-lg text-primary italic">ValuLens</span>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Decision-support tool for value investors. Not financial advice.
              Always verify with your own research.
            </p>
          </div>

          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tool</span>
              <Link href="/analyze" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Analyze</Link>
              <Link href="/compare" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Compare</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Learn</span>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">&copy; {new Date().getFullYear()} ValuLens</span>
          <span className="text-[10px] text-muted-foreground/60">
            Intrinsic value calculations are estimates. Do your own due diligence.
          </span>
        </div>
      </div>
    </footer>
  );
}
