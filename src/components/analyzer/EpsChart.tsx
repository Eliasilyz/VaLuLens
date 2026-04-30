import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/currency";

interface EpsChartProps {
  data: { year: number; eps: number }[];
  ticker?: string;
}

export default function EpsChart({ data, ticker }: EpsChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="year" 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => formatCurrency(val, ticker)}
            dx={-10}
            width={80}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius-md)",
              color: "hsl(var(--foreground))"
            }}
            itemStyle={{ color: "hsl(var(--primary))" }}
            formatter={(value: number) => [formatCurrency(value, ticker), "EPS"]}
            labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="eps" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ r: 4, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
