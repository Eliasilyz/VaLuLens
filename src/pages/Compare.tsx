import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calculator, Share2, ArrowRightLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { calculateAnalysis, type StockInput, type CalculationResult } from "@/lib/calculations";
import { formatCurrency as formatCurrencyByTicker } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const singleStockSchema = z.object({
  ticker: z.string().optional(),
  price: z.coerce.number().positive("Price must be > 0"),
  eps: z.coerce.number({ invalid_type_error: "Required" }),
  bvps: z.coerce.number({ invalid_type_error: "Required" }),
  der: z.coerce.number().min(0, "Must be ≥ 0"),
  roe: z.coerce.number({ invalid_type_error: "Required" }),
  dividend: z.coerce.number().min(0, "Must be ≥ 0"),
});

const compareFormSchema = z.object({
  stockA: singleStockSchema,
  stockB: singleStockSchema,
});

type CompareFormValues = z.infer<typeof compareFormSchema>;

export default function Compare() {
  const { toast } = useToast();
  const [resultA, setResultA] = useState<CalculationResult | null>(null);
  const [resultB, setResultB] = useState<CalculationResult | null>(null);
  const [hasCompared, setHasCompared] = useState(false);

  const form = useForm<CompareFormValues>({
    resolver: zodResolver(compareFormSchema),
    defaultValues: {
      stockA: { ticker: "Stock A", price: 0, eps: 0, bvps: 0, der: 0, roe: 0, dividend: 0 },
      stockB: { ticker: "Stock B", price: 0, eps: 0, bvps: 0, der: 0, roe: 0, dividend: 0 },
    }
  });

  useDocumentMeta({
    title: "Compare Stocks | ValuLens",
    description: "Compare fundamental metrics and intrinsic value of two stocks side-by-side.",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("data");
    
    if (dataParam) {
      try {
        const decoded = JSON.parse(atob(dataParam));
        form.reset(decoded);
        runComparison(decoded);
      } catch (e) {
        console.error("Failed to parse URL params", e);
      }
    }
  }, [form]);

  const runComparison = (data: CompareFormValues) => {
    // For comparison, we provide a dummy EPS history since we don't ask for full array to save space
    // We'll just use a flat history so growth = 0
    const inputA: StockInput = {
      ...data.stockA,
      epsHistory: [data.stockA.eps, data.stockA.eps, data.stockA.eps]
    };
    const inputB: StockInput = {
      ...data.stockB,
      epsHistory: [data.stockB.eps, data.stockB.eps, data.stockB.eps]
    };
    
    setResultA(calculateAnalysis(inputA));
    setResultB(calculateAnalysis(inputB));
    setHasCompared(true);

    const encoded = btoa(JSON.stringify(data));
    window.history.replaceState({}, '', `${window.location.pathname}?data=${encoded}`);
  };

  const onSubmit = (data: CompareFormValues) => {
    runComparison(data);
  };

  const handleShare = () => {
    const data = form.getValues();
    const encoded = btoa(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Comparison share link has been copied.",
    });
  };

  const formatNumber = (val: number | null) => {
    if (val === null) return "N/A";
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const formatPercent = (val: number | null) => {
    if (val === null) return "N/A";
    return new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(val / 100);
  };

  const formatCurrency = (val: number | null, ticker?: string) => formatCurrencyByTicker(val, ticker);

  const betterClass = "bg-emerald-500/10 text-emerald-500 font-semibold";
  const worseClass = "text-muted-foreground";

  const getWinner = (valA: number | null, valB: number | null, lowerIsBetter: boolean) => {
    if (valA === null || valB === null) return 0; // Tie/indeterminable
    if (valA === valB) return 0;
    if (lowerIsBetter) {
      return valA < valB ? -1 : 1; // -1 means A wins, 1 means B wins
    } else {
      return valA > valB ? -1 : 1;
    }
  };

  const StockInputForm = ({ prefix, label }: { prefix: "stockA" | "stockB", label: string }) => (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField control={form.control} name={`${prefix}.ticker`} render={({ field }) => (
          <FormItem><FormLabel>Ticker</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name={`${prefix}.price`} render={({ field }) => (
            <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name={`${prefix}.eps`} render={({ field }) => (
            <FormItem><FormLabel>EPS</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name={`${prefix}.bvps`} render={({ field }) => (
            <FormItem><FormLabel>BVPS</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name={`${prefix}.dividend`} render={({ field }) => (
            <FormItem><FormLabel>Dividend</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name={`${prefix}.roe`} render={({ field }) => (
            <FormItem><FormLabel>ROE (%)</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name={`${prefix}.der`} render={({ field }) => (
            <FormItem><FormLabel>D/E Ratio</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl></FormItem>
          )} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono">Compare Stocks</h1>
          <p className="text-muted-foreground mt-1">Side-by-side fundamental analysis.</p>
        </div>
        {hasCompared && (
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" /> Share Comparison
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <StockInputForm prefix="stockA" label="Company 1" />
            <StockInputForm prefix="stockB" label="Company 2" />
          </div>

          <div className="flex justify-center">
            <Button type="submit" size="lg" className="w-full md:w-1/2">
              <ArrowRightLeft className="w-4 h-4 mr-2" /> Compare
            </Button>
          </div>
        </form>
      </Form>

      {hasCompared && resultA && resultB && (
        <Card className="mt-12 border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle>Comparison Results</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Metric</th>
                  <th className="px-6 py-4 font-medium font-mono text-lg">{form.getValues().stockA.ticker || "Company 1"}</th>
                  <th className="px-6 py-4 font-medium font-mono text-lg">{form.getValues().stockB.ticker || "Company 2"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">Intrinsic Value</td>
                  <td className={`px-6 py-4 font-mono text-base`}>{formatCurrency(resultA.fairValue, form.getValues().stockA.ticker)}</td>
                  <td className={`px-6 py-4 font-mono text-base`}>{formatCurrency(resultB.fairValue, form.getValues().stockB.ticker)}</td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">Current Price</td>
                  <td className={`px-6 py-4 font-mono text-base`}>{formatCurrency(form.getValues().stockA.price, form.getValues().stockA.ticker)}</td>
                  <td className={`px-6 py-4 font-mono text-base`}>{formatCurrency(form.getValues().stockB.price, form.getValues().stockB.ticker)}</td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">Margin of Safety</td>
                  <td className={`px-6 py-4 font-mono ${getWinner(resultA.marginOfSafety, resultB.marginOfSafety, false) === -1 ? betterClass : getWinner(resultA.marginOfSafety, resultB.marginOfSafety, false) === 1 ? worseClass : ""}`}>
                    {formatPercent(resultA.marginOfSafety)}
                  </td>
                  <td className={`px-6 py-4 font-mono ${getWinner(resultA.marginOfSafety, resultB.marginOfSafety, false) === 1 ? betterClass : getWinner(resultA.marginOfSafety, resultB.marginOfSafety, false) === -1 ? worseClass : ""}`}>
                    {formatPercent(resultB.marginOfSafety)}
                  </td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">P/E Ratio (Lower is better)</td>
                  <td className={`px-6 py-4 font-mono ${getWinner(resultA.per, resultB.per, true) === -1 ? betterClass : getWinner(resultA.per, resultB.per, true) === 1 ? worseClass : ""}`}>
                    {formatNumber(resultA.per)}
                  </td>
                  <td className={`px-6 py-4 font-mono ${getWinner(resultA.per, resultB.per, true) === 1 ? betterClass : getWinner(resultA.per, resultB.per, true) === -1 ? worseClass : ""}`}>
                    {formatNumber(resultB.per)}
                  </td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">P/B Ratio (Lower is better)</td>
                  <td className={`px-6 py-4 font-mono ${getWinner(resultA.pbv, resultB.pbv, true) === -1 ? betterClass : getWinner(resultA.pbv, resultB.pbv, true) === 1 ? worseClass : ""}`}>
                    {formatNumber(resultA.pbv)}
                  </td>
                  <td className={`px-6 py-4 font-mono ${getWinner(resultA.pbv, resultB.pbv, true) === 1 ? betterClass : getWinner(resultA.pbv, resultB.pbv, true) === -1 ? worseClass : ""}`}>
                    {formatNumber(resultB.pbv)}
                  </td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">ROE (Higher is better)</td>
                  <td className={`px-6 py-4 font-mono ${getWinner(form.getValues().stockA.roe, form.getValues().stockB.roe, false) === -1 ? betterClass : getWinner(form.getValues().stockA.roe, form.getValues().stockB.roe, false) === 1 ? worseClass : ""}`}>
                    {formatNumber(form.getValues().stockA.roe)}%
                  </td>
                  <td className={`px-6 py-4 font-mono ${getWinner(form.getValues().stockA.roe, form.getValues().stockB.roe, false) === 1 ? betterClass : getWinner(form.getValues().stockA.roe, form.getValues().stockB.roe, false) === -1 ? worseClass : ""}`}>
                    {formatNumber(form.getValues().stockB.roe)}%
                  </td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">D/E Ratio (Lower is better)</td>
                  <td className={`px-6 py-4 font-mono ${getWinner(form.getValues().stockA.der, form.getValues().stockB.der, true) === -1 ? betterClass : getWinner(form.getValues().stockA.der, form.getValues().stockB.der, true) === 1 ? worseClass : ""}`}>
                    {formatNumber(form.getValues().stockA.der)}
                  </td>
                  <td className={`px-6 py-4 font-mono ${getWinner(form.getValues().stockA.der, form.getValues().stockB.der, true) === 1 ? betterClass : getWinner(form.getValues().stockA.der, form.getValues().stockB.der, true) === -1 ? worseClass : ""}`}>
                    {formatNumber(form.getValues().stockB.der)}
                  </td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">Dividend Yield</td>
                  <td className={`px-6 py-4 font-mono ${getWinner(resultA.dividendYield, resultB.dividendYield, false) === -1 ? betterClass : getWinner(resultA.dividendYield, resultB.dividendYield, false) === 1 ? worseClass : ""}`}>
                    {formatPercent(resultA.dividendYield)}
                  </td>
                  <td className={`px-6 py-4 font-mono ${getWinner(resultA.dividendYield, resultB.dividendYield, false) === 1 ? betterClass : getWinner(resultA.dividendYield, resultB.dividendYield, false) === -1 ? worseClass : ""}`}>
                    {formatPercent(resultB.dividendYield)}
                  </td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors bg-muted/5">
                  <td className="px-6 py-4 font-medium">Financial Score</td>
                  <td className={`px-6 py-4 font-mono font-bold ${getWinner(resultA.financialScore, resultB.financialScore, false) === -1 ? "text-primary" : ""}`}>
                    {resultA.financialScore}/100
                  </td>
                  <td className={`px-6 py-4 font-mono font-bold ${getWinner(resultA.financialScore, resultB.financialScore, false) === 1 ? "text-primary" : ""}`}>
                    {resultB.financialScore}/100
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
