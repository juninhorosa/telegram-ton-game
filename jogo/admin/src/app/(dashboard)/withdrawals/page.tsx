"use client";

import { useEffect, useState } from "react";
import { fetchWithdrawals, approveWithdrawal, rejectWithdrawal } from "@/data";
import { DataTable } from "@/components/ui/data-table";
import { withdrawalColumns } from "@/components/withdrawals/withdrawal-columns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { riskScoreBg } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Check, X } from "lucide-react";
import type { Withdrawal } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [password, setPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchWithdrawals().then((data) => { setWithdrawals(data); setLoading(false); });
  }, []);

  const handleApprove = async () => {
    if (!selected || !password) return;
    setActionLoading(true);
    await approveWithdrawal(selected.id);
    setWithdrawals((prev) => prev.map((w) => w.id === selected.id ? { ...w, status: "approved" } : w));
    setApproveOpen(false);
    setSelected(null);
    setPassword("");
    setActionLoading(false);
    toast({ title: "Withdrawal approved", description: `Approved ${selected.veAmount} VE for ${selected.playerUsername}` });
  };

  const handleReject = async () => {
    if (!selected || rejectReason.length < 10) return;
    setActionLoading(true);
    await rejectWithdrawal(selected.id, rejectReason);
    setWithdrawals((prev) => prev.map((w) => w.id === selected.id ? { ...w, status: "rejected", rejectionReason: rejectReason } : w));
    setRejectOpen(false);
    setSelected(null);
    setRejectReason("");
    setActionLoading(false);
    toast({ title: "Withdrawal rejected", description: `Rejected withdrawal for ${selected.playerUsername}` });
  };

  const columnsWithActions: typeof withdrawalColumns = [
    ...withdrawalColumns,
    {
      id: "actions",
      cell: ({ row }) => {
        const w = row.original;
        if (w.status !== "pending") return null;
        return (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={(e) => { e.stopPropagation(); setSelected(w); setApproveOpen(true); }}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={(e) => { e.stopPropagation(); setSelected(w); setRejectOpen(true); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <div className="space-y-4"><h1 className="text-2xl font-bold">Withdrawals</h1><Skeleton className="h-[400px]" /></div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Withdrawals</h1>
      <DataTable
        columns={columnsWithActions}
        data={withdrawals}
        searchPlaceholder="Search by player..."
        searchColumn="playerUsername"
      />

      {/* Approve Modal */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>Review and approve this withdrawal request</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Player:</span> <span className="font-medium">{selected.playerUsername}</span></div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-mono">{selected.veAmount} VE</span></div>
                <div><span className="text-muted-foreground">Wallet:</span> <span className="font-mono text-xs">{selected.tonWallet}</span></div>
                <div><span className="text-muted-foreground">Risk Score:</span> <Badge className={riskScoreBg(selected.riskScore)}>{selected.riskScore}</Badge></div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" placeholder="Enter admin password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={!password || actionLoading}>{actionLoading ? "Processing..." : "Confirm Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this withdrawal</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (min 10 characters)</Label>
            <Textarea placeholder="Enter rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="text-xs text-muted-foreground text-right">{rejectReason.length}/10</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectReason.length < 10 || actionLoading}>{actionLoading ? "Processing..." : "Reject"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
