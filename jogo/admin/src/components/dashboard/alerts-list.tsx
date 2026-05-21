"use client";

import { AlertTriangle, Info, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Alert } from "@/data/types";

interface AlertsListProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

const ALERT_STYLES = {
  critical: { icon: AlertCircle, bg: "bg-red-500/10 border-red-500/20", text: "text-red-500" },
  warning: { icon: AlertTriangle, bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500" },
  info: { icon: Info, bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500" },
};

export function AlertsList({ alerts, onDismiss }: AlertsListProps) {
  const activeAlerts = alerts.filter((a) => !a.dismissed);
  if (activeAlerts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Active Alerts ({activeAlerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeAlerts.map((alert) => {
          const style = ALERT_STYLES[alert.type];
          const Icon = style.icon;
          return (
            <div key={alert.id} className={cn("flex items-start gap-3 rounded-lg border p-3", style.bg)}>
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", style.text)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{alert.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{alert.message}</div>
              </div>
              {onDismiss && (
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onDismiss(alert.id)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
