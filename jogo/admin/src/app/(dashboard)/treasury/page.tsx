"use client";

import { useEffect, useState } from "react";
import { fetchTreasuryData } from "@/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTON, formatLargeNumber } from "@/lib/utils";
import { Vault, TrendingUp, Flame, ArrowDownToLine, DollarSign } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import type { TreasuryData } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default function TreasuryPage() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    fetchTreasuryData().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return <div className="space-y-4"><h1 className="text-2xl font-bold">Treasury & Finances</h1><Skeleton className="h-[400px]" /></div>;
  }

  const filteredHistory = data.emissionBurnHistory.slice(-range);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Treasury & Finances</h1>

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Vault className="h-4 w-4" /> Treasury</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatTON(data.balanceTon)}</div><div className="text-xs text-muted-foreground">${data.balanceUsd.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> VE Emitted</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatLargeNumber(data.veEmitted)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Flame className="h-4 w-4" /> VE Burned</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatLargeNumber(data.veBurned)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" /> Paid Out</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatTON(data.totalPaidOut)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Revenue</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatTON(data.totalRevenue)}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Emission vs Burn</CardTitle>
              <div className="flex gap-1">
                {[30, 60, 90].map((r) => (
                  <Button key={r} variant={range === r ? "secondary" : "ghost"} size="sm" onClick={() => setRange(r as 30 | 60 | 90)}>{r}d</Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredHistory}>
                  <defs>
                    <linearGradient id="emittedT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="burnedT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v) => Number(v).toLocaleString()} />
                  <Legend />
                  <Area type="monotone" dataKey="emitted" name="Emitted" stroke="#10b981" fill="url(#emittedT)" />
                  <Area type="monotone" dataKey="burned" name="Burned" stroke="#ef4444" fill="url(#burnedT)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="amount" name="TON" radius={[4, 4, 0, 0]}>
                    {data.revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Withdrawal Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.withdrawalDistribution} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={80} label>
                  {data.withdrawalDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
