"use client";

import { useEffect, useState } from "react";
import { fetchFraudCases, fetchDetectionRules, confirmFraud, markFalsePositive } from "@/data";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { riskScoreBg, formatRelativeTime } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { ShieldCheck, ShieldX, Download } from "lucide-react";
import type { FraudCase, DetectionRule } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";

export default function FraudPage() {
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FraudCase | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    Promise.all([fetchFraudCases(), fetchDetectionRules()]).then(([c, r]) => { setCases(c); setRules(r); setLoading(false); });
  }, []);

  const handleConfirmFraud = async (caseId: string) => {
    await confirmFraud(caseId);
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, status: "confirmed_fraud" } : c));
    toast({ title: "Fraud confirmed", description: "Account has been banned and VE confiscated" });
  };

  const handleFalsePositive = async (caseId: string) => {
    await markFalsePositive(caseId);
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, status: "false_positive" } : c));
    toast({ title: "Marked as false positive" });
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Player", "Risk Score", "Status", "Triggers", "Detected At"];
    const rows = cases.map((c) => [c.id, c.playerUsername, c.riskScore, c.status, c.triggers.map((t) => t.rule).join(";"), c.detectedAt]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "fraud-cases.csv"; a.click();
  };

  const caseColumns: ColumnDef<FraudCase>[] = [
    { accessorKey: "playerUsername", header: "Player" },
    { accessorKey: "riskScore", header: "Risk Score", cell: ({ row }) => <Badge className={riskScoreBg(row.getValue("riskScore") as number)}>{row.getValue("riskScore") as number}</Badge> },
    { accessorKey: "triggers", header: "Triggers", cell: ({ row }) => (row.getValue("triggers") as FraudCase["triggers"]).length },
    { accessorKey: "status", header: "Status", cell: ({ row }) => {
      const s = row.getValue("status") as string;
      const colors: Record<string, string> = { pending: "bg-amber-500/10 text-amber-500 border-amber-500/20", confirmed_fraud: "bg-red-500/10 text-red-500 border-red-500/20", false_positive: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
      return <Badge className={colors[s] ?? ""}>{s.replace("_", " ")}</Badge>;
    }},
    { accessorKey: "detectedAt", header: "Detected", cell: ({ row }) => formatRelativeTime(row.getValue("detectedAt")) },
    { id: "actions", cell: ({ row }) => {
      const c = row.original;
      if (c.status !== "pending") return null;
      return (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelected(c); setReviewOpen(true); }}>
            <ShieldCheck className="h-4 w-4" />
          </Button>
        </div>
      );
    }},
  ];

  if (loading) {
    return <div className="space-y-4"><h1 className="text-2xl font-bold">Anti-Fraud</h1><Skeleton className="h-[400px]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Anti-Fraud & Monitoring</h1>
        <Button variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </div>

      <DataTable
        columns={caseColumns}
        data={cases}
        searchPlaceholder="Search by player..."
        searchColumn="playerUsername"
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Detection Rules</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Rule</TableHead><TableHead>Description</TableHead><TableHead>Threshold</TableHead><TableHead>Auto Action</TableHead><TableHead>Enabled</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{rule.description}</TableCell>
                  <TableCell><Badge variant="outline">{rule.threshold}</Badge></TableCell>
                  <TableCell>{rule.autoAction}</TableCell>
                  <TableCell><Switch checked={rule.isEnabled} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Fraud Case</DialogTitle>
            <DialogDescription>{selected?.playerUsername} - Risk Score: {selected?.riskScore}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Risk Score Breakdown</h4>
                {selected.triggers.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">{t.rule.replace(/_/g, " ")}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </div>
                    <Badge variant="outline">+{t.points} pts</Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => { handleConfirmFraud(selected.id); setReviewOpen(false); }}>
                  <ShieldX className="h-4 w-4 mr-2" /> Confirm Fraud
                </Button>
                <Button variant="outline" onClick={() => { handleFalsePositive(selected.id); setReviewOpen(false); }}>
                  <ShieldCheck className="h-4 w-4 mr-2" /> False Positive
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
