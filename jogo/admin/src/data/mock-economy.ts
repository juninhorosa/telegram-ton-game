import { EconomyConfig } from "./types";

export const economyConfig: EconomyConfig = {
  guardianPrices: [
    { id: "GP1", name: "Aether Sprite", rarity: "common", priceTon: 0.5, priceVe: 100 },
    { id: "GP2", name: "Storm Sentinel", rarity: "rare", priceTon: 2.0, priceVe: 400 },
    { id: "GP3", name: "Void Titan", rarity: "epic", priceTon: 7.5, priceVe: 1500 },
    { id: "GP4", name: "Cosmic Leviathan", rarity: "legendary", priceTon: 25.0, priceVe: 5000 },
  ],
  farmingRates: [
    { rarity: "common", vePerHour: 0.08, csPerHour: 12 },
    { rarity: "rare", vePerHour: 0.30, csPerHour: 45 },
    { rarity: "epic", vePerHour: 1.00, csPerHour: 150 },
    { rarity: "legendary", vePerHour: 3.00, csPerHour: 450 },
  ],
  levelMultipliers: [
    { level: 1, multiplier: 1.0, csCost: 0 },
    { level: 2, multiplier: 1.2, csCost: 100 },
    { level: 3, multiplier: 1.4, csCost: 250 },
    { level: 4, multiplier: 1.6, csCost: 600 },
    { level: 5, multiplier: 1.8, csCost: 1200 },
    { level: 6, multiplier: 2.0, csCost: 2500 },
    { level: 7, multiplier: 2.2, csCost: 5000 },
    { level: 8, multiplier: 2.4, csCost: 10000 },
    { level: 9, multiplier: 2.6, csCost: 20000 },
    { level: 10, multiplier: 2.8, csCost: 40000 },
  ],
  globalLimits: {
    maxGuardiansPerAccount: 12,
    accumulationCapHours: 48,
    minWithdrawalVe: 10,
    dailyWithdrawalLimitVe: 500,
    withdrawalFeePercent: 5,
  },
  referralCommissions: [
    { level: 1, percent: 10 },
    { level: 2, percent: 3 },
    { level: 3, percent: 1 },
  ],
};

export async function fetchEconomyConfig(): Promise<EconomyConfig> {
  await new Promise((r) => setTimeout(r, 300));
  return JSON.parse(JSON.stringify(economyConfig));
}

export async function updateEconomyConfig(config: Partial<EconomyConfig>): Promise<{ success: boolean }> {
  await new Promise((r) => setTimeout(r, 500));
  Object.assign(economyConfig, config);
  return { success: true };
}
