import { FastifyInstance } from "fastify";
import { prisma } from "../index";
import { z } from "zod";
import { addSeconds } from "date-fns";
import type { Prisma } from "@prisma/client";

async function getNumberConfig(key: string, fallback: number) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  const raw = String(row.value ?? "").trim();
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function computeLevelFromXp(xp: number) {
  const xpPerLevel = 1000;
  return Math.floor(Math.max(0, xp) / xpPerLevel) + 1;
}

export async function farmingRoutes(app: FastifyInstance) {
  // Collect farming resources
  app.post("/collect", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };

    const player = await prisma.player.findUniqueOrThrow({
      where: { id: user.id },
      include: { guardians: { where: { isActive: true } } },
    });

    const now = new Date();
    const lastCollect = player.lastCollectAt || player.createdAt;
    const hoursSinceLastCollect = Math.min(
      (now.getTime() - lastCollect.getTime()) / (1000 * 60 * 60),
      48 // cap at 48h
    );

    if (hoursSinceLastCollect < 0.25) {
      return { error: "Too soon to collect (min 15 minutes)" };
    }

    const totalVEPerHour = player.guardians.reduce((sum: number, g: { vePerHour: number }) => sum + g.vePerHour, 0);
    const totalCSPerHour = player.guardians.reduce((sum: number, g: { csPerHour: number }) => sum + g.csPerHour, 0);

    const earnedVE = totalVEPerHour * hoursSinceLastCollect;
    const earnedCS = Math.round(totalCSPerHour * hoursSinceLastCollect);

    const xpEarned = Math.floor(earnedVE * 10) + Math.floor(earnedCS / 10);

    await prisma.player.update({
      where: { id: user.id },
      data: {
        veBalance: { increment: earnedVE },
        csBalance: { increment: earnedCS },
        xp: { increment: xpEarned },
        pendingVE: 0,
        pendingCS: 0,
        lastCollectAt: now,
        level: computeLevelFromXp(player.xp + xpEarned),
      },
    });

    return {
      earnedVE: parseFloat(earnedVE.toFixed(4)),
      earnedCS,
      xpEarned,
      hoursSinceLastCollect: parseFloat(hoursSinceLastCollect.toFixed(2)),
      totalVEPerHour,
      totalCSPerHour,
    };
  });

  // Get farming status
  app.get("/status", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };

    const player = await prisma.player.findUniqueOrThrow({
      where: { id: user.id },
      include: { guardians: { where: { isActive: true } } },
    });

    const now = new Date();
    const lastCollect = player.lastCollectAt || player.createdAt;
    const hoursSinceLastCollect = Math.min(
      (now.getTime() - lastCollect.getTime()) / (1000 * 60 * 60),
      48
    );

    const totalVEPerHour = player.guardians.reduce((sum: number, g: { vePerHour: number }) => sum + g.vePerHour, 0);
    const totalCSPerHour = player.guardians.reduce((sum: number, g: { csPerHour: number }) => sum + g.csPerHour, 0);

    return {
      pendingVE: parseFloat((totalVEPerHour * hoursSinceLastCollect).toFixed(4)),
      pendingCS: Math.round(totalCSPerHour * hoursSinceLastCollect),
      hoursSinceLastCollect: parseFloat(hoursSinceLastCollect.toFixed(2)),
      totalVEPerHour,
      totalCSPerHour,
      guardianCount: player.guardians.length,
      capHours: 48,
    };
  });

  app.post("/ads/reward", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    z.object({ placement: z.string().optional() }).parse(request.body ?? {});

    const rewardVE = await getNumberConfig("ad_reward_ve", 5);
    const cooldownSecondsCfg = await getNumberConfig("ad_reward_cooldown_seconds", -1);
    const cooldownSeconds =
      cooldownSecondsCfg > 0 ? cooldownSecondsCfg : Math.max(1, await getNumberConfig("ad_reward_cooldown_hours", 24)) * 60 * 60;

    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });
    if (player.isBanned) return { error: "Account is banned" };

    const now = new Date();
    if (player.lastAdRewardAt) {
      const nextAt = addSeconds(player.lastAdRewardAt, cooldownSeconds);
      if (nextAt.getTime() > now.getTime()) {
        const remainingSeconds = Math.ceil((nextAt.getTime() - now.getTime()) / 1000);
        return { error: `Next ad reward available on ${nextAt.toISOString()}`, nextAt: nextAt.toISOString(), remainingSeconds };
      }
    }

    const xpEarned = Math.floor(rewardVE * 10);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.player.update({
        where: { id: user.id },
        data: {
          veBalance: { increment: rewardVE },
          xp: { increment: xpEarned },
          lastAdRewardAt: now,
          level: computeLevelFromXp(player.xp + xpEarned),
        },
      });

      await tx.transaction.create({
        data: {
          playerId: user.id,
          type: "ad_reward",
          amount: rewardVE,
          currency: "VE",
          description: "Ad reward",
        },
      });
    });

    return { rewardVE, xpEarned, cooldownSeconds };
  });
}
