import { Withdrawal } from "./types";

export const withdrawals: Withdrawal[] = [
  { id: "W001", playerId: "P001", playerUsername: "void_farmer_42", tonWallet: "EQD...x7K2", veAmount: 25.50, tonAmount: 0.1275, status: "pending", riskScore: 15, requestedAt: "2026-05-18T14:30:00Z", processedAt: null, rejectionReason: null, processedBy: null },
  { id: "W002", playerId: "P002", playerUsername: "crypto_hunter", tonWallet: "EQC...m9P1", veAmount: 100.00, tonAmount: 0.5000, status: "pending", riskScore: 42, requestedAt: "2026-05-18T13:15:00Z", processedAt: null, rejectionReason: null, processedBy: null },
  { id: "W003", playerId: "P003", playerUsername: "guardian_master", tonWallet: "EQD...a3B8", veAmount: 10.20, tonAmount: 0.0510, status: "approved", riskScore: 8, requestedAt: "2026-05-18T10:00:00Z", processedAt: "2026-05-18T11:30:00Z", rejectionReason: null, processedBy: "admin1" },
  { id: "W004", playerId: "P004", playerUsername: "shard_collector", tonWallet: "EQB...k5T3", veAmount: 50.75, tonAmount: 0.2538, status: "pending", riskScore: 65, requestedAt: "2026-05-18T09:45:00Z", processedAt: null, rejectionReason: null, processedBy: null },
  { id: "W005", playerId: "P005", playerUsername: "ton_whale_99", tonWallet: "EQD...j2M7", veAmount: 500.00, tonAmount: 2.5000, status: "pending", riskScore: 78, requestedAt: "2026-05-18T08:20:00Z", processedAt: null, rejectionReason: null, processedBy: null },
  { id: "W006", playerId: "P006", playerUsername: "idle_king", tonWallet: "EQC...p4R6", veAmount: 15.30, tonAmount: 0.0765, status: "completed", riskScore: 5, requestedAt: "2026-05-17T16:00:00Z", processedAt: "2026-05-17T18:00:00Z", rejectionReason: null, processedBy: "admin1" },
  { id: "W007", playerId: "P007", playerUsername: "void_breaker", tonWallet: "EQD...n8L4", veAmount: 75.00, tonAmount: 0.3750, status: "rejected", riskScore: 85, requestedAt: "2026-05-17T14:00:00Z", processedAt: "2026-05-17T15:00:00Z", rejectionReason: "Suspicious farming pattern detected", processedBy: "admin1" },
  { id: "W008", playerId: "P008", playerUsername: "crystal_farm", tonWallet: "EQB...w2K9", veAmount: 20.00, tonAmount: 0.1000, status: "completed", riskScore: 12, requestedAt: "2026-05-17T12:00:00Z", processedAt: "2026-05-17T14:00:00Z", rejectionReason: null, processedBy: "admin2" },
  { id: "W009", playerId: "P009", playerUsername: "aether_hunter", tonWallet: "EQD...r7J5", veAmount: 35.25, tonAmount: 0.1763, status: "pending", riskScore: 22, requestedAt: "2026-05-18T07:00:00Z", processedAt: null, rejectionReason: null, processedBy: null },
  { id: "W010", playerId: "P010", playerUsername: "storm_sentry", tonWallet: "EQC...t1N8", veAmount: 120.00, tonAmount: 0.6000, status: "processing", riskScore: 35, requestedAt: "2026-05-18T06:30:00Z", processedAt: null, rejectionReason: null, processedBy: "admin1" },
  { id: "W011", playerId: "P011", playerUsername: "quantum_miner", tonWallet: "EQD...u3P2", veAmount: 45.00, tonAmount: 0.2250, status: "pending", riskScore: 18, requestedAt: "2026-05-18T05:00:00Z", processedAt: null, rejectionReason: null, processedBy: null },
  { id: "W012", playerId: "P012", playerUsername: "dark_warden", tonWallet: "EQB...v6Q4", veAmount: 8.50, tonAmount: 0.0425, status: "completed", riskScore: 3, requestedAt: "2026-05-17T10:00:00Z", processedAt: "2026-05-17T12:00:00Z", rejectionReason: null, processedBy: "admin1" },
  { id: "W013", playerId: "P013", playerUsername: "nova_spark", tonWallet: "EQD...w8S6", veAmount: 200.00, tonAmount: 1.0000, status: "pending", riskScore: 55, requestedAt: "2026-05-18T03:00:00Z", processedAt: null, rejectionReason: null, processedBy: null },
  { id: "W014", playerId: "P014", playerUsername: "pixel_druid", tonWallet: "EQC...x1T8", veAmount: 12.75, tonAmount: 0.0638, status: "approved", riskScore: 10, requestedAt: "2026-05-18T02:00:00Z", processedAt: "2026-05-18T04:00:00Z", rejectionReason: null, processedBy: "admin2" },
  { id: "W015", playerId: "P015", playerUsername: "void_walker_7", tonWallet: "EQD...y4U0", veAmount: 60.00, tonAmount: 0.3000, status: "failed", riskScore: 28, requestedAt: "2026-05-17T20:00:00Z", processedAt: "2026-05-17T22:00:00Z", rejectionReason: null, processedBy: "admin1" },
];

export async function fetchWithdrawals(): Promise<Withdrawal[]> {
  await new Promise((r) => setTimeout(r, 300));
  return [...withdrawals];
}

export async function approveWithdrawal(id: string): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 500));
  const w = withdrawals.find((w) => w.id === id);
  if (w) { w.status = "approved"; w.processedAt = new Date().toISOString(); }
  return { success: true };
}

export async function rejectWithdrawal(id: string, reason: string): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 500));
  const w = withdrawals.find((w) => w.id === id);
  if (w) { w.status = "rejected"; w.rejectionReason = reason; w.processedAt = new Date().toISOString(); }
  return { success: true };
}
