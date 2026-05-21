import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../index";

export async function withdrawalRoutes(app: FastifyInstance) {
  // Request withdrawal
  app.post("/", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const { amount } = z.object({ amount: z.number().min(10) }).parse(request.body);

    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });

    if (!player.tonWallet) {
      return { error: "Connect TON wallet first" };
    }

    if (player.veBalance < amount) {
      return { error: "Insufficient VE balance" };
    }

    if (player.isBanned) {
      return { error: "Account is banned" };
    }

    // Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayWithdrawals = await prisma.withdrawal.aggregate({
      where: { playerId: user.id, requestedAt: { gte: todayStart } },
      _sum: { veAmount: true },
    });

    if ((todayWithdrawals._sum.veAmount || 0) + amount > 500) {
      return { error: "Daily withdrawal limit (500 VE) exceeded" };
    }

    const feePercent = 5;
    const netAmount = amount * (1 - feePercent / 100);
    const tonAmount = netAmount * 0.005; // 1 VE = 0.005 TON

    const withdrawal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.player.update({
        where: { id: user.id },
        data: { veBalance: { decrement: amount } },
      });

      return tx.withdrawal.create({
        data: {
          playerId: user.id,
          veAmount: amount,
          tonAmount,
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
