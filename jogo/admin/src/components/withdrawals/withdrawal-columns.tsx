"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { riskScoreBg, statusColor, formatRelativeTime, truncateAddress } from "@/lib/utils";
import type { Withdrawal } from "@/data/types";

export const withdrawalColumns: ColumnDef<Withdrawal>[] = [
  { accessorKey: "id", header: "ID", cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("id")}</span> },
  { accessorKey: "playerUsername", header: "Player" },
  { accessorKey: "tonWallet", header: "Wallet", cell: ({ row }) => <span className="font-mono text-xs">{truncateAddress(row.getValue("tonWallet") as string)}</span> },
  { accessorKey: "veAmount", header: "VE", cell: ({ row }) => <span className="font-mono">{(row.getValue("veAmount") as number).toFixed(2)}</span> },
  { accessorKey: "tonAmount", header: "TON", cell: ({ row }) => <span className="font-mono">{(row.getValue("tonAmount") as number).toFixed(4)}</span> },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge className={statusColor(row.getValue("status") as string)}>{row.getValue("status") as string}</Badge> },
  { accessorKey: "riskScore", header: "Risk", cell: ({ row }) => <Badge className={riskScoreBg(row.getValue("riskScore") as number)}>{row.getValue("riskScore") as number}</Badge> },
  { accessorKey: "requestedAt", header: "Requested", cell: ({ row }) => formatRelativeTime(row.getValue("requestedAt")) },
];
