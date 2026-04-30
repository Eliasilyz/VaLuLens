import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function About() {
  useDocumentMeta({
    title: "About Methodology | ValuLens",
    description: "Learn about the formulas and principles powering ValuLens intrinsic value calculations.",
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold font-mono mb-6">Methodology & Disclaimers</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          ValuLens is designed for value investors seeking to estimate the intrinsic value of a company based on public financial data. Our calculations rely on classic, established formulas.
        </p>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold border-b border-border pb-2 mb-4">The Calculations</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-medium text-primary">Graham Number</h3>
              <p className="text-sm text-muted-foreground mb-2">Developed by Benjamin Graham, the father of value investing.</p>
              <div className="bg-muted/50 p-4 rounded-md font-mono text-sm border border-border">
                Graham Number = √(22.5 × EPS × BVPS)
              </div>
              <p className="mt-2 text-sm">
                Assumes a P/E ratio should not exceed 15 and a P/B ratio should not exceed 1.5 (15 × 1.5 = 22.5). Only valid for companies with positive earnings and book value.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-primary">Discounted Cash Flow (DCF)</h3>
              <p className="text-sm text-muted-foreground mb-2">Estimates value based on expected future cash flows.</p>
              <p className="mt-2 text-sm">
                We use Earnings Per Share (EPS) as a proxy for cash flow. We project EPS 5 years into the future using the historical CAGR (capped at 10%) or derived from ROE. Future earnings are discounted back to present value using a 10% discount rate. A terminal value is added to account for value beyond year 5.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium text-primary">Fair Value Weighting</h3>
              <p className="text-sm text-muted-foreground mb-2">Combining multiple methods for a balanced estimate.</p>
              <p className="mt-2 text-sm">
                Our blended Fair Value uses valid components from: Graham Number (30%), DCF (40%), and a PE Band Multiple (30%). If a method is invalid (e.g., negative EPS), weights are dynamically re-normalized among the valid metrics.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold border-b border-border pb-2 mb-4">Margin of Safety</h2>
          <div className="bg-muted/50 p-4 rounded-md font-mono text-sm border border-border mb-4">
            Margin of Safety = ((Fair Value - Current Price) / Fair Value) × 100
          </div>
          <p className="text-sm">
            A positive Margin of Safety means the stock is trading below its estimated intrinsic value. Benjamin Graham recommended a Margin of Safety of at least 30% to absorb the effect of miscalculations or worse-than-expected future performance.
          </p>
        </section>

        <section className="bg-destructive/10 border border-destructive/20 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-destructive mb-2">Important Disclaimer</h2>
          <p className="text-sm leading-relaxed">
            ValuLens is an educational and decision-support tool. It is <strong>not</strong> financial advice. All investments carry risk. The intrinsic value estimates are highly sensitive to the inputs provided (especially growth rate and discount rate assumptions). An undervalued stock can remain undervalued indefinitely, and historical growth does not guarantee future results. Always perform comprehensive due diligence and consult with a licensed financial advisor before making investment decisions.
          </p>
        </section>
      </div>
    </div>
  );
}
