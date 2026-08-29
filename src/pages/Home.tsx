import { Link } from "wouter";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function Home() {
  useDocumentMeta({
    title: "ValuLens | Fundamental Stock Analyzer",
    description: "A no-nonsense fundamental stock analysis tool for value investors. Calculate intrinsic value, margin of safety, and financial health for any stock.",
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-6">
              <span className="w-8 h-px bg-primary" />
              Value investing, distilled
            </div>

            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight mb-6">
              See what a stock
              <br />
              is <span className="italic text-primary">actually</span> worth.
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed mb-10">
              Input a ticker. Get intrinsic value, margin of safety, and a financial health score — built on the same formulas Benjamin Graham used.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/analyze">
                <Button size="lg" className="h-11 px-7 text-sm font-semibold">
                  Start analyzing <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/compare">
                <Button size="lg" variant="outline" className="h-11 px-7 text-sm font-semibold">
                  Compare two stocks
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative lens element */}
        <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-primary/10 opacity-60" />
        <div className="hidden lg:block absolute right-24 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-primary/20 opacity-40" />
        <div className="hidden lg:block absolute right-36 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-primary/5" />
      </section>

      {/* How it works — process, not cards */}
      <section className="py-16 border-t border-border/60 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">How it works</span>
            <span className="flex-1 h-px bg-border/60" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="space-y-3">
              <div className="font-mono text-xs text-muted-foreground">01</div>
              <h3 className="font-serif text-xl italic">Input the data</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter a stock ticker and fetch financial data automatically, or input EPS, book value, ROE, and debt manually.
              </p>
            </div>

            <div className="space-y-3">
              <div className="font-mono text-xs text-muted-foreground">02</div>
              <h3 className="font-serif text-xl italic">Run the formulas</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Graham Number, Discounted Cash Flow, and P/E Band valuation — each weighted and combined into a single fair value estimate.
              </p>
            </div>

            <div className="space-y-3">
              <div className="font-mono text-xs text-muted-foreground">03</div>
              <h3 className="font-serif text-xl italic">Know the margin</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                See the gap between price and value. A 30% margin of safety means the stock is trading well below its estimated worth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-16 border-t border-border/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What you get</span>
            <span className="flex-1 h-px bg-border/60" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Intrinsic Value", desc: "Weighted fair price from three valuation models." },
              { label: "Margin of Safety", desc: "How far below fair value the current price sits." },
              { label: "Financial Score", desc: "0–100 health rating based on ROE, debt, and growth." },
              { label: "ML Growth Prediction", desc: "TensorFlow.js model predicts EPS growth from historical data." },
            ].map((item) => (
              <div key={item.label} className="p-5 rounded-lg border border-border/60 bg-card">
                <div className="font-medium text-sm mb-1.5">{item.label}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
