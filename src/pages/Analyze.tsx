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
  Minus,
  Search,
  Loader2,
  Brain,
  Cpu
} from "lucide-react";

import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { calculateAnalysis, type StockInput, type CalculationResult } from "@/lib/calculations";
import { formatCurrency as formatCurrencyByTicker } from "@/lib/currency";
import { trainModel, loadModel, predictEPSGrowth, hasSavedModel, type TrainingStock, type MLPrediction } from "@/lib/ml-model";
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
  const [isFetching, setIsFetching] = useState(false);
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState({ epoch: 0, loss: 0 });
  const [modelReady, setModelReady] = useState(false);
  const [showMLPanel, setShowMLPanel] = useState(false);

  // Check for saved model on mount
  useEffect(() => {
    hasSavedModel().then(setModelReady);
  }, []);

  const handleFetchStock = async () => {
    const rawTicker = form.getValues("ticker")?.trim();
    if (!rawTicker) {
      toast({ title: "Enter a ticker", description: "Please type a stock ticker first.", variant: "destructive" });
      return;
    }

    let fetchTicker = rawTicker.toUpperCase();
    if (!fetchTicker.includes(".")) {
      fetchTicker += ".JK";
    }

    setIsFetching(true);
    try {
      const res = await fetch(`/api/stock?ticker=${encodeURIComponent(fetchTicker)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch");
      }
      const data = await res.json();

      const epsHistoryValues = data.epsHistory?.length >= 3
        ? data.epsHistory
        : [data.eps || 0, data.eps || 0, data.eps || 0];

      const formData = {
        ticker: data.ticker || fetchTicker,
        period: "",
        price: data.price || 0,
        eps: data.eps || 0,
        epsHistory: epsHistoryValues.map((v: number) => ({ value: v })),
        bvps: data.bvps || 0,
        der: data.der || 0,
        roe: data.roe || 0,
        dividend: data.dividend || 0,
      };

      form.reset(formData);
      setTicker(data.ticker || fetchTicker);

      // Auto-calculate immediately
      const input: StockInput = {
        ...formData,
        epsHistory: epsHistoryValues,
      };

      // Auto-predict if model is ready
      let mlGrowth: number | null = null;
      if (modelReady) {
        try {
          const model = await loadModel();
          if (model) {
            const dividendYield = data.price > 0 ? ((data.dividend || 0) / data.price) * 100 : 0;
            const prediction = predictEPSGrowth(model, epsHistoryValues, data.roe || 0, data.der || 0, dividendYield);
            setMlPrediction(prediction);
            mlGrowth = prediction.predictedGrowthRate;
          }
        } catch {
          // ML prediction failed, continue without it
        }
      }

      const calc = calculateAnalysis(input, mlGrowth);
      setResult(calc);
      setAnalyzedAt(new Date());

      toast({ title: "Data fetched", description: `${data.ticker || fetchTicker} — ${data.shortName || ""}` });
    } catch (err: any) {
      toast({ title: "Fetch failed", description: err.message || "Could not fetch stock data.", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainingProgress({ epoch: 0, loss: 0 });
    try {
      const res = await fetch("/api/stocks-batch");
      if (!res.ok) throw new Error("Failed to fetch training data");
      const { stocks } = await res.json();

      if (!stocks || stocks.length < 5) {
        throw new Error("Not enough training data. Got " + (stocks?.length ?? 0) + " stocks.");
      }

      const trainingData: TrainingStock[] = stocks.map((s: any) => ({
        ticker: s.ticker,
        epsHistory: s.epsHistory,
        roe: s.roe,
        der: s.der,
        dividendYield: s.dividendYield ?? 0,
      }));

      await trainModel(trainingData, (epoch, loss) => {
        setTrainingProgress({ epoch, loss });
      });

      setModelReady(true);
      toast({ title: "Model trained!", description: `Trained on ${trainingData.length} stocks. ML predictions are now available.` });
    } catch (err: any) {
      toast({ title: "Training failed", description: err.message || "Could not train model.", variant: "destructive" });
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = async () => {
    const model = await loadModel();
    if (!model) {
      toast({ title: "No model", description: "Train the ML model first.", variant: "destructive" });
      return;
    }

    const epsHistory = form.getValues("epsHistory").map(h => h.value);
    const roe = form.getValues("roe");
    const der = form.getValues("der");
    const dividend = form.getValues("dividend");
    const price = form.getValues("price");
    const dividendYield = price > 0 ? (dividend / price) * 100 : 0;

    const prediction = predictEPSGrowth(model, epsHistory, roe, der, dividendYield);
    setMlPrediction(prediction);

    // Auto-recalculate with ML prediction
    const input: StockInput = {
      price,
      eps: form.getValues("eps"),
      epsHistory,
      bvps: form.getValues("bvps"),
      der,
      roe,
      dividend,
    };
    const calc = calculateAnalysis(input, prediction.predictedGrowthRate);
    setResult(calc);

    toast({
      title: "ML Prediction",
      description: `Predicted growth: ${prediction.predictedGrowthRate}% | Confidence: ${(prediction.confidence * 100).toFixed(0)}%`,
    });
  };

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
    
    const mlGrowth = mlPrediction?.predictedGrowthRate ?? null;
    const calc = calculateAnalysis(input, mlGrowth);
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
          <h1 className="font-serif text-3xl md:text-4xl italic tracking-tight">Analyzer</h1>
          <p className="text-muted-foreground mt-1 text-sm">Fetch or enter financial data to estimate intrinsic value.</p>
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
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="e.g. BBCA" {...field} />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              onClick={handleFetchStock}
                              disabled={isFetching}
                              title="Fetch data from Yahoo Finance"
                            >
                              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </Button>
                          </div>
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

              {/* ML Panel */}
              <Separator className="my-4" />
              <div>
                <button
                  type="button"
                  onClick={() => setShowMLPanel(!showMLPanel)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <Brain className="w-4 h-4" />
                  <span>AI Growth Prediction (TensorFlow.js)</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {modelReady ? "Model Ready" : "Not Trained"}
                  </Badge>
                </button>

                {showMLPanel && (
                  <div className="mt-3 space-y-3">
                    <Card className="border-dashed border-border/50">
                      <CardContent className="pt-4 space-y-3">
                        {!modelReady ? (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Train an LSTM model on historical EPS data from 25+ Indonesian stocks to predict growth rates.
                            </p>
                            <Button
                              onClick={handleTrainModel}
                              disabled={isTraining}
                              className="w-full"
                              variant="outline"
                              size="sm"
                            >
                              {isTraining ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Training... Epoch {trainingProgress.epoch}/50
                                </>
                              ) : (
                                <>
                                  <Cpu className="w-4 h-4 mr-2" />
                                  Train Model
                                </>
                              )}
                            </Button>
                            {isTraining && (
                              <Progress value={(trainingProgress.epoch / 50) * 100} className="h-2" />
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Model trained. Click predict to get ML-based EPS growth prediction for this stock.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={handlePredict}
                                className="flex-1"
                                variant="outline"
                                size="sm"
                              >
                                <Brain className="w-4 h-4 mr-2" />
                                Predict Growth
                              </Button>
                              <Button
                                onClick={handleTrainModel}
                                disabled={isTraining}
                                variant="ghost"
                                size="sm"
                              >
                                {isTraining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Re-train"}
                              </Button>
                            </div>
                            {mlPrediction && (
                              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Predicted Growth</span>
                                  <span className="font-mono font-medium">{mlPrediction.predictedGrowthRate}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Confidence</span>
                                  <span className="font-mono">{(mlPrediction.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Next Year EPS</span>
                                  <span className="font-mono">{mlPrediction.nextYearEPS}</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-8 space-y-6" aria-live="polite">
          {!result ? (
            <Card className="border-border/60 shadow-sm h-full min-h-[400px] flex items-center justify-center bg-muted/20">
              <div className="text-center text-muted-foreground p-8">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center">
                  <Calculator className="w-6 h-6 opacity-30" />
                </div>
                <h3 className="font-serif text-lg italic mb-1">Awaiting input</h3>
                <p className="text-sm max-w-xs mx-auto">Enter a stock ticker and fetch data, or fill in the fields manually to see the analysis.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Report Card (for export) */}
              <Card className="border-border/60 shadow-sm overflow-hidden" ref={reportCardRef}>
                <div className="bg-card p-6 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="font-serif text-3xl md:text-4xl italic tracking-tight">{ticker}</h2>
                        <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(result.status)}`}>
                          {result.status}
                        </Badge>
                      </div>
                      <div className="font-mono text-2xl text-muted-foreground">
                        {formatCurrency(form.getValues().price)}
                      </div>
                    </div>
                    
                    {/* Lens — the signature element */}
                    <div className="relative">
                      <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-2 border-primary/15 flex flex-col items-center justify-center bg-primary/[0.03]">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Intrinsic Value</div>
                        <div className="font-serif text-3xl md:text-4xl italic text-primary leading-none">
                          {formatCurrency(result.fairValue)}
                        </div>
                        <div className={`text-xs font-medium mt-1.5 ${
                          result.marginOfSafety !== null && result.marginOfSafety > 0 ? "text-emerald-600" : "text-destructive"
                        }`}>
                          {result.marginOfSafety !== null ? (
                            <>
                              {result.marginOfSafety > 0 ? "↑" : "↓"} {formatPercent(result.marginOfSafety)} MoS
                            </>
                          ) : "MoS N/A"}
                        </div>
                      </div>
                      {result.mlGrowthRate !== null && (
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-card border border-border/60 rounded-full px-3 py-1 shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <Brain className="w-3 h-3 text-primary" />
                            <span className="font-mono text-xs font-medium">{formatCurrency(result.fairValueML)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 rounded-lg overflow-hidden mb-8">
                    <div className="bg-card p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">DCF Value</div>
                      <div className="font-mono text-lg">{formatCurrency(result.dcfValue)}</div>
                      {result.mlGrowthRate !== null && (
                        <div className="text-[10px] text-primary font-mono mt-1">
                          ML: {formatCurrency(result.dcfValueML)}
                        </div>
                      )}
                    </div>
                    <div className="bg-card p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Graham No.</div>
                      <div className="font-mono text-lg">{formatCurrency(result.grahamNumber)}</div>
                    </div>
                    <div className="bg-card p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">P/E Band</div>
                      <div className="font-mono text-lg">{formatCurrency(result.peBandValue)}</div>
                    </div>
                    <div className="bg-card p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Financial Score</div>
                      <div className="flex items-center gap-2.5">
                        <div className="font-mono text-lg">{result.financialScore}<span className="text-xs text-muted-foreground">/100</span></div>
                        <Progress value={result.financialScore} className="h-1.5 flex-1" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Key Metrics</h3>
                      <div className="space-y-0 divide-y divide-border/40">
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-sm">P/E Ratio</span>
                          <span className="font-mono text-sm">{formatNumber(result.per)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-sm">P/B Ratio</span>
                          <span className="font-mono text-sm">{formatNumber(result.pbv)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-sm">Dividend Yield</span>
                          <span className="font-mono text-sm">{formatPercent(result.dividendYield)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-sm">EPS Growth (CAGR)</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm">{formatPercent(result.epsCagr !== null ? result.epsCagr * 100 : null)}</span>
                            {result.epsGrowthTrend === "Increasing" && <TrendingUp className="w-3 h-3 text-emerald-600" />}
                            {result.epsGrowthTrend === "Declining" && <TrendingDown className="w-3 h-3 text-destructive" />}
                            {result.epsGrowthTrend === "Stable" && <Minus className="w-3 h-3 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Health Checklist</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          { pass: result.checklist.roeHigh, label: "ROE > 15%" },
                          { pass: result.checklist.derLow, label: "D/E < 1" },
                          { pass: result.checklist.epsPositive, label: "Positive EPS", critical: true },
                          { pass: result.checklist.growthPositive, label: "Positive Growth" },
                          { pass: result.checklist.pbvLow, label: "P/B < 3" },
                          { pass: result.checklist.perLow, label: "P/E < 15" },
                        ].map(({ pass, label, critical }) => (
                          <div key={label} className="flex items-center gap-2 text-sm">
                            {pass ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : critical ? (
                              <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                            )}
                            <span className={pass ? "" : critical ? "text-destructive" : "text-muted-foreground"}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Buy/Sell Price Zones */}
                  {(result.priceZone || result.priceZoneML) && (
                    <div className="mt-8 pt-6 border-t border-border/60">
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Harga Rekomendasi</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.priceZone && (
                          <div className="bg-muted/30 rounded-lg p-4 space-y-2.5">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Fair Value Analysis</div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-emerald-600 font-medium">Beli di bawah</span>
                                <span className="font-mono text-sm font-semibold text-emerald-600">{formatCurrency(result.priceZone.buyBelow)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Range beli ideal</span>
                                <span className="font-mono text-sm">{formatCurrency(result.priceZone.buyRangeLow)} — {formatCurrency(result.priceZone.buyRangeHigh)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-amber-600 font-medium">Target jual</span>
                                <span className="font-mono text-sm font-semibold text-amber-600">{formatCurrency(result.priceZone.sellTarget)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1.5 border-t border-border/40">
                                <span className="text-sm text-muted-foreground">Harga saat ini</span>
                                <span className="font-mono text-sm font-semibold">{formatCurrency(result.priceZone.currentPrice)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {result.priceZoneML && result.mlGrowthRate !== null && (
                          <div className="bg-primary/[0.03] rounded-lg p-4 space-y-2.5 border border-primary/10">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 flex items-center gap-1.5">
                              <Brain className="w-3 h-3" /> ML-Based Prediction
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-emerald-600 font-medium">Beli di bawah</span>
                                <span className="font-mono text-sm font-semibold text-emerald-600">{formatCurrency(result.priceZoneML.buyBelow)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Range beli ideal</span>
                                <span className="font-mono text-sm">{formatCurrency(result.priceZoneML.buyRangeLow)} — {formatCurrency(result.priceZoneML.buyRangeHigh)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-amber-600 font-medium">Target jual</span>
                                <span className="font-mono text-sm font-semibold text-amber-600">{formatCurrency(result.priceZoneML.sellTarget)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stock Condition Summary */}
                  <div className="mt-6 pt-6 border-t border-border/60">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Kondisi Saham</h3>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant={result.condition.verdict === "Strong Buy" || result.condition.verdict === "Buy" ? "default" : result.condition.verdict === "Avoid" ? "destructive" : "secondary"} className="text-sm font-semibold px-3 py-1">
                          {result.condition.verdict}
                        </Badge>
                        <span className="font-serif text-lg italic">{result.condition.verdictID}</span>
                      </div>

                      {result.condition.positives.length > 0 && (
                        <div className="mb-3">
                          <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 mb-1.5">Positif</div>
                          <ul className="space-y-1">
                            {result.condition.positives.map((p, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.condition.risks.length > 0 && (
                        <div className="mb-3">
                          <div className="text-[10px] font-semibold uppercase tracking-widest text-destructive mb-1.5">Risiko</div>
                          <ul className="space-y-1">
                            {result.condition.risks.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.condition.sectorNote && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2.5 mt-2">
                          <span className="font-semibold">Sektor:</span> {result.condition.sectorNote}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 bg-muted/30 px-6 md:px-8 py-3 flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground gap-2">
                  <span className="font-serif italic">ValuLens</span>
                  <span className="text-center">
                    Analyzed {(analyzedAt ?? new Date()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · {analyzedPeriod || "—"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/50">funda.farelhanafi.my.id</span>
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
