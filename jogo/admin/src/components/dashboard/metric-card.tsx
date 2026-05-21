import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, trend, trendValue, icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          {trend === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
          {trendValue && (
            <span className={cn("text-xs", trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground")}>
              {trendValue}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground ml-1">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
