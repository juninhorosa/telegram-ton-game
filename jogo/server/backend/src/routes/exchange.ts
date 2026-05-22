import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../index";

async function getNumberConfig(key: string, fallback: number) {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  const raw = String(row.value ?? "").trim();
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

export async function exchangeRoutes(app: FastifyInstance) {
  app.post("/ve-to-ton", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const { veAmount } = z.object({ veAmount: z.number().positive() }).parse(request.body);

    const rate = await getNumberConfig("ve_to_ton_rate", 0.005);
    if (rate <= 0) return { error: "Invalid exchange rate" };

    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });
    if (player.isBanned) return { error: "Account is banned" };
    if (player.veBalance < veAmount) return { error: "Insufficient VE balance" };

    const tonAmount = veAmount * rate;

    const res = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.player.update({
        where: { id: user.id },
        data: {
          veBalance: { decrement: veAmount },
          tonBalance: { increment: tonAmount },
        },
      });

      await tx.transaction.create({
        data: {
          playerId: user.id,
          type: "exchange",
          amount: veAmount,
          currency: "VE",
          description: `Exchanged ${veAmount} VE → ${tonAmount.toFixed(6)} TON`,
        },
      });

      await tx.transaction.create({
        data: {
          playerId: user.id,
          type: "exchange",
          amount: tonAmount,
          currency: "TON",
          description: `Exchanged ${veAmount} VE → ${tonAmount.toFixed(6)} TON`,
        },
      });

      return { tonAmount: Number(tonAmount.toFixed(6)), veAmount: Number(veAmount.toFixed(4)), rate };
    });

    return res;
  });

  app.post("/ton-to-ve", { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user as { id: string };
    const { tonAmount } = z.object({ tonAmount: z.number().positive() }).parse(request.body);

    const rate = await getNumberConfig("ve_to_ton_rate", 0.005);
    if (rate <= 0) return { error: "Invalid exchange rate" };

    const player = await prisma.player.findUniqueOrThrow({ where: { id: user.id } });
    if (player.isBanned) return { error: "Account is banned" };
    if (player.tonBalance < tonAmount) return { error: "Insufficient TON balance" };

    const veAmount = tonAmount / rate;

    const res = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.player.update({
        where: { id: user.id },
        data: {
          tonBalance: { decrement: tonAmount },
          veBalance: { increment: veAmount },
        },
      });

      await tx.transaction.create({
        data: {
          playerId: user.id,
          type: "exchange",
          amount: tonAmount,
          currency: "TON",
          description: `Exchanged ${tonAmount.toFixed(6)} TON → ${veAmount.toFixed(4)} VE`,
        },
      });

      await tx.transaction.create({
        data: {
          playerId: user.id,
          type: "exchange",
          amount: veAmount,
          currency: "VE",
          description: `Exchanged ${tonAmount.toFixed(6)} TON → ${veAmount.toFixed(4)} VE`,
        },
      });

      return { veAmount: Number(veAmount.toFixed(4)), tonAmount: Number(tonAmount.toFixed(6)), rate };
    });

    return res;
  });
}

