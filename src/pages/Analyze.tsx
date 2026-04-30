import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toPng } from "html-to-image";
import { 
  Calculator, 
  Download, 
  Share2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { calculateAnalysis, type StockInput, type CalculationResult } from "@/lib/calculations";
import { formatCurrency as formatCurrencyByTicker } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load chart
const EpsChart = lazy(() => import("@/components/analyzer/EpsChart"));

const formSchema = z.object({
  ticker: z.string().optional(),
  period: z.string().optional(),
  price: z.coerce.number().positive("Price must be > 0"),
  eps: z.coerce.number({ invalid_type_error: "Required" }),
  epsHistory: z.array(z.object({
    value: z.coerce.number({ invalid_type_error: "Required" })
  })).min(3, "Need at least 3 years of EPS history"),
  bvps: z.coerce.number({ invalid_type_error: "Required" }),
  der: z.coerce.number().min(0, "Must be ≥ 0"),
  roe: z.coerce.number({ invalid_type_error: "Required" }),
  dividend: z.coerce.number().min(0, "Must be ≥ 0"),
});

function getPeriodOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const opts: string[] = [];
  for (let y = year; y >= year - 1; y--) {
    for (let q = 4; q >= 1; q--) opts.push(`Q${q} ${y}`);
  }
  for (let y = year - 1; y >= year - 3; y--) opts.push(`FY ${y}`);
  return opts;
}

type FormValues = z.infer<typeof formSchema>;

const STORAGE_KEY = "stockanalyzer:last";
const RECENT_KEY = "stockanalyzer:recent";

export default function Analyze() {
  const { toast } = useToast();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [ticker, setTicker] = useState<string>("Stock");
  const [analyzedPeriod, setAnalyzedPeriod] = useState<string>("");
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);
  const reportCardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<{ticker: string, date: string, input: StockInput}[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticker: "",
      period: "",
      price: 0,
      eps: 0,
      epsHistory: [{ value: 0 }, { value: 0 }, { value: 0 }],
      bvps: 0,
      der: 0,
      roe: 0,
      dividend: 0,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "epsHistory"
  });

  useDocumentMeta({
    title: ticker !== "Stock" ? `Analyze ${ticker} — Intrinsic Value & MoS | ValuLens` : "Analyze Stock | ValuLens",
    description: "Calculate intrinsic value, margin of safety, and fundamental health score for any stock.",
  });

  // Load state on mount
  useEffect(() => {
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("data");
    
    let loadedFromUrl = false;
    if (dataParam) {
      try {
        const decoded = JSON.parse(atob(dataParam));
        const mapped = {
          ...decoded,
          epsHistory: decoded.epsHistory.map((v: number) => ({ value: v }))
        };
        form.reset(mapped);
        const mappedInput = {
          ...decoded,
          epsHistory: decoded.epsHistory
        };
        const calc = calculateAnalysis(mappedInput);
        setResult(calc);
        if (decoded.ticker) setTicker(decoded.ticker);
        if (decoded.period) setAnalyzedPeriod(decoded.period);
        setAnalyzedAt(new Date());
        loadedFromUrl = true;
      } catch (e) {
        console.error("Failed to parse URL params", e);
      }
    }

    if (!loadedFromUrl) {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last) {
        try {
          const parsed = JSON.parse(last);
          const mapped = {
            ...parsed,
            epsHistory: parsed.epsHistory.map((v: number) => ({ value: v }))
          };
          form.reset(mapped);
          const calc = calculateAnalysis(parsed);
          setResult(calc);
          if (parsed.ticker) setTicker(parsed.ticker);
          if (parsed.period) setAnalyzedPeriod(parsed.period);
          setAnalyzedAt(new Date());
        } catch (e) {
          console.error("Failed to parse local storage", e);
        }
      }
    }

    const recent = localStorage.getItem(RECENT_KEY);
    if (recent) {
      try {
        setRecentAnalyses(JSON.parse(recent));
      } catch (e) {
        console.error("Failed to parse recent", e);
      }
    }
  }, [form]);

  const onSubmit = (data: FormValues) => {
    const input: StockInput = {
      ...data,
      epsHistory: data.epsHistory.map(h => h.value)
    };
    
    const calc = calculateAnalysis(input);
    setResult(calc);
    
    const displayTicker = data.ticker?.toUpperCase() || "Stock";
    setTicker(displayTicker);
    setAnalyzedPeriod(data.period || "");
    setAnalyzedAt(new Date());

    const persisted = { ...input, period: data.period || "" };

    // Save to local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    
    // Save to recent
    const newRecent = { ticker: displayTicker, date: new Date().toISOString(), input };
    setRecentAnalyses(prev => {
      const filtered = prev.filter(p => p.ticker !== displayTicker);
      const updated = [newRecent, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });

    // Update URL without reload
    const encoded = btoa(JSON.stringify(persisted));
    window.history.replaceState({}, '', `${window.location.pathname}?data=${encoded}`);
  };

  const handleShare = () => {
    const data = form.getValues();
    const input = {
      ...data,
      epsHistory: data.epsHistory.map(h => h.value),
      period: data.period || "",
    };
    const encoded = btoa(JSON.stringify(input));
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to your clipboard.",
    });
  };

  const handleExport = async () => {
    if (!reportCardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(reportCardRef.current, { cacheBust: true, quality: 1, backgroundColor: 'hsl(var(--background))' });
      const link = document.createElement('a');
      link.download = `${ticker}-valulens-report.png`;
      link.href = dataUrl;
      link.click();
      toast({
        title: "Export successful",
        description: "Report card saved as image.",
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Could not generate image.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val: number | null) => formatCurrencyByTicker(val, ticker);

  const formatPercent = (val: number | null) => {
    if (val === null) return "N/A";
    return new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(val / 100);
  };

  const formatNumber = (val: number | null) => {
    if (val === null) return "N/A";
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const getStatusColor = (status: CalculationResult["status"]) => {
    switch (status) {
      case "Undervalued": return "bg-emerald-500/15 text-emerald-500 border-emerald-500/20";
      case "Fair Value": return "bg-blue-500/15 text-blue-500 border-blue-500/20";
      case "Overvalued": return "bg-amber-500/15 text-amber-500 border-amber-500/20";
      case "Speculative": return "bg-red-500/15 text-red-500 border-red-500/20";
    }
  };

  const watchedEpsHistory = form.watch("epsHistory");
  const currentYear = new Date().getFullYear();
  const chartData = (watchedEpsHistory ?? []).map((entry, i, arr) => {
    const raw = entry?.value;
    const num = typeof raw === "number" ? raw : Number(raw);
    return {
      year: currentYear - (arr.length - 1 - i),
      eps: Number.isFinite(num) ? num : 0,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono">Analyzer</h1>
          <p className="text-muted-foreground mt-1">Input fundamental data to estimate intrinsic value.</p>
        </div>
        
        {recentAnalyses.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Recent:</span>
            <div className="flex flex-wrap gap-2">
              {recentAnalyses.map(r => (
                <Badge 
                  key={r.date} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => {
                    const mapped = {
                      ...r.input,
                      epsHistory: r.input.epsHistory.map(v => ({ value: v }))
                    };
                    form.reset(mapped);
                    setResult(calculateAnalysis(r.input));
                    setTicker(r.input.ticker?.toUpperCase() || "Stock");
                  }}
                >
                  {r.ticker}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Financial Data</CardTitle>
              <CardDescription>Enter parameters for analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ticker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ticker Symbol</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. BBRI.JK" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="period"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Period</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getPeriodOptions().map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Price</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="eps"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            TTM EPS
                            <Tooltip>
                              <TooltipTrigger type="button"><HelpCircle className="w-3 h-3 text-muted-foreground"/></TooltipTrigger>
                              <TooltipContent>Trailing 12 Months Earnings Per Share</TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bvps"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            BVPS
                            <Tooltip>
                              <TooltipTrigger type="button"><HelpCircle className="w-3 h-3 text-muted-foreground"/></TooltipTrigger>
                              <TooltipContent>Book Value Per Share</TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dividend"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dividend/Share</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="roe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            ROE (%)
                            <Tooltip>
                              <TooltipTrigger type="button"><HelpCircle className="w-3 h-3 text-muted-foreground"/></TooltipTrigger>
                              <TooltipContent>Return on Equity as a percentage (e.g. 15 for 15%)</TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="der"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            D/E Ratio
                            <Tooltip>
                              <TooltipTrigger type="button"><HelpCircle className="w-3 h-3 text-muted-foreground"/></TooltipTrigger>
                              <TooltipContent>Debt to Equity Ratio</TooltipContent>
                            </Tooltip>
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="flex items-center gap-1">
                        EPS History (Oldest to Newest)
                        <Tooltip>
                          <TooltipTrigger type="button"><HelpCircle className="w-3 h-3 text-muted-foreground"/></TooltipTrigger>
                          <TooltipContent>Used to calculate growth rate for DCF</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-7 px-2"
                        onClick={() => append({ value: 0 })}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Year
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {fields.map((field, index) => {
                        const yearLabel = currentYear - (fields.length - 1 - index);
                        return (
                        <div key={field.id} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-12 shrink-0 tabular-nums">{yearLabel}</span>
                          <FormField
                            control={form.control}
                            name={`epsHistory.${index}.value`}
                            render={({ field }) => (
                              <FormItem className="flex-1 space-y-0">
                                <FormControl>
                                  <Input type="number" step="any" className="h-8" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 3}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        );
                      })}
                      {form.formState.errors.epsHistory?.root && (
                        <p className="text-[0.8rem] font-medium text-destructive mt-1">
                          {form.formState.errors.epsHistory.root.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full mt-6" size="lg">
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-8 space-y-6" aria-live="polite">
          {!result ? (
            <Card className="border-border/50 shadow-sm h-full min-h-[400px] flex items-center justify-center bg-muted/10">
              <div className="text-center text-muted-foreground p-8">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-1">Awaiting Inputs</h3>
                <p className="text-sm">Enter financial data on the left to view the analysis.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Report Card (for export) */}
              <Card className="border-border/50 shadow-sm overflow-hidden" ref={reportCardRef}>
                <div className="bg-card p-6 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold font-mono tracking-tight">{ticker}</h2>
                        <Badge variant="outline" className={`px-3 py-1 text-sm font-medium border ${getStatusColor(result.status)}`}>
                          {result.status}
                        </Badge>
                      </div>
                      <div className="text-2xl font-light text-muted-foreground">
                        {formatCurrency(form.getValues().price)}
                      </div>
                    </div>
                    
                    <div className="text-left md:text-right">
                      <div className="text-sm text-muted-foreground font-medium mb-1 uppercase tracking-wider">Intrinsic Value</div>
                      <div className="text-4xl font-bold text-primary mb-1">
                        {formatCurrency(result.fairValue)}
                      </div>
                      <div className={`text-sm font-medium flex items-center md:justify-end gap-1 ${
                        result.marginOfSafety !== null && result.marginOfSafety > 0 ? "text-emerald-500" : "text-destructive"
                      }`}>
                        {result.marginOfSafety !== null ? (
                          <>
                            {result.marginOfSafety > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {formatPercent(result.marginOfSafety)} MoS
                          </>
                        ) : "MoS N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">DCF Value</div>
                      <div className="text-xl font-semibold font-mono">{formatCurrency(result.dcfValue)}</div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Graham No.</div>
                      <div className="text-xl font-semibold font-mono">{formatCurrency(result.grahamNumber)}</div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">P/E Band</div>
                      <div className="text-xl font-semibold font-mono">{formatCurrency(result.peBandValue)}</div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 flex flex-col justify-between">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Financial Score</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-semibold font-mono">{result.financialScore}/100</div>
                        <Progress value={result.financialScore} className="h-2 flex-1" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/50 pb-2">Key Metrics</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">P/E Ratio</span>
                          <span className="font-mono">{formatNumber(result.per)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">P/B Ratio</span>
                          <span className="font-mono">{formatNumber(result.pbv)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Div Yield</span>
                          <span className="font-mono">{formatPercent(result.dividendYield)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">EPS Growth (CAGR)</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{formatPercent(result.epsCagr !== null ? result.epsCagr * 100 : null)}</span>
                            {result.epsGrowthTrend === "Increasing" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                            {result.epsGrowthTrend === "Declining" && <TrendingDown className="w-3 h-3 text-destructive" />}
                            {result.epsGrowthTrend === "Stable" && <Minus className="w-3 h-3 text-blue-500" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/50 pb-2">Health Checklist</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          {result.checklist.roeHigh ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                          <span className={result.checklist.roeHigh ? "" : "text-muted-foreground"}>ROE &gt; 15%</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {result.checklist.derLow ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                          <span className={result.checklist.derLow ? "" : "text-muted-foreground"}>D/E &lt; 1</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {result.checklist.epsPositive ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
                          <span className={result.checklist.epsPositive ? "" : "text-destructive font-medium"}>Positive EPS</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {result.checklist.growthPositive ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                          <span className={result.checklist.growthPositive ? "" : "text-muted-foreground"}>Positive Growth</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {result.checklist.pbvLow ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                          <span className={result.checklist.pbvLow ? "" : "text-muted-foreground"}>P/B &lt; 3</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {result.checklist.perLow ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/50" />}
                          <span className={result.checklist.perLow ? "" : "text-muted-foreground"}>P/E &lt; 15</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/50 bg-muted/20 px-6 md:px-8 py-3 grid grid-cols-3 items-center text-xs text-muted-foreground gap-2">
                  <span className="font-mono tracking-tight justify-self-start">ValuLens</span>
                  <span className="justify-self-center text-center">
                    Analyzed on: {(analyzedAt ?? new Date()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="justify-self-end text-right">
                    Data Period: {analyzedPeriod || "—"}
                  </span>
                </div>
                <div className="bg-muted/10 px-6 md:px-8 py-2 text-[10px] text-muted-foreground/70 text-center border-t border-border/30">
                  funda.farelhanafi.my.id
                </div>
              </Card>

              {/* Actions */}
              <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" /> Share Link
                </Button>
                <Button onClick={handleExport} disabled={isExporting}>
                  <Download className="w-4 h-4 mr-2" /> 
                  {isExporting ? "Exporting..." : "Save Report"}
                </Button>
              </div>

              {/* Chart */}
              <Card className="border-border/50 shadow-sm mt-8">
                <CardHeader>
                  <CardTitle className="text-lg">EPS History</CardTitle>
                  <CardDescription>Historical earnings trend</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<Skeleton className="w-full h-[300px] rounded-lg" />}>
                    <EpsChart data={chartData} ticker={ticker} />
                  </Suspense>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
