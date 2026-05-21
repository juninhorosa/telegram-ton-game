"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { riskScoreBg, formatRelativeTime } from "@/lib/utils";
import type { Player } from "@/data/types";

export const playerColumns: ColumnDef<Player>[] = [
  { accessorKey: "username", header: "Username", cell: ({ row }) => <span className="font-medium">{row.getValue("username")}</span> },
  { accessorKey: "telegramId", header: "Telegram ID", cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("telegramId")}</span> },
  { accessorKey: "tonWallet", header: "Wallet", cell: ({ row }) => {
    const wallet = row.getValue("tonWallet") as string | null;
    return <span className="text-muted-foreground">{wallet ?? "Not connected"}</span>;
  }},
  { accessorKey: "veBalance", header: "VE Balance", cell: ({ row }) => <span className="font-mono">{(row.getValue("veBalance") as number).toFixed(2)}</span> },
  { accessorKey: "guardianCount", header: "Guardians" },
  { accessorKey: "riskScore", header: "Risk", cell: ({ row }) => {
    const score = row.getValue("riskScore") as number;
    return <Badge className={riskScoreBg(score)}>{score}</Badge>;
  }},
  { accessorKey: "isBanned", header: "Status", cell: ({ row }) => {
    const banned = row.getValue("isBanned") as boolean;
    return banned ? <Badge variant="destructive">Banned</Badge> : <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
  }},
  { accessorKey: "lastActiveAt", header: "Last Active", cell: ({ row }) => formatRelativeTime(row.getValue("lastActiveAt")) },
];
