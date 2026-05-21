import { Player, Guardian, Transaction } from "./types";

export const players: Player[] = [
  { id: "P001", telegramId: "100001", username: "void_farmer_42", tonWallet: "EQD...x7K2", createdAt: "2026-04-20T10:00:00Z", lastActiveAt: "2026-05-18T14:00:00Z", veBalance: 45.20, csBalance: 12500, pendingVE: 2.40, pendingCS: 360, riskScore: 15, isBanned: false, banType: "none", referralCode: "VOID42", referredBy: null, referralCount: 8, guardianCount: 5, totalWithdrawn: 120.50, notes: [], fraudFlags: [], daysActive: 28 },
  { id: "P002", telegramId: "100002", username: "crypto_hunter", tonWallet: "EQC...m9P1", createdAt: "2026-04-22T14:00:00Z", lastActiveAt: "2026-05-18T13:00:00Z", veBalance: 230.00, csBalance: 45000, pendingVE: 5.10, pendingCS: 765, riskScore: 42, isBanned: false, banType: "none", referralCode: "HUNT99", referredBy: "P001", referralCount: 3, guardianCount: 8, totalWithdrawn: 450.00, notes: [{ id: "N001", adminName: "admin1", content: "Active player, high engagement", createdAt: "2026-05-10T10:00:00Z" }], fraudFlags: [], daysActive: 26 },
  { id: "P003", telegramId: "100003", username: "guardian_master", tonWallet: "EQD...a3B8", createdAt: "2026-04-25T08:00:00Z", lastActiveAt: "2026-05-18T11:00:00Z", veBalance: 18.50, csBalance: 8200, pendingVE: 1.20, pendingCS: 180, riskScore: 8, isBanned: false, banType: "none", referralCode: "MSTR3", referredBy: null, referralCount: 12, guardianCount: 4, totalWithdrawn: 55.00, notes: [], fraudFlags: [], daysActive: 23 },
  { id: "P004", telegramId: "100004", username: "shard_collector", tonWallet: "EQB...k5T3", createdAt: "2026-05-01T16:00:00Z", lastActiveAt: "2026-05-18T09:00:00Z", veBalance: 85.00, csBalance: 22000, pendingVE: 3.80, pendingCS: 570, riskScore: 65, isBanned: false, banType: "none", referralCode: "SHARD7", referredBy: "P002", referralCount: 1, guardianCount: 6, totalWithdrawn: 200.00, notes: [{ id: "N002", adminName: "admin1", content: "High farming rate, monitoring", createdAt: "2026-05-15T10:00:00Z" }], fraudFlags: [{ id: "F001", type: "high_farming_rate", description: "Farming rate 4x above rarity average", detectedAt: "2026-05-15T10:00:00Z" }], daysActive: 17 },
  { id: "P005", telegramId: "100005", username: "ton_whale_99", tonWallet: "EQD...j2M7", createdAt: "2026-04-21T12:00:00Z", lastActiveAt: "2026-05-18T08:00:00Z", veBalance: 580.00, csBalance: 95000, pendingVE: 12.00, pendingCS: 1800, riskScore: 78, isBanned: false, banType: "none", referralCode: "WHALE9", referredBy: null, referralCount: 2, guardianCount: 12, totalWithdrawn: 1200.00, notes: [{ id: "N003", adminName: "admin1", content: "Top spender, VIP treatment", createdAt: "2026-05-05T10:00:00Z" }], fraudFlags: [{ id: "F002", type: "rapid_saccumulation", description: "Account created + large withdrawal in < 48h", detectedAt: "2026-04-22T12:00:00Z" }], daysActive: 27 },
  { id: "P006", telegramId: "100006", username: "idle_king", tonWallet: "EQC...p4R6", createdAt: "2026-04-28T20:00:00Z", lastActiveAt: "2026-05-17T18:00:00Z", veBalance: 22.10, csBalance: 6800, pendingVE: 0.90, pendingCS: 135, riskScore: 5, isBanned: false, banType: "none", referralCode: "IDLE6", referredBy: "P003", referralCount: 0, guardianCount: 3, totalWithdrawn: 30.00, notes: [], fraudFlags: [], daysActive: 20 },
  { id: "P007", telegramId: "100007", username: "void_breaker", tonWallet: "EQD...n8L4", createdAt: "2026-05-10T14:00:00Z", lastActiveAt: "2026-05-17T15:00:00Z", veBalance: 0.00, csBalance: 0, pendingVE: 0, pendingCS: 0, riskScore: 85, isBanned: true, banType: "soft", referralCode: "BRK7", referredBy: "P004", referralCount: 0, guardianCount: 0, totalWithdrawn: 0, notes: [{ id: "N004", adminName: "admin1", content: "Banned for fraudulent farming pattern", createdAt: "2026-05-17T15:00:00Z" }], fraudFlags: [{ id: "F003", type: "robotic_timing", description: "Collection timing < 0.5s variance in 100+ collections", detectedAt: "2026-05-17T14:00:00Z" }], daysActive: 7 },
  { id: "P008", telegramId: "100008", username: "crystal_farm", tonWallet: "EQB...w2K9", createdAt: "2026-04-30T10:00:00Z", lastActiveAt: "2026-05-17T14:00:00Z", veBalance: 30.50, csBalance: 9500, pendingVE: 1.50, pendingCS: 225, riskScore: 12, isBanned: false, banType: "none", referralCode: "CRYS8", referredBy: null, referralCount: 5, guardianCount: 4, totalWithdrawn: 80.00, notes: [], fraudFlags: [], daysActive: 18 },
  { id: "P009", telegramId: "100009", username: "aether_hunter", tonWallet: "EQD...r7J5", createdAt: "2026-05-05T08:00:00Z", lastActiveAt: "2026-05-18T07:00:00Z", veBalance: 55.80, csBalance: 15000, pendingVE: 2.80, pendingCS: 420, riskScore: 22, isBanned: false, banType: "none", referralCode: "AETH9", referredBy: "P001", referralCount: 2, guardianCount: 5, totalWithdrawn: 100.00, notes: [], fraudFlags: [], daysActive: 13 },
  { id: "P010", telegramId: "100010", username: "storm_sentry", tonWallet: "EQC...t1N8", createdAt: "2026-05-08T12:00:00Z", lastActiveAt: "2026-05-18T06:00:00Z", veBalance: 150.00, csBalance: 35000, pendingVE: 6.00, pendingCS: 900, riskScore: 35, isBanned: false, banType: "none", referralCode: "STORM10", referredBy: "P003", referralCount: 1, guardianCount: 7, totalWithdrawn: 250.00, notes: [], fraudFlags: [], daysActive: 10 },
];

export const guardians: Guardian[] = [
  { id: "G001", playerId: "P001", name: "Aether Sprite", rarity: "common", level: 5, farmingPower: 1.8, vePerHour: 0.14, csPerHour: 21, acquiredAt: "2026-04-20T10:00:00Z" },
  { id: "G002", playerId: "P001", name: "Storm Sentinel", rarity: "rare", level: 3, farmingPower: 3.0, vePerHour: 0.45, csPerHour: 68, acquiredAt: "2026-04-25T14:00:00Z" },
  { id: "G003", playerId: "P001", name: "Void Titan", rarity: "epic", level: 1, farmingPower: 6.0, vePerHour: 1.00, csPerHour: 150, acquiredAt: "2026-05-01T10:00:00Z" },
  { id: "G004", playerId: "P002", name: "Cosmic Leviathan", rarity: "legendary", level: 2, farmingPower: 18.0, vePerHour: 3.60, csPerHour: 540, acquiredAt: "2026-04-23T10:00:00Z" },
  { id: "G005", playerId: "P002", name: "Storm Sentinel", rarity: "rare", level: 7, farmingPower: 6.0, vePerHour: 0.90, csPerHour: 135, acquiredAt: "2026-04-24T10:00:00Z" },
  { id: "G006", playerId: "P003", name: "Aether Sprite", rarity: "common", level: 8, farmingPower: 2.6, vePerHour: 0.21, csPerHour: 32, acquiredAt: "2026-04-25T08:00:00Z" },
  { id: "G007", playerId: "P004", name: "Void Titan", rarity: "epic", level: 4, farmingPower: 9.6, vePerHour: 1.60, csPerHour: 240, acquiredAt: "2026-05-02T10:00:00Z" },
  { id: "G008", playerId: "P005", name: "Cosmic Leviathan", rarity: "legendary", level: 5, farmingPower: 27.0, vePerHour: 5.40, csPerHour: 810, acquiredAt: "2026-04-22T10:00:00Z" },
  { id: "G009", playerId: "P005", name: "Cosmic Leviathan", rarity: "legendary", level: 3, farmingPower: 19.5, vePerHour: 3.90, csPerHour: 585, acquiredAt: "2026-04-25T10:00:00Z" },
  { id: "G010", playerId: "P008", name: "Storm Sentinel", rarity: "rare", level: 6, farmingPower: 5.5, vePerHour: 0.83, csPerHour: 124, acquiredAt: "2026-05-01T10:00:00Z" },
];

export const transactions: Transaction[] = [
  { id: "T001", playerId: "P001", type: "purchase", amount: 0.5, currency: "TON", createdAt: "2026-04-20T10:00:00Z", description: "Purchased Aether Sprite" },
  { id: "T002", playerId: "P001", type: "purchase", amount: 2.0, currency: "TON", createdAt: "2026-04-25T14:00:00Z", description: "Purchased Storm Sentinel" },
  { id: "T003", playerId: "P001", type: "withdrawal", amount: 50.0, currency: "VE", createdAt: "2026-05-10T10:00:00Z", description: "Withdrawal to TON wallet" },
  { id: "T004", playerId: "P001", type: "upgrade", amount: 600, currency: "CS", createdAt: "2026-05-12T10:00:00Z", description: "Upgraded Aether Sprite to Level 5" },
  { id: "T005", playerId: "P002", type: "purchase", amount: 25.0, currency: "TON", createdAt: "2026-04-23T10:00:00Z", description: "Purchased Cosmic Leviathan" },
  { id: "T006", playerId: "P002", type: "referral_commission", amount: 5.0, currency: "VE", createdAt: "2026-05-01T10:00:00Z", description: "Referral commission from P004" },
  { id: "T007", playerId: "P002", type: "withdrawal", amount: 200.0, currency: "VE", createdAt: "2026-05-15T10:00:00Z", description: "Withdrawal to TON wallet" },
  { id: "T008", playerId: "P003", type: "reward", amount: 100, currency: "CS", createdAt: "2026-04-25T08:00:00Z", description: "Welcome bonus" },
  { id: "T009", playerId: "P004", type: "fusion", amount: 3, currency: "VE", createdAt: "2026-05-05T10:00:00Z", description: "Fusion: 3x Common → 1x Rare" },
  { id: "T010", playerId: "P005", type: "purchase", amount: 50.0, currency: "TON", createdAt: "2026-04-21T12:00:00Z", description: "Purchased Cosmic Leviathan x2" },
];

export async function fetchPlayers(): Promise<Player[]> {
  await new Promise((r) => setTimeout(r, 300));
  return [...players];
}

export async function fetchPlayerById(id: string): Promise<Player | null> {
  await new Promise((r) => setTimeout(r, 200));
  return players.find((p) => p.id === id) ?? null;
}

export async function fetchPlayerGuardians(playerId: string): Promise<Guardian[]> {
  await new Promise((r) => setTimeout(r, 200));
  return guardians.filter((g) => g.playerId === playerId);
}

export async function fetchPlayerTransactions(playerId: string): Promise<Transaction[]> {
  await new Promise((r) => setTimeout(r, 200));
  return transactions.filter((t) => t.playerId === playerId);
}

export async function updatePlayerBalance(playerId: string, field: "veBalance" | "csBalance", amount: number): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 300));
  const player = players.find((p) => p.id === playerId);
  if (player) player[field] += amount;
  return { success: true };
}

export async function banPlayer(playerId: string, banType: "soft" | "hard"): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 300));
  const player = players.find((p) => p.id === playerId);
  if (player) { player.isBanned = true; player.banType = banType; }
  return { success: true };
}

export async function unbanPlayer(playerId: string): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 300));
  const player = players.find((p) => p.id === playerId);
  if (player) { player.isBanned = false; player.banType = "none"; }
  return { success: true };
}
