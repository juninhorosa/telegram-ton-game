import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../index";

export async function depositRoutes(app: FastifyInstance) {
  app.post("/request", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const { tonAmount, txHash } = z.object({
      tonAmount: z.number().positive(),
      txHash: z.string().min(8).max(128),
    }).parse(request.body);

    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });
    if (!player.tonWallet) return { error: "Connect TON wallet first" };
    if (player.isBanned) return { error: "Account is banned" };

    try {
      const deposit = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.deposit.create({
          data: {
            playerId: user.id,
            tonAmount,
            txHash,
            status: "pending",
          },
        });

        await tx.transaction.create({
          data: {
            playerId: user.id,
            type: "deposit_request",
            amount: tonAmount,
            currency: "TON",
            description: `Deposit request: ${txHash}`,
          },
        });

        return created;
      });

      return deposit;
    } catch {
      return { error: "Deposit request failed" };
    }
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    return prisma.deposit.findMany({
      where: { playerId: user.id },
      orderBy: { requestedAt: "desc" },
      take: 50,
    });
  });
}

