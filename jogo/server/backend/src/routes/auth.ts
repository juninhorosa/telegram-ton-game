import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../index";

const registerSchema = z.object({
  telegramId: z.string(),
  username: z.string().min(3).max(32),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  telegramId: z.string(),
  username: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // Register / Login via Telegram
  app.post("/telegram", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    let player = await prisma.player.findUnique({
      where: { telegramId: body.telegramId },
    });

    if (!player) {
      const referralCode = `CR${Date.now().toString(36).toUpperCase()}`;
      let referredById: string | undefined;

      if (body.referralCode) {
        const referrer = await prisma.player.findUnique({
          where: { referralCode: body.referralCode },
        });
        if (referrer) referredById = referrer.id;
      }

      player = await prisma.player.create({
        data: {
          telegramId: body.telegramId,
          username: body.username,
          referralCode,
          referredById,
          csBalance: 100, // Welcome bonus
        },
      });

      // Give free Common guardian
      await prisma.guardian.create({
        data: {
          playerId: player.id,
          name: "Aether Sprite",
          rarity: "common",
          level: 1,
          farmingPower: 1.0,
          vePerHour: 0.08,
          csPerHour: 12,
        },
      });
    }

    const token = app.jwt.sign({
      id: player.id,
      telegramId: player.telegramId,
      username: player.username,
    });

    return { token, player: { id: player.id, username: player.username } };
  });

  // Connect TON wallet
  app.post("/connect-wallet", { preHandler: [app.authenticate] }, async (request) => {
    const { wallet } = request.body as { wallet: string };
    const user = request.user as { id: string };

    await prisma.player.update({
      where: { id: user.id },
      data: { tonWallet: wallet },
    });

    return { success: true };
  });
}
