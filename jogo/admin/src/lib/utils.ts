import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVE(amount: number): string {
  return `${amount.toFixed(2)} VE`;
}

export function formatCS(amount: number): string {
  return `${amount.toLocaleString()} CS`;
}

export function formatTON(amount: number): string {
  return `${amount.toFixed(4)} TON`;
}

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function riskScoreColor(score: number): string {
  if (score <= 30) return "text-emerald-500";
  if (score <= 60) return "text-amber-500";
  return "text-red-500";
}

export function riskScoreBg(score: number): string {
  if (score <= 30) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (score <= 60) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

export function rarityColor(rarity: string): string {
  switch (rarity) {
    case "common": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    case "rare": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "epic": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "legendary": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "pending": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "approved": case "completed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "rejected": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "processing": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "failed": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}
