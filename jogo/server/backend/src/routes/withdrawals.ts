import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { addDays, differenceInCalendarDays } from "date-fns";
import { prisma } from "../index";

async function getNumberConfig(key: string, fallback: number) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  const raw = String(row.value ?? "").trim();
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

export async function withdrawalRoutes(app: FastifyInstance) {
  // Request withdrawal
  app.post("/", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const body = request.body as any;
    const parsed = z
      .object({
        veAmount: z.number().positive().optional(),
        tonAmount: z.number().positive().optional(),
      })
      .refine((v) => Boolean(v.veAmount) || Boolean(v.tonAmount), { message: "Missing amount" })
      .parse(body);

    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });

    if (!player.tonWallet) {
      return { error: "Connect TON wallet first" };
    }

    if (player.isBanned) {
      return { error: "Account is banned" };
    }

    const veToTonRate = await getNumberConfig("ve_to_ton_rate", 0.005);
    const feePercent = await getNumberConfig("withdraw_fee_percent", 5);
    const withdrawCooldownDays = await getNumberConfig("withdraw_cooldown_days", 15);
    const freeWithdrawWaitDays = await getNumberConfig("free_withdraw_wait_days", 15);

    const lastWithdrawal = await prisma.withdrawal.findFirst({
      where: { playerId: user.id, status: { in: ["pending", "approved", "processing", "completed"] } },
      orderBy: { requestedAt: "desc" },
      select: { requestedAt: true },
    });

    const now = new Date();
    if (lastWithdrawal) {
      const cooldownUntil = addDays(lastWithdrawal.requestedAt, withdrawCooldownDays);
      if (cooldownUntil.getTime() > now.getTime()) {
        return { error: `Withdrawal cooldown active until ${cooldownUntil.toISOString()}` };
      }
    }

    const hasDeposit = player.tonDepositedTotal > 0;
    if (!hasDeposit) {
      const daysSinceStart = differenceInCalendarDays(now, player.createdAt);
      if (daysSinceStart < freeWithdrawWaitDays) {
        return { error: `Free users can withdraw after ${freeWithdrawWaitDays} days from start` };
      }
    }

    const requestedTon = parsed.tonAmount ?? null;
    const requestedVe = parsed.veAmount ?? null;

    if (requestedTon) {
      if (player.tonBalance < requestedTon) return { error: "Insufficient TON balance" };
      const netTon = requestedTon * (1 - feePercent / 100);
      const veEquivalent = requestedTon / veToTonRate;

      const withdrawal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.player.update({
          where: { id: user.id },
          data: { tonBalance: { decrement: requestedTon } },
        });

        return tx.withdrawal.create({
          data: {
            playerId: user.id,
            veAmount: Number(veEquivalent.toFixed(4)),
            tonAmount: Number(netTon.toFixed(6)),
            tonWallet: player.tonWallet!,
            riskScore: player.riskScore,
          },
        });
      });

      return withdrawal;
    }

    const veAmount = Number(requestedVe || 0);
    if (veAmount < 10) return { error: "Minimum withdrawal: 10 VE" };
    if (player.veBalance < veAmount) return { error: "Insufficient VE balance" };
    const netVe = veAmount * (1 - feePercent / 100);
    const tonAmount = netVe * veToTonRate;

    const withdrawal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.player.update({
        where: { id: user.id },
        data: { veBalance: { decrement: veAmount } },
      });

      return tx.withdrawal.create({
        data: {
          playerId: user.id,
          veAmount: veAmount,
          tonAmount: Number(tonAmount.toFixed(6)),
          tonWallet: player.tonWallet!,
          riskScore: player.riskScore,
        },
      });
    });

    return withdrawal;
  });

  // Get player's withdrawals
  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    return prisma.withdrawal.findMany({
      where: { playerId: user.id },
      orderBy: { requestedAt: "desc" },
      take: 20,
    });
  });
}
