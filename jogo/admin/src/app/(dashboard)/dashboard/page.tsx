"use client";

import { useEffect, useState } from "react";
import { Users, Coins, Vault, ArrowDownToLine } from "lucide-react";
import { fetchDashboardMetrics } from "@/data";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RegistrationsChart } from "@/components/dashboard/registrations-chart";
import { EmissionBurnChart } from "@/components/dashboard/emission-burn-chart";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { formatLargeNumber, formatTON } from "@/lib/utils";
import type { DashboardMetrics } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics().then((data) => {
      setMetrics(data);
      setLoading(false);
    });
  }, []);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[320px]" />
          <Skeleton className="h-[320px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Players (24h)"
          value={metrics.activePlayers24h.toLocaleString()}
          subtitle={`${metrics.totalPlayers.toLocaleString()} total`}
          trend="up"
          trendValue="+12%"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="VE in Circulation"
          value={formatLargeNumber(metrics.veInCirculation)}
          subtitle={`${formatLargeNumber(metrics.veBurned)} burned`}
          trend="up"
          trendValue="+2.3%"
          icon={<Coins className="h-4 w-4" />}
        />
        <MetricCard
          title="Treasury"
          value={formatTON(metrics.treasuryTon)}
          subtitle={`$${metrics.treasuryUsd.toLocaleString()}`}
          trend="down"
          trendValue="-5.1%"
          icon={<Vault className="h-4 w-4" />}
        />
        <MetricCard
          title="Pending Withdrawals"
          value={metrics.pendingWithdrawals.toString()}
          subtitle="awaiting review"
          trend={metrics.pendingWithdrawals > 10 ? "up" : "neutral"}
          trendValue={metrics.pendingWithdrawals > 10 ? "High" : "Normal"}
          icon={<ArrowDownToLine className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RegistrationsChart data={metrics.registrationsPerHour} />
        <EmissionBurnChart data={metrics.veEmissionHistory} />
      </div>

      <AlertsList alerts={metrics.alerts} />
    </div>
  );
}
