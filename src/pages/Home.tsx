import { Link } from "wouter";
import { ArrowRight, BarChart3, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function Home() {
  useDocumentMeta({
    title: "ValuLens | Fundamental Stock Analyzer",
    description: "A serious, no-nonsense fundamental stock analysis tool for value investors. Calculate intrinsic value, margin of safety, and financial health.",
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden flex flex-col items-center text-center px-4">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8">
          <ShieldCheck className="mr-2 h-4 w-4" />
          Data-driven value investing
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl font-mono">
          Find the intrinsic value behind the <span className="text-primary">ticker.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          A no-nonsense decision support tool for serious investors. Calculate Margin of Safety, DCF, and Graham Number without the noise.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/analyze">
            <Button size="lg" className="h-12 px-8 text-base font-semibold">
              Analyze a Stock <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/compare">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold">
              Compare Stocks
            </Button>
          </Link>
        </div>
      </section>

      {/* Educational Content */}
      <section className="py-20 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4 font-mono">The Methodology</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We rely on established fundamental analysis principles to separate market price from underlying business value.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Intrinsic Value</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The true, inherent worth of a company based on its fundamentals, future cash flows, and assets, independent of its current market price.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Margin of Safety</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The principle of buying securities at a significant discount to their intrinsic value, providing a buffer against errors in estimation or unforeseen events.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">P/E & P/B Ratios</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Price-to-Earnings measures what the market pays for $1 of current earnings. Price-to-Book compares market value to the company's net assets.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">DCF Analysis</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Discounted Cash Flow estimates the value of an investment based on its expected future cash flows, adjusted for the time value of money.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
