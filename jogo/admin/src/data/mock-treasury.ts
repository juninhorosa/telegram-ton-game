import { TreasuryData } from "./types";

export const treasuryData: TreasuryData = {
  balanceTon: 8542.5,
  balanceUsd: 17085.0,
  contractAddress: "EQD...TreasuryContractAddress...x7K2",
  veEmitted: 12_450_000,
  veBurned: 3_280_000,
  totalPaidOut: 4_250.0,
  totalRevenue: 15_230.0,
  revenueByCategory: [
    { category: "Guardian Purchases", amount: 8500.0 },
    { category: "Invocations", amount: 3200.0 },
    { category: "Battle Pass", amount: 2100.0 },
    { category: "Skins", amount: 980.0 },
    { category: "Extra Slots", amount: 450.0 },
  ],
  withdrawalDistribution: [
    { range: "0-10 VE", count: 120 },
    { range: "10-50 VE", count: 85 },
    { range: "50-100 VE", count: 42 },
    { range: "100-500 VE", count: 28 },
    { range: "500+ VE", count: 8 },
  ],
  emissionBurnHistory: [
    { date: "2026-04-19", emitted: 280000, burned: 45000 },
    { date: "2026-04-20", emitted: 310000, burned: 52000 },
    { date: "2026-04-21", emitted: 295000, burned: 48000 },
    { date: "2026-04-22", emitted: 320000, burned: 61000 },
    { date: "2026-04-23", emitted: 335000, burned: 55000 },
    { date: "2026-04-24", emitted: 350000, burned: 58000 },
    { date: "2026-04-25", emitted: 340000, burned: 63000 },
    { date: "2026-04-26", emitted: 365000, burned: 70000 },
    { date: "2026-04-27", emitted: 380000, burned: 72000 },
    { date: "2026-04-28", emitted: 370000, burned: 68000 },
    { date: "2026-04-29", emitted: 390000, burned: 75000 },
    { date: "2026-04-30", emitted: 400000, burned: 80000 },
    { date: "2026-05-01", emitted: 410000, burned: 82000 },
    { date: "2026-05-02", emitted: 395000, burned: 78000 },
    { date: "2026-05-03", emitted: 420000, burned: 85000 },
    { date: "2026-05-04", emitted: 435000, burned: 88000 },
    { date: "2026-05-05", emitted: 445000, burned: 91000 },
    { date: "2026-05-06", emitted: 430000, burned: 87000 },
    { date: "2026-05-07", emitted: 450000, burned: 93000 },
    { date: "2026-05-08", emitted: 460000, burned: 95000 },
    { date: "2026-05-09", emitted: 470000, burned: 98000 },
    { date: "2026-05-10", emitted: 455000, burned: 92000 },
    { date: "2026-05-11", emitted: 480000, burned: 100000 },
    { date: "2026-05-12", emitted: 490000, burned: 105000 },
    { date: "2026-05-13", emitted: 500000, burned: 108000 },
    { date: "2026-05-14", emitted: 510000, burned: 112000 },
    { date: "2026-05-15", emitted: 520000, burned: 115000 },
    { date: "2026-05-16", emitted: 505000, burned: 110000 },
    { date: "2026-05-17", emitted: 530000, burned: 118000 },
    { date: "2026-05-18", emitted: 540000, burned: 120000 },
  ],
};

export async function fetchTreasuryData(): Promise<TreasuryData> {
  await new Promise((r) => setTimeout(r, 300));
  return { ...treasuryData };
}
