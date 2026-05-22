import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { addHours } from "date-fns";
import { prisma } from "../index";

const GUARDIAN_PRICES: Record<string, { ton: number; ve: number }> = {
  common: { ton: 0.5, ve: 100 },
  rare: { ton: 2.0, ve: 400 },
  epic: { ton: 7.5, ve: 1500 },
  legendary: { ton: 25.0, ve: 5000 },
};

const GUARDIAN_BASE: Record<string, { power: number; cs: number }> = {
  common: { power: 1.0, cs: 12 },
  rare: { power: 2.5, cs: 45 },
  epic: { power: 6.0, cs: 150 },
  legendary: { power: 15.0, cs: 450 },
};

const GUARDIAN_NAMES: Record<string, string[]> = {
  common: ["Aether Sprite", "Void Wisp", "Crystal Pup"],
  rare: ["Storm Sentinel", "Shadow Fox", "Frost Warden"],
  epic: ["Void Titan", "Cosmic Phoenix", "Dark Seraph"],
  legendary: ["Cosmic Leviathan", "Quantum Dragon", "Infinity Golem"],
};

const LEVEL_COSTS = [0, 100, 250, 600, 1200, 2500, 5000, 10000, 20000, 40000];

const GUARDIAN_ROI_DAYS_BY_TON_PRICE: Record<string, number> = {
  common: 60,
  rare: 50,
  epic: 45,
  legendary: 30,
};

async function getNumberConfig(key: string, fallback: number) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  const raw = String(row.value ?? "").trim();
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function computeVePerHourFromTonRoi(tonPrice: number, roiDays: number, veToTonRate: number) {
  const tonPerDay = tonPrice / roiDays;
  const vePerDay = tonPerDay / veToTonRate;
  return vePerDay / 24;
}

export async function guardianRoutes(app: FastifyInstance) {
  // Get player's guardians
  app.get("/", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    return prisma.guardian.findMany({
      where: { playerId: user.id, isActive: true },
      orderBy: { acquiredAt: "desc" },
    });
  });

  // Buy guardian
  app.post("/buy", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const { rarity, payWith } = z.object({
      rarity: z.enum(["common", "rare", "epic", "legendary"]),
      payWith: z.enum(["ton", "ve"]),
    }).parse(request.body);

    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });
    const guardianCount = await prisma.guardian.count({ where: { playerId: user.id, isActive: true } });

    if (guardianCount >= 12) {
      return { error: "Maximum guardians reached (12)" };
    }

    if (payWith === "ton") {
      return { error: "Buying with TON is not available yet. Use VE." };
    }

    const price = GUARDIAN_PRICES[rarity];
    const cost = price.ve;

    if (player.veBalance < cost) {
      return { error: "Insufficient VE balance" };
    }

    const base = GUARDIAN_BASE[rarity];
    const veToTonRate = await getNumberConfig("ve_to_ton_rate", 0.005);
    const roiDays = GUARDIAN_ROI_DAYS_BY_TON_PRICE[rarity];
    const baseVePerHour = computeVePerHourFromTonRoi(GUARDIAN_PRICES[rarity].ton, roiDays, veToTonRate);
    const names = GUARDIAN_NAMES[rarity];
    const name = names[Math.floor(Math.random() * names.length)];

    const guardian = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (payWith === "ve") {
        await tx.player.update({
          where: { id: user.id },
          data: { veBalance: { decrement: cost } },
        });
      }

      return tx.guardian.create({
        data: {
          playerId: user.id,
          name,
          rarity,
          level: 1,
          farmingPower: base.power,
          vePerHour: baseVePerHour,
          csPerHour: base.cs,
        },
      });
    });

    await prisma.transaction.create({
      data: {
        playerId: user.id,
        type: "purchase",
        amount: cost,
        currency: "VE",
        description: `Purchased ${name} (${rarity})`,
      },
    });

    return guardian;
  });

  // Upgrade guardian
  app.post("/:id/upgrade", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const { id } = request.params as { id: string };

    const guardian = await prisma.guardian.findFirstOrThrow({
      where: { id, playerId: user.id },
    });

    if (guardian.rarity === "bot") {
      return { error: "Bot Farm cannot be upgraded" };
    }

    if (guardian.level >= 10) {
      return { error: "Max level reached" };
    }

    const cost = LEVEL_COSTS[guardian.level];
    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });

    if (player.csBalance < cost) {
      return { error: "Insufficient CS balance" };
    }

    const newLevel = guardian.level + 1;
    const multiplier = 1 + (newLevel - 1) * 0.20;

    const base = GUARDIAN_BASE[guardian.rarity];
    if (!base) {
      return { error: "Unsupported guardian type" };
    }
    const veToTonRate = await getNumberConfig("ve_to_ton_rate", 0.005);
    const roiDays = GUARDIAN_ROI_DAYS_BY_TON_PRICE[guardian.rarity] || 60;
    const baseVePerHour = computeVePerHourFromTonRoi(GUARDIAN_PRICES[guardian.rarity]?.ton || 0.5, roiDays, veToTonRate);
    const updatedGuardian = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.player.update({
        where: { id: user.id },
        data: { csBalance: { decrement: cost } },
      });

      return tx.guardian.update({
        where: { id },
        data: {
          level: newLevel,
          farmingPower: base.power * multiplier,
          vePerHour: baseVePerHour * multiplier,
          csPerHour: Math.round(base.cs * multiplier),
        },
      });
    });

    await prisma.transaction.create({
      data: {
        playerId: user.id,
        type: "upgrade",
        amount: cost,
        currency: "CS",
        description: `Upgraded ${guardian.name} to Level ${newLevel}`,
      },
    });

    return updatedGuardian;
  });

  // Fuse guardians
  app.post("/fuse", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const { rarity } = z.object({
      rarity: z.enum(["common", "rare", "epic", "legendary"]),
    }).parse(request.body);

    const guardians = await prisma.guardian.findMany({
      where: { playerId: user.id, rarity, isActive: true },
    });

    if (guardians.length < 3) {
      return { error: "Need 3 guardians of same rarity to fuse" };
    }

    const toFuse = guardians.slice(0, 3);
    const rarityOrder = ["common", "rare", "epic", "legendary"];
    const nextRarityIndex = rarityOrder.indexOf(rarity) + 1;

    if (nextRarityIndex >= rarityOrder.length) {
      return { error: "Cannot fuse legendary guardians" };
    }

    const nextRarity = rarityOrder[nextRarityIndex];
    const base = GUARDIAN_BASE[nextRarity];
    const veToTonRate = await getNumberConfig("ve_to_ton_rate", 0.005);
    const roiDays = GUARDIAN_ROI_DAYS_BY_TON_PRICE[nextRarity] || 60;
    const baseVePerHour = computeVePerHourFromTonRoi(GUARDIAN_PRICES[nextRarity]?.ton || 0.5, roiDays, veToTonRate);
    const names = GUARDIAN_NAMES[nextRarity];
    const name = names[Math.floor(Math.random() * names.length)];

    const newGuardian = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const g of toFuse) {
        await tx.guardian.update({
          where: { id: g.id },
          data: { isActive: false },
        });
      }

      return tx.guardian.create({
        data: {
          playerId: user.id,
          name,
          rarity: nextRarity,
          level: 1,
          farmingPower: base.power,
          vePerHour: baseVePerHour,
          csPerHour: base.cs,
        },
      });
    });

    await prisma.transaction.create({
      data: {
        playerId: user.id,
        type: "fusion",
        amount: 0,
        currency: "VE",
        description: `Fused 3x ${rarity} → 1x ${nextRarity} (${name})`,
      },
    });

    return newGuardian;
  });

  app.post("/bot-farm/buy", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    z.object({}).parse(request.body ?? {});

    const player = await prisma.player.findUniqueOrThrow({
      where: { id: user.id },
      include: { guardians: { where: { isActive: true } } },
    });

    if (player.isBanned) return { error: "Account is banned" };

    const cooldownHours = await getNumberConfig("bot_farm_purchase_cooldown_hours", 24);
    const priceVe = await getNumberConfig("bot_farm_price_ve", 50);
    const roiDays = await getNumberConfig("bot_farm_roi_days", 100);

    const now = new Date();
    if (player.lastBotFarmPurchaseAt) {
      const nextAt = addHours(player.lastBotFarmPurchaseAt, cooldownHours);
      if (nextAt.getTime() > now.getTime()) {
        return { error: `Bot Farm available again on ${nextAt.toISOString()}` };
      }
    }

    if (player.veBalance < priceVe) return { error: "Insufficient VE balance" };

    const vePerHour = (priceVe / roiDays) / 24;

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.player.update({
        where: { id: user.id },
        data: { veBalance: { decrement: priceVe }, lastBotFarmPurchaseAt: now },
      });

      const guardian = await tx.guardian.create({
        data: {
          playerId: user.id,
          name: "Alpha",
          rarity: "bot",
          level: 1,
          farmingPower: 1,
          vePerHour,
          csPerHour: 0,
        },
      });

      await tx.transaction.create({
        data: {
          playerId: user.id,
          type: "purchase",
          amount: priceVe,
          currency: "VE",
          description: "Purchased Bot Farm (Alpha)",
        },
      });

      return guardian;
    });

    return created;
  });
}
